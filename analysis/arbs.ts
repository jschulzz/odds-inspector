import { Odds } from "../odds/odds";
import { League, Line, Market } from "../types";
import { table } from "table";
import { Spread, TeamTotal } from "../types/lines";
import { compareTwoStrings } from "string-similarity";
import colors from "colors";
import { getActionNetworkLines } from "../import/actionNetwork";

interface Opportunity {
  outcome1: Line;
  outcome2: Line;
}

interface Group {
  outcome1: Line[];
  outcome2: Line[];
}

const findEquivalentPlays = (line: Line, corpus: Line[]) =>
  corpus.filter((sampleLine) => {
    const standardMatching =
      compareTwoStrings(sampleLine.homeTeam, line.homeTeam) > 0.85 &&
      compareTwoStrings(sampleLine.awayTeam, line.awayTeam) > 0.85 &&
      sampleLine.type === line.type &&
      sampleLine.period === line.period;

    if (!standardMatching) {
      return false;
    }
    if (
      (sampleLine.type === Market.SPREAD ||
        sampleLine.type === Market.TEAM_TOTAL ||
        sampleLine.type === Market.GAME_TOTAL) &&
      (line.type === Market.SPREAD ||
        line.type === Market.TEAM_TOTAL ||
        line.type === Market.GAME_TOTAL)
    ) {
      if (Math.abs((sampleLine as Spread).value) !== Math.abs((line as Spread).value)) {
        return false;
      }
    }
    if (sampleLine.type === Market.TEAM_TOTAL && line.type === Market.TEAM_TOTAL) {
      if ((sampleLine as TeamTotal).side !== (line as TeamTotal).side) {
        return false;
      }
    }
    return true;
  });

const buildGroups = (lines: Line[]): Group[] => {
  let remainingLines = [...lines];
  const groups: Group[] = [];
  while (remainingLines.length) {
    const line = remainingLines[0];
    const matchingLines = findEquivalentPlays(line, remainingLines);
    const sameOutcome = matchingLines.filter((l) => {
      if (
        (l.type === Market.SPREAD ||
          l.type === Market.TEAM_TOTAL ||
          l.type === Market.GAME_TOTAL) &&
        (line.type === Market.SPREAD ||
          line.type === Market.TEAM_TOTAL ||
          line.type === Market.GAME_TOTAL)
      ) {
        return line.choice === l.choice && (line as Spread).value === (l as Spread).value;
      }

      return line.choice === l.choice;
    });
    const otherOutcome = matchingLines.filter((l) => {
      if (l.type === Market.SPREAD && line.type === Market.SPREAD) {
        return line.choice !== l.choice && (line as Spread).value === -(l as Spread).value;
      }
      if (
        (l.type === Market.TEAM_TOTAL || l.type === Market.GAME_TOTAL) &&
        (line.type === Market.TEAM_TOTAL || line.type === Market.GAME_TOTAL)
      ) {
        return line.choice !== l.choice && (line as TeamTotal).value === (l as TeamTotal).value;
      }
      return line.choice !== l.choice;
    });
    const group: Group = {
      outcome1: sameOutcome,
      outcome2: otherOutcome
    };
    remainingLines = remainingLines.filter(
      (l) => l !== line && !group.outcome1.includes(l) && !group.outcome2.includes(l)
    );
    groups.push(group);
  }
  return groups;
};

const compareLines = (group: Group) => {
  const opportunities: Opportunity[] = [];

  // console.log(group)

  group.outcome1.forEach((outcome1) => {
    group.outcome2.forEach((outcome2) => {
      const outcome1Probability = Odds.fromFairLine(outcome1.price).toProbability();
      const outcome2Probability = Odds.fromFairLine(outcome2.price).toProbability();

      if (outcome1Probability + outcome2Probability < 1) {
        opportunities.push({ outcome1, outcome2 });
      }
    });
  });

  return opportunities;
};

export const findArbs = async (league: League) => {
  const lines = await getActionNetworkLines(league);
  console.log("Aquired Odds");
  const allOpportunities: Opportunity[] = [];

  const moneylineGroups = buildGroups(lines.moneylines);
  const spreadGroups = buildGroups(lines.spreads);
  const teamTotalsGroups = buildGroups(lines.teamTotals);
  const gameTotalsGroups = buildGroups(lines.gameTotals);

  const allGroups = [...moneylineGroups, ...spreadGroups, ...teamTotalsGroups, ...gameTotalsGroups];
  console.log(`Built ${allGroups.length} groups`);

  allGroups.forEach((group) => {
    allOpportunities.push(...compareLines(group));
  });

  console.log(`Found ${allOpportunities.length} arb opportunities`);

  return formatResults(allOpportunities);
};

export const formatResults = async (arbOpportunities: Opportunity[]) => {
  const formatted = arbOpportunities.map((opportunity) => {
    const label = `${opportunity.outcome1.awayTeam} @ ${opportunity.outcome1.homeTeam} -${
      opportunity.outcome1 instanceof TeamTotal ? " " + opportunity.outcome1.side : ""
    } ${opportunity.outcome1.period} ${opportunity.outcome1.type}`;
    const multipliers = [
      Odds.fromFairLine(opportunity.outcome1.price).toPayoutMultiplier(),
      Odds.fromFairLine(opportunity.outcome2.price).toPayoutMultiplier()
    ];
    const totalStake = 100;
    const stakes = [
      totalStake /
        (Odds.fromFairLine(opportunity.outcome1.price).toDecimal() /
          Odds.fromFairLine(opportunity.outcome2.price).toDecimal() +
          1),
      totalStake /
        (Odds.fromFairLine(opportunity.outcome2.price).toDecimal() /
          Odds.fromFairLine(opportunity.outcome1.price).toDecimal() +
          1)
    ];
    const prettyStakes = stakes.map((stake) => stake.toFixed(2));
    const roundedStakes = stakes.map((stake) => 5 * Math.round(stake / 5));
    const payouts = roundedStakes.map((stake, idx) => stake + stake * multipliers[idx]);
    const play1 = `${opportunity.outcome1.choice} ${
      (opportunity.outcome1 as Spread).value || "N/A"
    } @ ${opportunity.outcome1.book}: ${opportunity.outcome1.price}:`;
    const play2 = `${opportunity.outcome2.choice} ${
      (opportunity.outcome1 as Spread).value || "N/A"
    } @ ${opportunity.outcome2.book}: ${opportunity.outcome2.price}:`;
    const payoutString = payouts.map((p) => `$${p.toFixed(2)}`).join(", ");
    const decoratedPayouts =
      payouts[0] >= totalStake && payouts[1] >= totalStake
        ? colors.bgYellow(payoutString)
        : payoutString;
    return [label, play1, play2, prettyStakes, roundedStakes, decoratedPayouts];
  });

  return table(formatted);
};
