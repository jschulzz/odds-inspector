import { table, TableUserConfig } from "table";
import colors from "colors";
import { getCircaLines } from "../import/circa";
import { getOddspedia } from "../import/oddspedia";
import { getPinnacle } from "../import/pinnacle";
import { Odds } from "../odds/odds";
import { Book, League, Line, Market, Period, SourcedOdds } from "../types";
import { findMatchingEvents } from "./find-matching-events";
import {
  GameTotal,
  LineChoice,
  Moneyline,
  Spread,
  TeamTotal,
} from "../types/lines";
import { getActionNetworkLines } from "../import/actionNetwork";
import { Bankroll } from "../bankroll/bankroll";
import { readOddsAPI } from "../import/odds-api";

interface Play {
  expectedValue: number;
  likelihood: number;
  line: Line;
  fairLine?: number;
  matchingPinnacleLine?: Line;
  width?: number;
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

const findGoodPlays = (
  bettableLines: Line[],
  sourceLines: SourcedOdds
): Play[] => {
  const positiveEVPlays: Play[] = [];
  bettableLines.forEach((bettableLine) => {
    const [matchingPinnacleLine] = findMatchingEvents(
      bettableLine,
      sourceLines,
      {
        wantSameChoice: true,
        wantOppositeValue: false,
      }
    );
    if (!matchingPinnacleLine || !bettableLine.price) {
      // console.log("couldnt pinnacle line for", bettableLine);
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

    const payoutMultiplier = Odds.fromFairLine(
      bettableLine.price
    ).toPayoutMultiplier();
    const expectedValue =
      payoutMultiplier * pinnacleProbabilityFor - pinnacleProbabilityAgainst;

    if (expectedValue > -0.0001 && pinnacleProbabilityFor > 0.3) {
      positiveEVPlays.push({
        expectedValue,
        likelihood: pinnacleProbabilityFor,
        line: bettableLine,
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

const buildGroups = (sources: SourcedOdds): Line[][] => {
  const lineTypes = [
    sources.moneylines,
    sources.gameTotals,
    sources.spreads,
    sources.teamTotals,
  ];
  const groups: Line[][] = [];
  lineTypes.forEach((lineType) => {
    let remainingLines = [...lineType];
    while (remainingLines.length) {
      const targetLine = remainingLines.pop() as Line;
      const matchingLines = findMatchingEvents(targetLine, sources, {
        wantSameChoice: true,
        wantOppositeValue: false,
      }).filter(x => x.book !== Book.POINTSBET);

      const group = matchingLines.filter((l) => l.price);
      if (group.length >= 2) groups.push(group);
      remainingLines = remainingLines.filter((line) => !group.includes(line));
    }
  });
  return groups;
};

const evaluateGroup = (group: Line[]) => {
  let fairLine = 0;
  let likelihoodSum = 0;
  let count = 0;
  group.forEach((line: Line) => {
    let weight = 1;
    if (line.book === Book.PINNACLE) {
      weight = 3;
    }
    if (line.book === Book.CIRCA) {
      weight = 2;
    }
    if (line.book === Book.BETONLINE) {
      weight = 2;
    }
    if (line.book === Book.DRAFTKINGS) {
      weight = 1.5;
    }
    if (line.book === Book.FANDUEL) {
      weight = 1.5;
    }
    const likelihood = Odds.fromVigAmerican(
      line.price,
      line.otherOutcomePrice
    ).toProbability();
    count += weight;
    likelihoodSum += likelihood * weight;
  });
  const likelihood = likelihoodSum / count;
  fairLine = Odds.probabilityToAmericanOdds(likelihood);

  const beatingFairLine = group.filter((line) => line.price > fairLine);
  // beatsFairLine = !!beatingFairLine.length;
  return { fairLine, beatingFairLine };
};

export const findPositiveEv = async (league: League) => {
  const pinnacleLines = await getPinnacle(league);
  // const circaLines = await getCircaLines(league);
  const actionNetworkLines = await getActionNetworkLines(league);
  // const oddsAPILines = readOddsAPI(league);

  console.log("Acquired Odds");

  const bettableLines = combineLines([actionNetworkLines]);
  const allLines = combineLines([
    pinnacleLines,
    // circaLines,
    actionNetworkLines,
    // oddsAPILines,
  ]);

  const groups = buildGroups(allLines);

  const positiveEVPlays: Play[] = groups
    .map((group) => {
      const plays: Play[] = [];
      const { fairLine, beatingFairLine } = evaluateGroup(group);
      if (!beatingFairLine.length) {
        return [];
      }
      const likelihood = Odds.fromFairLine(fairLine).toProbability();

      beatingFairLine.forEach((line) => {
        const payoutMultiplier = Odds.fromFairLine(
          line.price
        ).toPayoutMultiplier();
        const expectedValue = payoutMultiplier * likelihood - (1 - likelihood);
        const play: Play = { expectedValue, likelihood, line, fairLine };
        if (line.price) plays.push(play);
      });
      return plays;
    })
    .flat();

  // console.log(groups);

  // const moneylines = findGoodPlays(bettableLines.moneylines, pinnacleLines);
  // const spreads = findGoodPlays(bettableLines.spreads, pinnacleLines);
  // const teamTotals = findGoodPlays(bettableLines.teamTotals, pinnacleLines);
  // const gameTotals = findGoodPlays(bettableLines.gameTotals, pinnacleLines);
  // const positiveEVPlays = [
  //   ...moneylines,
  //   ...spreads,
  //   ...teamTotals,
  //   ...gameTotals,
  // ];

  console.log(`Found ${positiveEVPlays.length} Positive EV Plays`);

  const sortedPlays: DisplayPlay[] = positiveEVPlays
    .sort(
      ({ expectedValue: expectedValueA }, { expectedValue: expectedValueB }) =>
        expectedValueA < expectedValueB ? 1 : -1
    )
    .map((play) => ({
      line: play.line,
      EV: play.expectedValue,
      width: play.width || 0,
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
      fair: play.matchingPinnacleLine?.price || play.fairLine || 0,
      key: `${play.line.homeTeam}-${play.line.awayTeam}-${play.line.choice}-${(play.line as Spread).value
        }-${play.line.type}-${play.line.period}`,
    }))
    .filter((play) => play.fair < 200);

  console.log(`${sortedPlays.length} have a fair line of +200 or less`);

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
      return `${choice} covers the ${colors.bold(
        value.toString()
      )} ${period} spread`;
    }
    if (type === Market.MONEYLINE) {
      return `${choice} wins the ${period}`;
    }
    if (type === Market.GAME_TOTAL) {
      return `combine to go ${choice} the ${colors.bold(
        value.toString()
      )} ${period} score`;
    }
    if (type === Market.TEAM_TOTAL) {
      return `${side} team goes ${choice} the ${colors.bold(
        value.toString()
      )} ${period} score`;
    }
  };

  const tableData = alignedWithEquivalents.map(({ play, matchingLines }) => {
    const mustBeatPrice = new Odds(play.likelihood).toAmericanOdds();
    let widthString = play.width.toString();
    if (play.width >= 25) {
      widthString = widthString.bgRed;
    } else if (play.width <= 15) {
      widthString = widthString.bgGreen;
    } else {
      widthString = widthString.bgYellow;
    }

    const label = `${play.awayTeam} @ ${play.homeTeam} - ${typeToString(
      play.choice,
      play.value,
      play.type,
      play.period,
      play.side
    )} (${(play.EV * 100).toFixed(2)}% EV, ${mustBeatPrice.toFixed(
      0
    )}, width of ${widthString}, ${(play.likelihood * 100).toFixed(1)}%)`;
    const bookPrices = allBooks.map((book) => {
      const prices: number[] = matchingLines
        .filter((l) => l.book === book)
        .map((l) => l.price);
      if (!prices.length) {
        const otherValue = allLines.find(
          (line) =>
            line.awayTeam === play.awayTeam &&
            line.type === play.type &&
            line.book === book &&
            line.period === play.period &&
            line.choice === play.choice &&
            (line as TeamTotal).side === play.side
        );
        if (
          !otherValue ||
          !(otherValue as TeamTotal | GameTotal | Spread).value
        ) {
          return "";
        }
        return colors.gray(
          `@${(otherValue as TeamTotal | GameTotal | Spread).value}\n${(otherValue as TeamTotal | GameTotal | Spread).price
          }`
        );
      }

      const minPrice = Math.min(...prices);
      const bankroll = new Bankroll();
      const recommendedWager = bankroll.calculateKelly(
        play.likelihood,
        Odds.fromFairLine(minPrice).toPayoutMultiplier()
      );
      const priceString = prices.join(", ");
      if (prices.includes(play.line.price)) {
        return `${colors.bgGreen(priceString)}\n$${recommendedWager.toFixed(
          2
        )}`;
      } else if (prices.length && prices.every((p) => p > mustBeatPrice)) {
        return `${colors.bgYellow(priceString)}\n$${recommendedWager.toFixed(
          2
        )}`;
      }
      return priceString;
    });

    return [label, ...bookPrices];
  });
  const tableConfig: TableUserConfig = {
    columns: [{ width: 40, wrapWord: true }],
  };

  const headers = ["Line", ...allBooks];
  const HEADER_GAP = 10;
  for (let i = 0; i + i / HEADER_GAP < tableData.length; i += HEADER_GAP) {
    tableData.splice(i + i / HEADER_GAP, 0, headers);
  }

  return table(tableData, tableConfig);
};
