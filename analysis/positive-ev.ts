import { getCircaLines } from "../import/circa";
import { getOddspedia } from "../import/oddspedia";
import { getPinnacle } from "../import/pinnacle";
import { Odds } from "../odds/odds";
import { Book, League, Line, Market, Period, SourcedOdds } from "../types";
import { findMatchingEvents } from "./find-matching-events";
import { table, TableUserConfig } from "table";
import { LineChoice, TeamTotal } from "../types/lines";

interface Play {
  expectedValue: number;
  likelihood: number;
  line: Line;
  matchingPinnacleLine: Line;
}

const findGoodPlays = (lines: Line[], sourceLines: SourcedOdds): Play[] => {
  const positiveEVPlays: Play[] = [];
  lines.forEach((line) => {
    const [matchingPinnacleLine] = findMatchingEvents(line, sourceLines);
    if (!matchingPinnacleLine) {
      // console.log("no pinnacle line for", line);
      return;
    }
    const pinnacleProbabilityFor = Odds.fromVigAmerican(
      matchingPinnacleLine.price,
      matchingPinnacleLine.otherOutcomePrice
    ).toProbability();
    const pinnacleProbabilityAgainst = 1 - pinnacleProbabilityFor;

    const payoutMultiplier = Odds.fromFairLine(line.price).toPayoutMultiplier();
    const expectedValue =
      payoutMultiplier * pinnacleProbabilityFor - pinnacleProbabilityAgainst;

    if (expectedValue > 0.0001 && pinnacleProbabilityFor > 0.3) {
      positiveEVPlays.push({
        expectedValue,
        likelihood: pinnacleProbabilityFor,
        line,
        matchingPinnacleLine,
      });
    }
  });
  return positiveEVPlays;
};

export const findPositiveEv = async (league: League) => {
  const pinnacleLines = await getPinnacle(league);
  const circaLines = await getCircaLines(league);
  const otherLines = await getOddspedia(league);

  const allLines: SourcedOdds = {
    moneylines: [
      ...pinnacleLines.moneylines,
      ...circaLines.moneylines,
      ...otherLines.moneylines,
    ],
    spreads: [
      ...pinnacleLines.spreads,
      ...circaLines.spreads,
      ...otherLines.spreads,
    ],
    teamTotals: [
      ...pinnacleLines.teamTotals,
      ...circaLines.teamTotals,
      ...otherLines.teamTotals,
    ],
    gameTotals: [
      ...pinnacleLines.gameTotals,
      ...circaLines.gameTotals,
      ...otherLines.gameTotals,
    ],
  };

  const moneylines = findGoodPlays(otherLines.moneylines, pinnacleLines);
  const spreads = findGoodPlays(otherLines.spreads, pinnacleLines);
  const teamTotals = findGoodPlays(otherLines.teamTotals, pinnacleLines);
  const gameTotals = findGoodPlays(otherLines.gameTotals, pinnacleLines);
  const positiveEVPlays = [
    ...moneylines,
    ...spreads,
    ...teamTotals,
    ...gameTotals,
  ];

  const sortedPlays = positiveEVPlays
    .sort(
      ({ expectedValue: expectedValueA }, { expectedValue: expectedValueB }) =>
        expectedValueA < expectedValueB ? 1 : -1
    )
    .map((play) => ({
      line: play.line,
      EV: play.expectedValue,
      likelihood: play.likelihood,
      homeTeam: play.line.homeTeam,
      awayTeam: play.line.awayTeam,
      choice: play.line.choice,
      value: play.line.value,
      type: play.line.type,
      period: play.line.period,
      book: play.line.book,
      price: play.line.price,
      side: (play.line as TeamTotal).side,
      fair: play.matchingPinnacleLine.price,
      key: `${play.line.homeTeam}-${play.line.awayTeam}-${play.line.choice}-${play.line.value}-${play.line.type}-${play.line.period}`,
    }));

  return { plays: sortedPlays, lines: allLines };
};

export const formatResults = async (league: League) => {
  const { plays, lines } = await findPositiveEv(league);

  const filteredPlays = plays.filter(
    (p, idx) => !plays.slice(0, idx).find((x) => p.key === x.key)
  );

  const alignedWithEquivalents = filteredPlays.map((p) => ({
    play: p,
    matchingLines: findMatchingEvents(p.line, lines),
  }));

  const typeToString = (
    choice: LineChoice,
    value: number,
    type: Market,
    period: Period,
    side: string
  ) => {
    if (type === Market.SPREAD) {
      return `${choice} covers the ${value} ${period} spread`;
    }
    if (type === Market.MONEYLINE) {
      return `${choice} wins the ${period}`;
    }
    if (type === Market.GAME_TOTAL) {
      return `combine to go ${choice} the ${value} ${period} score`;
    }
    if (type === Market.TEAM_TOTAL) {
      return `${side} team goes ${choice} the ${value} ${period} score`;
    }
  };

  const tableData = alignedWithEquivalents.map(({ play, matchingLines }) => [
    `${play.awayTeam} @ ${play.homeTeam} - ${typeToString(
      play.choice,
      play.value,
      play.type,
      play.period,
      play.side
    )} - (${play.line.book}, ${(play.EV * 100).toFixed(2)}% EV)`,
    matchingLines.find((line) => line.book === Book.PINNACLE)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.CIRCA)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.BET365)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.BETMGM)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.BETRIVERS)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.BORGATA)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.CAESARS)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.DRAFTKINGS)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.FANDUEL)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.POINTSBET)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.UNIBET)?.price || "N/A",
    matchingLines.find((line) => line.book === Book.WYNNBET)?.price || "N/A",
  ]);
  const tableConfig: TableUserConfig = {
    columns: [{ width: 40, wrapWord: true }],
  };

  const headers = [
    "Line",
    Book.PINNACLE,
    Book.CIRCA,
    Book.BET365,
    Book.BETMGM,
    Book.BETRIVERS,
    Book.BORGATA,
    Book.CAESARS,
    Book.DRAFTKINGS,
    Book.FANDUEL,
    Book.POINTSBET,
    Book.UNIBET,
    Book.WYNNBET,
  ];

  return table([headers, ...tableData], tableConfig);
};
