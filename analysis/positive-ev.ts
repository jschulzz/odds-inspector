import { table, TableUserConfig } from "table";
import colors from "colors";
import { getCircaLines } from "../import/circa";
import { getOddspedia } from "../import/oddspedia";
import { getPinnacle } from "../import/pinnacle";
import { Odds } from "../odds/odds";
import { Book, League, Line, Market, Period, SourcedOdds } from "../types";
import { findMatchingEvents } from "./find-matching-events";
import { LineChoice, Spread, TeamTotal } from "../types/lines";
import { getActionNetworkLines } from "../import/actionNetwork";

interface Play {
  expectedValue: number;
  likelihood: number;
  line: Line;
  matchingPinnacleLine: Line;
  width: number 
}

interface DisplayPlay {
  line: Line;
  EV: number;
  likelihood: number;
  homeTeam: string;
  awayTeam: string;
  choice: LineChoice;
  value: number;
  type: Market;
  period: Period;
  book: Book;
  price: number;
  side: "home" | "away";
  fair: number;
  key: string;
  width: number;
}

const findGoodPlays = (lines: Line[], sourceLines: SourcedOdds): Play[] => {
  const positiveEVPlays: Play[] = [];
  lines.forEach((line) => {
    const [matchingPinnacleLine] = findMatchingEvents(line, sourceLines, {
      wantSameChoice: true,
      wantOppositeValue: false,
    });
    if (!matchingPinnacleLine || !line.price) {
      // console.log("no pinnacle line for", line);
      return;
    }
    const pinnacleProbabilityFor = Odds.fromVigAmerican(
      matchingPinnacleLine.price,
      matchingPinnacleLine.otherOutcomePrice
    ).toProbability();

    const width = Odds.getWidth(
      matchingPinnacleLine.price,
      matchingPinnacleLine.otherOutcomePrice
    );
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
        width,
      });
    }
  });
  return positiveEVPlays;
};

const combineLines = (sources: SourcedOdds[]): SourcedOdds => {
  const combinedOdds: SourcedOdds = {
    moneylines: sources.flatMap((s) => s.moneylines),
    spreads: sources.flatMap((s) => s.spreads),
    teamTotals: sources.flatMap((s) => s.teamTotals),
    gameTotals: sources.flatMap((s) => s.gameTotals),
  };
  return combinedOdds;
};

export const findPositiveEv = async (league: League) => {
  const pinnacleLines = await getPinnacle(league);
  const circaLines = await getCircaLines(league);
  const actionNetworkLines = await getActionNetworkLines(league);
  const otherLines = await getOddspedia(league, true);

  console.log("Acquired Odds");

  const bettableLines = combineLines([
    pinnacleLines,
    actionNetworkLines,
    otherLines,
  ]);
  console.log(pinnacleLines.moneylines.length);
  console.log(circaLines.moneylines.length);
  console.log(actionNetworkLines.moneylines.length);
  console.log(otherLines.moneylines.length);
  const allLines = combineLines([
    pinnacleLines,
    circaLines,
    actionNetworkLines,
    otherLines,
  ]);

  const moneylines = findGoodPlays(bettableLines.moneylines, pinnacleLines);
  const spreads = findGoodPlays(bettableLines.spreads, pinnacleLines);
  const teamTotals = findGoodPlays(bettableLines.teamTotals, pinnacleLines);
  const gameTotals = findGoodPlays(bettableLines.gameTotals, pinnacleLines);
  const positiveEVPlays = [
    ...moneylines,
    ...spreads,
    ...teamTotals,
    ...gameTotals,
  ];

  console.log("Found Positive EV Plays");

  const sortedPlays: DisplayPlay[] = positiveEVPlays
    .sort(
      ({ expectedValue: expectedValueA }, { expectedValue: expectedValueB }) =>
        expectedValueA < expectedValueB ? 1 : -1
    )
    .map((play) => ({
      line: play.line,
      EV: play.expectedValue,
      width: play.width,
      likelihood: play.likelihood,
      homeTeam: play.line.homeTeam,
      awayTeam: play.line.awayTeam,
      choice: play.line.choice,
      value: (play.line as Spread).value,
      type: play.line.type,
      period: play.line.period,
      book: play.line.book,
      price: play.line.price,
      side: (play.line as TeamTotal).side,
      fair: play.matchingPinnacleLine.price,
      key: `${play.line.homeTeam}-${play.line.awayTeam}-${play.line.choice}-${
        (play.line as Spread).value
      }-${play.line.type}-${play.line.period}`,
    }));

  return formatResults(sortedPlays, allLines);
};

export const formatResults = async (
  plays: DisplayPlay[],
  lines: SourcedOdds
) => {
  const filteredPlays = plays.filter(
    (p, idx) => !plays.slice(0, idx).find((x) => p.key === x.key)
  );

  const allLines = [
    ...lines.gameTotals,
    ...lines.moneylines,
    ...lines.spreads,
    ...lines.teamTotals,
  ];

  const allBooks = [...new Set(allLines.map((play) => play.book))];
  console.log(allBooks);
  const alignedWithEquivalents = filteredPlays.map((p) => ({
    play: p,
    matchingLines: findMatchingEvents(p.line, lines, {
      wantOppositeValue: false,
      wantSameChoice: true,
    }),
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

  const tableData = alignedWithEquivalents.map(({ play, matchingLines }) => {
    const mustBeatPrice = new Odds(play.likelihood).toAmericanOdds();
    const label = `${play.awayTeam} @ ${play.homeTeam} - ${typeToString(
      play.choice,
      play.value,
      play.type,
      play.period,
      play.side
    )} (${play.line.book}, ${(play.EV * 100).toFixed(
      2
    )}% EV, ${mustBeatPrice.toFixed(0)}, width of ${play.width})`;
    const bookPrices = allBooks.map((book) => {
      const prices = matchingLines
        .filter((l) => l.book === book)
        .map((l) => l.price);

      const priceString = prices.join(", ");
      if (prices.includes(play.line.price)) {
        return colors.bgGreen(priceString);
      } else if (prices.every((p) => p > mustBeatPrice)) {
        return colors.bgYellow(priceString);
      }
      return priceString;
    });

    return [label, ...bookPrices];
  });
  const tableConfig: TableUserConfig = {
    columns: [{ width: 40, wrapWord: true }],
  };

  const headers = ["Line", ...allBooks];
  const HEADER_GAP = 15;
  for (let i = 0; i + i / HEADER_GAP < tableData.length; i += HEADER_GAP) {
    tableData.splice(i + i / HEADER_GAP, 0, headers);
  }

  return table(tableData, tableConfig);
};
