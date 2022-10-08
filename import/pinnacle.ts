import axios from "axios";
import fs from "fs";
import path from "path";
import { findMarket } from "../markets";
import { PINNACLE_KEY } from "../secrets";
import {
  Book,
  League,
  Market,
  Moneyline,
  Period,
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
]);

const requestLines = async (league: League) => {
  const leagueID = leagueIDs.get(league);
  if (!leagueID) {
    throw new Error(`Unknown Pinnacle league ${league}`);
  }
  const linesUrl = `0.1/leagues/${leagueID}/markets/straight`;
  const matchupUrl = `0.1/leagues/${leagueID}/matchups`;

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
          "x-api-key": "CmX2KcMrXuFmNg6YFbmTxE0y9CIrOi0R",
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

const getPinnacleEvents = (matchups: any) => {
  let events = new Map<number, Event>();
  matchups
    .filter((matchup: any) => matchup.type === "matchup")
    .filter((matchup: any) => !matchup.parentId)
    .forEach((matchup: any) => {
      let storedEvent = events.get(matchup.id);

      if (!storedEvent) {
        storedEvent = {
          homeTeam: matchup.participants.find(
            (x: any) => x.alignment === "home"
          ).name,
          awayTeam: matchup.participants.find(
            (x: any) => x.alignment === "away"
          ).name,
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

  const events = getPinnacleEvents(matchups);

  const odds: SourcedOdds = {
    moneylines: [],
    spreads: [],
    gameTotals: [],
    teamTotals: [],
  };
  const periodMap = new Map([
    [0, Period.FULL_GAME],
    [1, Period.FIRST_HALF],
    [3, Period.FIRST_QUARTER],
  ]);

  lines.forEach((line: any) => {
    const correspondingMatchup = events.get(line.matchupId);
    if (!correspondingMatchup) {
      return undefined;
    }
    const period = periodMap.get(line.period);
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
        price: overPrice,
        otherOutcomePrice: underPrice,
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

// export const getPinnacleProps = async (market) => {
//   const { lines, matchups } = await requestLines(market);

//   const props = lines
//     .map((line) => {
//       const correspondingMatchup = matchups.find(
//         (matchup) => line.matchupId === matchup.id
//       );
//       if (!correspondingMatchup) {
//         return undefined;
//       }
//       if (
//         correspondingMatchup.type !== "special" ||
//         correspondingMatchup.special.category !== "Player Props"
//       ) {
//         return undefined;
//       }
//       const propName = correspondingMatchup.special.description;
//       const playerName = propName.split("(")[0].trim();
//       const stat = correspondingMatchup.units;
//       const value = line.prices[0].points;

//       const overId = correspondingMatchup.participants.find(
//         (participant) => participant.name === "Over"
//       ).id;
//       const underId = correspondingMatchup.participants.find(
//         (participant) => participant.name === "Under"
//       ).id;

//       const overPrice = line.prices.find(
//         (price) => price.participantId === overId
//       )?.price;

//       const underPrice = line.prices.find(
//         (price) => price.participantId === underId
//       )?.price;
//       if (!overPrice || !underPrice) {
//         return undefined;
//       }
//       return {
//         playerName,
//         stat,
//         value,
//         overPrice,
//         underPrice,
//         time: new Date(correspondingMatchup.startTime).getTime(),
//       };
//     })
//     .filter((line) => line);
//   return props;
// };

// requestLines(League.NFL);
