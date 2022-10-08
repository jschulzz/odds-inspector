import { Line, Market, SourcedOdds } from "../types";
import SS from "string-similarity";

export const findMatchingEvents = (
  targetLine: Line,
  lineCorpus: SourcedOdds
) => {
  const typeMap = new Map([
    [Market.MONEYLINE, lineCorpus.moneylines],
    [Market.SPREAD, lineCorpus.spreads],
    [Market.GAME_TOTAL, lineCorpus.gameTotals],
    [Market.TEAM_TOTAL, lineCorpus.teamTotals],
  ]);

  const marketLines = typeMap.get(targetLine.type);
  if (!marketLines) {
    return [];
  }

  return marketLines.filter((line) => {
    const awayTeamScore = SS.compareTwoStrings(
      line.awayTeam,
      targetLine.awayTeam
    );
    const homeTeamScore = SS.compareTwoStrings(
      line.homeTeam,
      targetLine.homeTeam
    );
    const verySimilarTeams = homeTeamScore + awayTeamScore > 1.5;
    const sameLine = line.value === targetLine.value;
    const samePeriod = line.period === targetLine.period;
    const sameChoice = line.choice === targetLine.choice;
    // TODO: verify game times. Only an issue for double-header sports
    return verySimilarTeams && sameLine && samePeriod && sameChoice;
  });
};
