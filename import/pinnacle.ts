import axios from "axios";
import fs from "fs";
import path from "path";
import { findMarket } from "../markets";
import { findStat } from "../props";
import { PINNACLE_KEY } from "../secrets";
import {
  Book,
  League,
  Market,
  Moneyline,
  Period,
  Prop,
  PropsStat,
  SourcedOdds,
  Spread
} from "../frontend/src/types";
import { GameTotal, LineChoice, TeamTotal } from "../frontend/src/types/lines";
import { Game } from "../database/game";
import { TeamManager } from "../database/mongo.team";
import { Player, PlayerManager } from "../database/mongo.player";
import { GameManager, Game as MongoGame } from "../database/mongo.game";
import { PlayerPropManager } from "../database/mongo.player-prop";
import { PriceManager } from "../database/mongo.price";
import { GameLineManager, HomeOrAway } from "../database/mongo.game-line";
import { getConnection } from "../database/mongo.connection";
import groupBy from "lodash/groupBy";

const leagueIDs = new Map([
  [League.NCAAF, 880],
  [League.NFL, 889],
  [League.MLB, 246],
  [League.WNBA, 578],
  [League.NHL, 1456],
  [League.NBA, 487],
  [League.UFC, 22],
  [League.SOCCER, 29],
  [League.NCAAB, 493],
  [League.TENNIS, 33]
]);

const saveEventToDatabase = async (matchup: any, league: League) => {
  const gameManager = new GameManager();
  const teamManager = new TeamManager();

  const participants = matchup.participants.map((p: any) => {
    let name: string = p.name.split("(Games)")[0].trim();
    if (league === League.NBA) {
      name = name.split(" ").slice(1).join(" ").trim();
    }
    return {
      ...p,
      name
    };
  });

  const homeTeamName = participants.find((x: any) => x.alignment === "home").name;
  const awayTeamName = participants.find((x: any) => x.alignment === "away").name;
  let homeTeam;
  try {
    homeTeam = await teamManager.findByName(homeTeamName, league);
  } catch {
    homeTeam = await teamManager.add({
      name: homeTeamName,
      league,
      abbreviation: ["-"]
    });
  }
  let awayTeam;
  try {
    awayTeam = await teamManager.findByName(awayTeamName, league);
  } catch {
    awayTeam = await teamManager.add({
      name: awayTeamName,
      league,
      abbreviation: ["-"]
    });
  }
  const gameTime = new Date(matchup.startTime);

  const game = await gameManager.upsert(homeTeam, awayTeam, gameTime, league);
  return { homeTeam, awayTeam, gameTime, game };
};

const requestLines = async (league: League) => {
  const leagueID = leagueIDs.get(league);
  if (!leagueID) {
    throw new Error(`Unknown Pinnacle league ${league}`);
  }
  let directory = league === League.TENNIS ? "sports" : "leagues";

  const linesUrl = `0.1/${directory}/${leagueID}/markets/straight`;
  const matchupUrl = `0.1/${directory}/${leagueID}/matchups?withSpecials=false`;

  const datastorePath = path.join(__dirname, "../backups/pinnacle");
  const linesFilename = `${datastorePath}/${league}_lines.json`;
  const matchupsFilename = `${datastorePath}/${league}_matchups.json`;

  try {
    const linesData = await axios.get("https://guest.api.arcadia.pinnacle.com/" + linesUrl, {
      headers: {
        "x-api-key": PINNACLE_KEY
      }
    });
    fs.writeFileSync(linesFilename, JSON.stringify(linesData.data, null, 4));
  } catch (error) {
    console.error(error);
    console.log("Couldn't request new lines. Using saved lines");
  }

  try {
    const matchupData = await axios.get("https://guest.api.arcadia.pinnacle.com/" + matchupUrl, {
      headers: {
        "x-api-key": PINNACLE_KEY
      }
    });
    fs.writeFileSync(matchupsFilename, JSON.stringify(matchupData.data, null, 4));
  } catch {
    console.log("Couldn't request new matchups. Using saved matchups");
  }

  fs.mkdirSync(datastorePath, { recursive: true });
  const lines: any[] = JSON.parse(fs.readFileSync(linesFilename).toString());
  const matchups = JSON.parse(fs.readFileSync(matchupsFilename).toString());
  const filteredMatchups = matchups
    .filter((matchup: any) => matchup.type === "matchup")
    .filter((matchup: any) => {
      if (league === League.TENNIS) {
        // ignore tennis sets
        return matchup.units !== "Sets";
      }
      if ([League.MLB, League.NBA, League.WNBA].includes(league)) {
        return matchup.units === "Regular";
      }
      return !matchup.parentId;
    });

  return { lines, matchups: filteredMatchups };
};

interface Event {
  game: Game;
  mongoGame: MongoGame;
  id: number;
  moneylines: Moneyline[];
  spreads: Spread[];
  gameTotals: GameTotal[];
  teamTotals: TeamTotal[];
}

