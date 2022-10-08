import axios from "axios";
import {
  Book,
  GameTotal,
  League,
  Moneyline,
  Period,
  SourcedOdds,
  Spread,
  TeamTotal,
} from "../types";
import { LineChoice } from "../types/lines";

const leagueMap = new Map([
  [League.NCAAF, "NCAA FOOTBALL > GAMES"],
  [League.NFL, "NFL > GAMES"],
  [League.MLB, "MLB > MLB > MLB"],
]);

const periodMap = new Map([
  ["FULL GAME", Period.FULL_GAME],
  ["GAME", Period.FULL_GAME],
  ["1ST HALF", Period.FIRST_HALF],
  ["1ST QUARTER", Period.FIRST_QUARTER],
]);

const statMap = new Map([
  [
    League.NCAAF,
    {
      teamTotal: (line: any) => line.markettypename.includes("TEAM TOTAL"),
      gameTotal: (line: any) =>
        line.markettypename.includes("TOTAL") &&
        !line.markettypename.includes("HOME") &&
        !line.markettypename.includes("AWAY"),
      moneyline: (line: any) => line.markettypename.includes("MONEY LINE (DPS"),
      spread: (line: any) => line.markettypename.includes("POINT SPREAD (DPS"),
    },
  ],
  [
    League.NFL,
    {
      teamTotal: (line: any) => line.markettypename.includes("TEAM TOTAL"),
      gameTotal: (line: any) =>
        line.markettypename.includes("TOTAL") &&
        !line.markettypename.includes("HOME") &&
        !line.markettypename.includes("AWAY"),
      moneyline: (line: any) =>
        line.markettypename.includes("MONEY LINE (DPS)"),
      spread: (line: any) => line.markettypename.includes("POINT SPREAD (DPS)"),
    },
  ],
  [
    League.MLB,
    {
      teamTotal: (line: any) => line.markettypename.includes("TEAM TOTAL"),
      gameTotal: (line: any) =>
        line.markettypename.includes("TOTAL") &&
        !line.markettypename.includes("HOME") &&
        !line.markettypename.includes("AWAY") &&
        !line.markettypename.includes("INNING"),
      moneyline: (line: any) =>
        line.markettypename.includes("MONEY LINE (DPS)"),
      spread: (line: any) => line.markettypename.includes("RUN LINE (DPS)"),
    },
  ],
]);

