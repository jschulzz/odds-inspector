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
    const sameGame =
      line.game.awayTeam.name === targetLine.game.awayTeam.name &&
      line.game.homeTeam.name === targetLine.game.homeTeam.name &&
      line.game.gameTime?.getTime() === targetLine.game.gameTime?.getTime();
    const sameLine = options.wantOppositeValue
      ? (line as Spread).value === -(targetLine as Spread).value
      : (line as Spread).value === (targetLine as Spread).value;
    const samePeriod = line.period === targetLine.period;
    const sameChoice = options.wantSameChoice
      ? line.choice === targetLine.choice
      : line.choice !== targetLine.choice;
    const sameSide =
      (line as TeamTotal).side === (targetLine as TeamTotal).side;

    // console.log(
    //   { sameChoice, sameGame, sameLine, samePeriod, sameSide },
    //   // @ts-ignore
    //   line.game.gameTime?.getTime() - targetLine.game.gameTime?.getTime()
    // );
    // TODO: verify game times. Only an issue for double-header sports
    return sameGame && sameLine && samePeriod && sameChoice && sameSide;
  });
};