const getPinnacleEvents = async (matchups: any, league: League) => {
  let events = new Map<number, Event>();
  const filteredMatchups = matchups
    .filter((matchup: any) => matchup.type === "matchup")
    .filter((matchup: any) => {
      if (league === League.TENNIS) {
        // ignore tennis sets
        return matchup.units !== "Sets";
      }
      if ([League.MLB, League.NBA, League.WNBA].includes(league)) {
        return matchup.units === "Regular";
      }
      return !matchup.parentId;
    });
  for (let i = 0; i < filteredMatchups.length; i++) {
    const matchup: any = filteredMatchups[i];
    let storedEvent = events.get(matchup.id);

    if (!storedEvent) {
      const {
        homeTeam,
        awayTeam,
        gameTime,
        game: mongoGame
      } = await saveEventToDatabase(matchup, league);

      const game = new Game({
        homeTeam,
        awayTeam,
        gameTime,
        league
      });

      storedEvent = {
        game,
        mongoGame,
        id: matchup.id,
        moneylines: [],
        spreads: [],
        gameTotals: [],
        teamTotals: []
      };
    }

    events.set(matchup.id, storedEvent);
  }
  return events;
};

export const getPinnacle = async (league: League): Promise<void> => {
  await getConnection();
  const { lines, matchups } = await requestLines(league);
  const gameLineManager = new GameLineManager();
  const priceManager = new PriceManager();

  await priceManager.deleteGamePricesForLeagueOnBook(league, Book.PINNACLE);

  const events = await getPinnacleEvents(matchups, league);

  const odds: SourcedOdds = {
    moneylines: [],
    spreads: [],
    gameTotals: [],
    teamTotals: []
  };

  const getPeriod = (id: number) => {
    if (id === 0) {
      return Period.FULL_GAME;
    }
    if (id === 3) {
      return Period.FIRST_QUARTER;
    }
    if (id === 1) {
      if (league === League.NHL) {
        return Period.FIRST_PERIOD;
      }
      return Period.FIRST_HALF;
    }
  };

  const groupedByMatchup = groupBy(lines, "matchupId");

  for (const groupOfLines of Object.values(groupedByMatchup)) {
    const correspondingMatchup = events.get(groupOfLines[0].matchupId);
    if (!correspondingMatchup) {
      continue;
    }
    const mongoGame = correspondingMatchup.mongoGame;
    console.log(
      `Recording ${correspondingMatchup.game.awayTeam.abbreviation}@${correspondingMatchup.game.homeTeam.abbreviation}`
    );
    await Promise.allSettled(
      groupOfLines.map((line) => {
        return (async () => {
          const period = getPeriod(line.period);
          if (!period) {
            throw new Error("Unknown Period");
          }
          const market = findMarket(line.type);
          if (market === Market.GAME_TOTAL) {
            const over = line.prices.find((p: any) => p.designation === "over");
            const under = line.prices.find((p: any) => p.designation === "under");
            const overPrice = over.price;
            const overLine = over.points;
            const underPrice = under.price;
            const underLine = under.points;

            const mongoLine = await gameLineManager.upsertGameTotal(mongoGame, period, {
              value: overLine
            });

            await priceManager.upsertGameLinePrice(mongoLine, Book.PINNACLE, {
              overPrice,
              underPrice
            });

            const standard = {
              game: correspondingMatchup.game,
              period,
              book: Book.PINNACLE
            };

            const overTotal = new GameTotal({
              ...standard,
              price: overPrice,
              otherOutcomePrice: underPrice,
              value: overLine,
              choice: LineChoice.OVER
            });
            const underTotal = new GameTotal({
              ...standard,
              price: underPrice,
              otherOutcomePrice: overPrice,
              value: underLine,
              choice: LineChoice.UNDER
            });

            odds.gameTotals.push(overTotal, underTotal);
          }
          if (market === Market.TEAM_TOTAL) {
            const over = line.prices.find((p: any) => p.designation === "over");
            const under = line.prices.find((p: any) => p.designation === "under");
            const overPrice = over.price;
            const overLine = over.points;
            const underPrice = under.price;
            const underLine = under.points;

            const mongoLine = await gameLineManager.upsertTeamTotal(mongoGame, period, {
              value: overLine,
              side: line.side
            });
            await priceManager.upsertGameLinePrice(mongoLine, Book.PINNACLE, {
              overPrice,
              underPrice
            });

            const standard = {
              game: correspondingMatchup.game,
              period,
              book: Book.PINNACLE,
              side: line.side
            };
            const overTotal = new TeamTotal({
              ...standard,
              price: overPrice,
              otherOutcomePrice: underPrice,
              value: overLine,
              choice: LineChoice.OVER
            });
            const underTotal = new TeamTotal({
              ...standard,
              price: underPrice,
              otherOutcomePrice: overPrice,
              value: underLine,
              choice: LineChoice.UNDER
            });
            odds.teamTotals.push(overTotal, underTotal);
          }
          if (
            market === Market.MONEYLINE &&
            // pinnacle only offers 3-way lines which mess with this
            !(league === League.MLB && period === Period.FIRST_QUARTER)
          ) {
            const home = line.prices.find((p: any) => p.designation === "home");
            const away = line.prices.find((p: any) => p.designation === "away");
            const homePrice = home.price;
            const awayPrice = away.price;

            const mongoLine = await gameLineManager.upsertMoneyline(mongoGame, period);

            await priceManager.upsertGameLinePrice(mongoLine, Book.PINNACLE, {
              overPrice: homePrice,
              underPrice: awayPrice
            });

            const standard = {
              game: correspondingMatchup.game,
              period,
              book: Book.PINNACLE
            };
            const homeMoneyline = new Moneyline({
              ...standard,
              choice: LineChoice.HOME,
              price: homePrice,
              otherOutcomePrice: awayPrice
            });
            const awayMoneyline = new Moneyline({
              ...standard,
              choice: LineChoice.AWAY,
              price: awayPrice,
              otherOutcomePrice: homePrice
            });
            odds.moneylines.push(homeMoneyline, awayMoneyline);
          }
          if (market === Market.SPREAD) {
            const home = line.prices.find((p: any) => p.designation === "home");
            const away = line.prices.find((p: any) => p.designation === "away");
            const homePrice = home.price;
            const homeLine = home.points;
            const awayPrice = away.price;
            const awayLine = away.points;

            const mongoHomeLine = await gameLineManager.upsertSpread(mongoGame, period, {
              side: HomeOrAway.HOME,
              value: homeLine
            });
            const mongoAwayLine = await gameLineManager.upsertSpread(mongoGame, period, {
              side: HomeOrAway.AWAY,
              value: awayLine
            });

            await priceManager.upsertGameLinePrice(mongoHomeLine, Book.PINNACLE, {
              overPrice: homePrice,
              underPrice: awayPrice
            });

            await priceManager.upsertGameLinePrice(mongoAwayLine, Book.PINNACLE, {
              overPrice: awayPrice,
              underPrice: homePrice
            });

            if (homeLine === undefined) {
              console.log(line, correspondingMatchup.game);
            }
            const standard = {
              period,
              book: Book.PINNACLE,
              game: correspondingMatchup.game
            };
            const homeSpread = new Spread({
              ...standard,
              choice: LineChoice.HOME,
              value: homeLine,
              price: homePrice,
              otherOutcomePrice: awayPrice
            });
            const awaySpread = new Spread({
              ...standard,
              choice: LineChoice.AWAY,
              value: awayLine,
              price: awayPrice,
              otherOutcomePrice: homePrice
            });
            odds.spreads.push(homeSpread, awaySpread);
          }
        })();
      })
    );
  }
};