const getAllLinesFromEvent = async (
  event: any,
  league: League
): Promise<SourcedOdds> => {
  const url = `https://co.circasports.com/cache/psevent/UK/1/false/${event.idfoevent}.json`;
  const { data } = await axios.get(url);

  const homeTeam = data.participantname_home;
  const awayTeam = data.participantname_away;
  const gameTime = new Date(data.tsstart + "+06:00");

  if (!data.eventmarketgroups) {
    throw new Error(`No Circa markets for ${awayTeam} @ ${homeTeam}`);
  }

  const allMarkets = data.eventmarketgroups.flatMap(
    (group: any) => group.markets
  );

  const upDownToPrice = (up: number, down: number) => {
    const multiplier = up < down ? -1 : +1;
    const value = up < down ? (100 * down) / up : (100 * up) / down;
    return multiplier * value;
  };

  const moneylines: Moneyline[] = [];
  const spreads: Spread[] = [];
  const gameTotals: GameTotal[] = [];
  const teamTotals: TeamTotal[] = [];

  allMarkets.forEach((line: any) => {
    // console.log(line.gameperiodname);
    const period = periodMap.get(line.gameperiodname);
    if (!period) {
      return;
    }
    const stats = statMap.get(league);
    if (!stats) {
      return;
    }
    const standard = {
      homeTeam,
      awayTeam,
      period,
      gameTime,
      book: Book.CIRCA,
    };

    if (stats.gameTotal(line)) {
      const over = line.selections.find((p: any) => p.hadvalue === "O");
      const under = line.selections.find((p: any) => p.hadvalue === "U");
      const overPrice = upDownToPrice(
        over.currentpriceup,
        over.currentpricedown
      );
      const underPrice = upDownToPrice(
        under.currentpriceup,
        under.currentpricedown
      );
      const value = line.currentmatchhandicap;
      const overGameTotal = new GameTotal({
        ...standard,
        price: overPrice,
        otherOutcomePrice: underPrice,
        choice: LineChoice.OVER,
        value,
      });
      const underGameTotal = new GameTotal({
        ...standard,
        price: underPrice,
        otherOutcomePrice: overPrice,
        choice: LineChoice.UNDER,
        value,
      });
      gameTotals.push(overGameTotal, underGameTotal);
    }
    if (stats.teamTotal(line)) {
      const side = line.markettypename.includes("AWAY") ? "away" : "home";
      const over = line.selections.find((p: any) => p.hadvalue === "O");
      const under = line.selections.find((p: any) => p.hadvalue === "U");
      const overPrice = upDownToPrice(
        over.currentpriceup,
        over.currentpricedown
      );
      const underPrice = upDownToPrice(
        under.currentpriceup,
        under.currentpricedown
      );
      const value = line.currentmatchhandicap;
      const overTeamTotal = new TeamTotal({
        ...standard,
        price: overPrice,
        otherOutcomePrice: underPrice,
        choice: LineChoice.OVER,
        value,
        side,
      });
      const underTeamTotal = new TeamTotal({
        ...standard,
        price: underPrice,
        otherOutcomePrice: overPrice,
        choice: LineChoice.UNDER,
        value,
        side,
      });
      teamTotals.push(overTeamTotal, underTeamTotal);
    }
    if (stats.moneyline(line)) {
      const home = line.selections.find((p: any) => p.hadvalue === "H");
      const away = line.selections.find((p: any) => p.hadvalue === "A");
      const homePrice = upDownToPrice(
        home.currentpriceup,
        home.currentpricedown
      );
      const awayPrice = upDownToPrice(
        away.currentpriceup,
        away.currentpricedown
      );
      const homeMoneyline = new Moneyline({
        ...standard,
        price: homePrice,
        otherOutcomePrice: awayPrice,
        choice: LineChoice.HOME,
      });
      const awayMoneyline = new Moneyline({
        ...standard,
        price: awayPrice,
        otherOutcomePrice: homePrice,
        choice: LineChoice.AWAY,
      });
      moneylines.push(homeMoneyline, awayMoneyline);
    }
    if (stats.spread(line)) {
      const home = line.selections.find((p: any) => p.hadvalue === "H");
      const away = line.selections.find((p: any) => p.hadvalue === "A");
      const homePrice = upDownToPrice(
        home.currentpriceup,
        home.currentpricedown
      );
      const awayPrice = upDownToPrice(
        away.currentpriceup,
        away.currentpricedown
      );
      const value = line.currentmatchhandicap;
      const homeSpread = new Spread({
        ...standard,
        price: homePrice,
        otherOutcomePrice: awayPrice,
        choice: LineChoice.HOME,
        value,
      });
      const awaySpread = new Spread({
        ...standard,
        price: awayPrice,
        otherOutcomePrice: homePrice,
        choice: LineChoice.AWAY,
        value: -value,
      });
      spreads.push(homeSpread, awaySpread);
    }
  });

  return {
    spreads,
    teamTotals,
    gameTotals,
    moneylines,
  };
};

export const getCircaLines = async (league: League): Promise<SourcedOdds> => {
  const url = "https://co.circasports.com/cache/psbonav/1/UK/top.json";

  const { data } = await axios.get(url);
  const allNodes: any[] = [];
  //   const flattenedNodes =
  const traverseNodes = (nodes: any[], parent = "") => {
    nodes.forEach((node) => {
      if (node.bonavigationnodes.length) {
        traverseNodes(node.bonavigationnodes, parent + " > " + node.name);
      } else {
        const modifiedNode = { ...node };
        modifiedNode.name = parent + " > " + node.name;
        allNodes.push(modifiedNode);
      }
    });
  };

  traverseNodes(data.bonavigationnodes);

  const targetMatches = allNodes.find((x) =>
    x.name.includes(leagueMap.get(league))
  );
  const endpoint = targetMatches.marketgroups[0].idfwmarketgroup;

  const gameData = await axios.get(
    `https://co.circasports.com/cache/psmg/UK/${endpoint}.json`
  );

  const odds: SourcedOdds = {
    moneylines: [],
    teamTotals: [],
    gameTotals: [],
    spreads: [],
  };

  for (const e of gameData.data.events) {
    try {
      const analysis = await getAllLinesFromEvent(e, league);
      odds.moneylines.push(...analysis.moneylines);
      odds.spreads.push(...analysis.spreads);
      odds.teamTotals.push(...analysis.teamTotals);
      odds.gameTotals.push(...analysis.gameTotals);
    } catch (e: any) {
      console.log(e);
    }
  }

  return odds;
};
