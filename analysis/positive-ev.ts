import { table, TableUserConfig } from "table";
import colors from "colors";
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
import { Team } from "../database/team";
import { Price } from "./group";
import { GameGroup } from "./game-group";

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
  homeTeam: Team;
  awayTeam: Team;
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

const buildGroups = (sources: SourcedOdds): GameGroup[] => {
  const lineTypes: (Moneyline | GameTotal | Spread)[][] = [
    sources.moneylines,
    sources.gameTotals,
    sources.spreads,
    // sources.teamTotals,
  ];
  const groups: GameGroup[] = [];
  lineTypes.forEach((lineType) => {
    let remainingLines = [...lineType];
    while (remainingLines.length) {
      const targetLine = remainingLines.pop() as Line;
      const matchingLines = findMatchingEvents(targetLine, sources, {
        wantSameChoice: true,
        wantOppositeValue: false,
      });

      // @ts-ignore
      const prices: Price[] = matchingLines
        .map((matchingLine) => {
          const otherLine = findMatchingEvents(matchingLine, sources, {
            wantSameChoice: false,
            wantOppositeValue: true,
          }).filter((x) => x.book === matchingLine.book);

          if (!otherLine.length) {
            return undefined;
          }
          const price: Price = {
            book: matchingLine.book,
            price: matchingLine.price,
            likelihood: Odds.fromVigAmerican(
              matchingLine.price,
              otherLine[0].price
            ).toProbability(),
          };
          return price;
        })
        .filter(Boolean);

      const group = new GameGroup({
        prices,
        game: targetLine.game,
        lineType: targetLine.type,
        side: targetLine.choice,
        league: targetLine.game.league,
        period: targetLine.period,
        // @ts-ignore
        value: targetLine.value,
      });

      // const group = matchingLines.filter((l) => l.price);
      groups.push(group);
      remainingLines = remainingLines.filter(
        (line) =>
          !(
            group.prices.map((p) => p.book).includes(line.book) &&
            line.choice === group.side &&
            line.game === group.game &&
            line.period === group.period &&
            // @ts-ignore
            line.value === group.value
          )
      );
    }
  });
  return groups;
};

export const findPositiveEv = async (league: League) => {
  const pinnacleLines = await getPinnacle(league);
  const actionNetworkLines = await getActionNetworkLines(league);

  console.log("Acquired Odds");

  const allLines = combineLines([pinnacleLines, actionNetworkLines]);

  const groups = buildGroups(allLines);

  groups.forEach((group) => {
    group.findOppositeGroup(groups);
    group.findRelatedGroups(groups);
  });

  const positiveEvGroups = groups.filter((group) => group.maxEV() > 0);
  const sortedGroups = positiveEvGroups.sort((a, b) =>
    a.maxEV() > b.maxEV() ? 1 : -1
  );
  const filteredGroups = sortedGroups.filter(
    (group) => group.getFairLine() < 200
  );

  console.log(
    `${filteredGroups.length} positive EV groups have a fair line of +200 or less`
  );

  return formatResults(filteredGroups);
};

export const formatResults = async (groups: GameGroup[]) => {
  const allBooks = [
    ...new Set(
      groups.map((group) => group.prices.map((price) => price.book)).flat()
    ),
  ];
  console.log(allBooks);

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

  const tableData = groups.map((group) => {
    const fairline = group.getFairLine();

    const label = `${group.game.awayTeam.abbreviation} @ ${
      group.game.homeTeam.abbreviation
    } - ${typeToString(
      group.side,
      // @ts-ignore
      group.value,
      group.lineType,
      group.period,
      group.side
    )} (${fairline.toFixed(0)}, ${(group.getLikelihood() * 100).toFixed(1)}%)`;
    if (
      group.game.awayTeam.abbreviation === "WSH" &&
      group.lineType === Market.SPREAD &&
      group.side === LineChoice.HOME &&
      group.period === Period.FIRST_HALF &&
      group.value === -0.5
    ) {
      console.log(group);
    }
    const bookPrices = allBooks.map((book) => {
      const thisBooksPrice = group.prices.find((price) => price.book === book);
      const thisBooksEV = group.findEV().find((EV) => EV.book === book);
      if (!thisBooksPrice) {
        const otherGroup = group.oppositeGroup;
        // console.log(group, otherGroup)
        if (!otherGroup || !otherGroup.value) {
          return "";
        }
        return colors.gray(
          `@${otherGroup.value}\n${
            otherGroup.prices.find((price) => price.book === book)?.price
          }`
        );
      }

      const priceString = thisBooksPrice.price.toString();
      if (!thisBooksEV) {
        return priceString;
      }
      if (thisBooksEV?.EV > 0.05) {
        return `${colors.bgGreen(priceString)}\n${(
          thisBooksEV.EV * 100
        ).toFixed(1)}%`;
      } else if (thisBooksEV?.EV > 0) {
        return `${colors.bgYellow(priceString)}\n${(
          thisBooksEV.EV * 100
        ).toFixed(1)}%`;
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
