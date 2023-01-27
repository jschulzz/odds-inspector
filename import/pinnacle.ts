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
  SourcedOdds,
  Spread,
} from "../types";
import { GameTotal, LineChoice, TeamTotal } from "../types/lines";

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
  [League.TENNIS, 33],
]);

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
    const linesData = await axios.get(
      "https://guest.api.arcadia.pinnacle.com/" + linesUrl,
      {
        headers: {
          "x-api-key": PINNACLE_KEY,
        },
      }
    );
    fs.writeFileSync(linesFilename, JSON.stringify(linesData.data, null, 4));
  } catch (error) {
    console.error(error);
    console.log("Couldn't request new lines. Using saved lines");
  }

  try {
    const matchupData = await axios.get(
      "https://guest.api.arcadia.pinnacle.com/" + matchupUrl,
      {
        headers: {
          "x-api-key": PINNACLE_KEY,
        },
      }
    );
    fs.writeFileSync(
      matchupsFilename,
      JSON.stringify(matchupData.data, null, 4)
    );
  } catch {
    console.log("Couldn't request new matchups. Using saved matchups");
  }

  fs.mkdirSync(datastorePath, { recursive: true });
  const lines = JSON.parse(fs.readFileSync(linesFilename).toString());
  const matchups = JSON.parse(fs.readFileSync(matchupsFilename).toString());

  return { lines, matchups };
};

interface Event {
  homeTeam: string;
  awayTeam: string;
  time: Date;
  id: number;
  moneylines: Moneyline[];
  spreads: Spread[];
  gameTotals: GameTotal[];
  teamTotals: TeamTotal[];
}

const getPinnacleEvents = (matchups: any, league: League) => {
  let events = new Map<number, Event>();
  matchups
    .filter((matchup: any) => matchup.type === "matchup")
    .filter((matchup: any) => {
      if (league === League.TENNIS) {
        // ignore tennis sets
        return matchup.units !== "Sets";
      }
      return !matchup.parentId;
    })
    .forEach((matchup: any) => {
      let storedEvent = events.get(matchup.id);

      if (!storedEvent) {
        const participants = matchup.participants.map((p: any) => {
          let name: string = p.name.split("(Games)")[0].trim();
          if (league === League.NBA) {
            name = name.split(" ").slice(1).join(" ").trim();
          }
          return {
            ...p,
            name,
          };
        });

        storedEvent = {
          homeTeam: participants.find((x: any) => x.alignment === "home").name,
          awayTeam: participants.find((x: any) => x.alignment === "away").name,
          time: new Date(matchup.startTime),
          id: matchup.id,
          moneylines: [],
          spreads: [],
          gameTotals: [],
          teamTotals: [],
        };
      }

      events.set(matchup.id, storedEvent);
    });
  return events;
};