export const getPinnacleProps = async (league: League): Promise<Prop[]> => {
  const { lines, matchups } = await requestLines(league);
  const playerPropManager = new PlayerPropManager();
  const priceManager = new PriceManager();
  const playerManager = new PlayerManager();

  const props: Prop[] = [];
  matchupLoop: for (const matchup of matchups) {
    try {
      const { data: pinnacleProps } = await axios.get(
        `https://guest.api.arcadia.pinnacle.com/0.1/matchups/${matchup.id}/related`,
        {
          headers: {
            "x-api-key": PINNACLE_KEY
          }
        }
      );
      const { game } = await saveEventToDatabase(matchup, league);
      propLoop: for (const prop of pinnacleProps) {
        if (prop.type !== "special" || prop.special.category !== "Player Props") {
          continue propLoop;
        }
        const propName = prop.special.description;
        const playerName = propName.split("(")[0].trim();
        let stat = findStat(prop.units);
        if (league === League.NHL) {
          if (stat === PropsStat.POINTS) {
            stat = PropsStat.HOCKEY_POINTS;
          }
          if (stat === PropsStat.ASSISTS) {
            stat = PropsStat.HOCKEY_ASSISTS;
          }
        }

        if (!stat) {
          continue propLoop;
        }
        const line = lines.find((l: any) => l.matchupId === prop.id);
        if (!line) {
          continue propLoop;
        }
        const value = line.prices[0].points;

        const overId = prop.participants.find((participant: any) => participant.name === "Over").id;
        const underId = prop.participants.find(
          (participant: any) => participant.name === "Under"
        ).id;

        const overPrice = line.prices.find((price: any) => price.participantId === overId)?.price;

        const underPrice = line.prices.find((price: any) => price.participantId === underId)?.price;
        if (!overPrice || !underPrice) {
          continue propLoop;
        }

        try {
          let mongoPlayer: Player;
          try {
            mongoPlayer = await playerManager.findByName(playerName, league);
          } catch {
            console.log("Could not find player");
            throw "Could not find player";
          }
          const playerProp = await playerPropManager.upsert(mongoPlayer, game, league, stat, value);
          await priceManager.upsertPlayerPropPrice(playerProp, Book.PINNACLE as Book, {
            overPrice,
            underPrice
          });
        } catch (error) {
          console.error(`Could not add prop for ${playerName}`);
          continue;
        }
      }
    } catch (e) {
      console.log("Nothing for that");
    }
  }
  return props;
};

// requestLines(League.NFL);
