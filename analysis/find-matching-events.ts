import { Line, Market, SourcedOdds, Spread, TeamTotal } from "../types";

export const findMatchingEvents = (
  targetLine: Line,
  lineCorpus: SourcedOdds,
  options: { wantSameChoice: boolean; wantOppositeValue: boolean } = {
    wantSameChoice: false,
    wantOppositeValue: false,
  }
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
    const sameTeams =
      line.game.awayTeam === targetLine.game.awayTeam &&
      line.game.homeTeam === targetLine.game.homeTeam;
    const sameLine = options.wantOppositeValue
      ? (line as Spread).value === -(targetLine as Spread).value
      : (line as Spread).value === (targetLine as Spread).value;
    const samePeriod = line.period === targetLine.period;
    const sameChoice = options.wantSameChoice
      ? line.choice === targetLine.choice
      : line.choice !== targetLine.choice;
    const sameSide =
      (line as TeamTotal).side === (targetLine as TeamTotal).side;

    // TODO: verify game times. Only an issue for double-header sports
    return sameTeams && sameLine && samePeriod && sameChoice && sameSide;
  });
};