export const getPinnacle = async (league: League): Promise<SourcedOdds> => {
  const { lines, matchups } = await requestLines(league);

  const events = getPinnacleEvents(matchups, league);

  const odds: SourcedOdds = {
    moneylines: [],
    spreads: [],
    gameTotals: [],
    teamTotals: [],
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

  lines.forEach((line: any) => {
    const correspondingMatchup = events.get(line.matchupId);
    if (!correspondingMatchup) {
      return undefined;
    }
    const period = getPeriod(line.period);
    if (!period) {
      return;
    }
    const homeTeam = correspondingMatchup.homeTeam;
    const awayTeam = correspondingMatchup.awayTeam;
    const market = findMarket(line.type);
    if (market === Market.GAME_TOTAL) {
      const over = line.prices.find((p: any) => p.designation === "over");
      const under = line.prices.find((p: any) => p.designation === "under");
      const overPrice = over.price;
      const overLine = over.points;
      const underPrice = under.price;
      const underLine = under.points;

      const standard = {
        homeTeam,
        awayTeam,
        period,
        book: Book.PINNACLE,
        gameTime: correspondingMatchup.time,
      };

      const overTotal = new GameTotal({
        ...standard,
        price: overPrice,
        otherOutcomePrice: underPrice,
        value: overLine,
        choice: LineChoice.OVER,
      });
      const underTotal = new GameTotal({
        ...standard,
        price: underPrice,
        otherOutcomePrice: overPrice,
        value: underLine,
        choice: LineChoice.UNDER,
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

      const standard = {
        homeTeam,
        awayTeam,
        period,
        book: Book.PINNACLE,
        side: line.side,
        gameTime: correspondingMatchup.time,
      };
      const overTotal = new TeamTotal({
        ...standard,
        price: overPrice,
        otherOutcomePrice: underPrice,
        value: overLine,
        choice: LineChoice.OVER,
      });
      const underTotal = new TeamTotal({
        ...standard,
        price: underPrice,
        otherOutcomePrice: overPrice,
        value: underLine,
        choice: LineChoice.UNDER,
      });
      odds.teamTotals.push(overTotal, underTotal);
    }
    if (market === Market.MONEYLINE) {
      const home = line.prices.find((p: any) => p.designation === "home");
      const away = line.prices.find((p: any) => p.designation === "away");
      const homePrice = home.price;
      const awayPrice = away.price;
      const standard = {
        homeTeam,
        awayTeam,
        period,
        book: Book.PINNACLE,
        gameTime: correspondingMatchup.time,
      };
      const homeMoneyline = new Moneyline({
        ...standard,
        choice: LineChoice.HOME,
        price: homePrice,
        otherOutcomePrice: awayPrice,
      });
      const awayMoneyline = new Moneyline({
        ...standard,
        choice: LineChoice.AWAY,
        price: awayPrice,
        otherOutcomePrice: homePrice,
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
      const standard = {
        homeTeam,
        awayTeam,
        period,
        book: Book.PINNACLE,
        gameTime: correspondingMatchup.time,
      };
      const homeSpread = new Spread({
        ...standard,
        choice: LineChoice.HOME,
        value: homeLine,
        price: homePrice,
        otherOutcomePrice: awayPrice,
      });
      const awaySpread = new Spread({
        ...standard,
        choice: LineChoice.AWAY,
        value: awayLine,
        price: awayPrice,
        otherOutcomePrice: homePrice,
      });
      odds.spreads.push(homeSpread, awaySpread);
    }
  });
  return odds;
};

export const getPinnacleProps = async (league: League): Promise<Prop[]> => {
  const { lines, matchups } = await requestLines(league);

  const props: Prop[] = [];
  for (const matchup of matchups) {
    const { data: pinnacleProps } = await axios.get(
      `https://guest.api.arcadia.pinnacle.com/0.1/matchups/${matchup.id}/related`,
      {
        headers: {
          "x-api-key": PINNACLE_KEY,
        },
      }
    );
    pinnacleProps.forEach((prop: any) => {
      if (prop.type !== "special" || prop.special.category !== "Player Props") {
        return;
      }
      const propName = prop.special.description;
      const playerName = propName.split("(")[0].trim();
      const stat = findStat(prop.units);
      if (!stat) {
        return;
      }
      const line = lines.find((l: any) => l.matchupId === prop.id);
      if (!line) {
        return;
      }
      const value = line.prices[0].points;

      const overId = prop.participants.find(
        (participant: any) => participant.name === "Over"
      ).id;
      const underId = prop.participants.find(
        (participant: any) => participant.name === "Under"
      ).id;

      const overPrice = line.prices.find(
        (price: any) => price.participantId === overId
      )?.price;

      const underPrice = line.prices.find(
        (price: any) => price.participantId === underId
      )?.price;
      if (!overPrice || !underPrice) {
        return undefined;
      }
      const overProp: Prop = {
        player: playerName,
        choice: LineChoice.OVER,
        book: Book.PINNACLE,
        team: "",
        stat,
        value,
        price: overPrice,
      };
      const underProp: Prop = {
        player: playerName,
        choice: LineChoice.UNDER,
        book: Book.PINNACLE,
        team: "",
        stat,
        value,
        price: underPrice,
      };
      props.push(overProp, underProp);
    });
  }
  return props;
};

// requestLines(League.NFL);
