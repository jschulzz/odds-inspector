import { compareTwoStrings } from "string-similarity";
import { League, Prop, PropsStat } from "../types";
import { getPinnacleProps } from "../import/pinnacle";
import { getUnderdogLines } from "../import/underdog";
import { getPrizePicksLines } from "../import/prizepicks";
import { getThrive } from "../import/thrive";
import { getActionLabsProps } from "../import/action-labs";

const nflFantasyScoring = new Map([
  [PropsStat.PASSING_YARDS, 0.04],
  [PropsStat.PASSING_TDS, 4],
  [PropsStat.INTERCEPTIONS, -1],
  [PropsStat.RUSHING_YARDS, 0.1],
  [PropsStat.RUSHING_TDS, 6],
  [PropsStat.RECEIVING_YARDS, 0.1],
  [PropsStat.RECEIVING_TDS, 6],
  [PropsStat.RECEPTIONS, 0.5],
  [PropsStat.EXTRA_POINTS_MADE, 1],
  [PropsStat.FIELD_GOALS_MADE, 4],
]);

const scoringTable = new Map([[League.NFL, nflFantasyScoring]]);

const findPlayerAverageLines = (player: string, corpus: Prop[]) => {
  const allPropsForPlayer = corpus.filter(
    (prop) => compareTwoStrings(player, prop.player) > 0.85
  );

  const stats = new Set(allPropsForPlayer.map((x) => x.stat));
  const result: { [key in PropsStat]?: number } = {};
  stats.forEach((stat) => {
    const matchingPlays = allPropsForPlayer.filter((x) => x.stat === stat);
    const averageValue =
      matchingPlays.reduce((prev, curr) => prev + curr.value, 0) /
      matchingPlays.length;
    result[stat] = averageValue;
  });
  return result;
};

export const evaluateFantasyPoints = async (league: League) => {
  // const props = await getBetKarma(league);
  const actionLabsProps = await getActionLabsProps(league);
  const pinnacleProps = await getPinnacleProps(league);
  const underdogProps = await getUnderdogLines(league);
  const prizepicksProps = await getPrizePicksLines(league);
  const thriveProps = await getThrive(league);
  //   console.log(underdogProps)
  const allProps = [
    // ...props,
    ...actionLabsProps,
    ...pinnacleProps,
    // ...underdogProps,
    // ...prizepicksProps,
    // ...thriveProps,
  ];
  let remainingProps = [...allProps];
  const propGroups: Prop[][] = [];
  const players = new Set(allProps.map((x) => x.player));
  const scoringChart = scoringTable.get(league);
  if (!scoringChart) {
    return;
  }
  const plays: any[] = [];

  players.forEach((player) => {
    // console.log(player, new Set(allProps.filter(x => compareTwoStrings(x.player, player) > 0.85).map(x => x.stat)))
    const averages = findPlayerAverageLines(player, allProps);
    const expectedFantasy = Object.entries(averages).reduce((prev, curr) => {
      const [stat, expectedValue] = curr;
      const multiplier = scoringChart.get(stat as PropsStat);
      if (!multiplier) {
        return prev;
      }
      return prev + Math.floor(expectedValue) * multiplier;
    }, 0);
    const prizePicksFantasy = underdogProps.find(
      (prop) =>
        compareTwoStrings(prop.player, player) > 0.85 &&
        prop.stat === PropsStat.FANTASY_POINTS
    );
    if (!prizePicksFantasy) {
      return;
    }
    // console.log(player, expectedFantasy, prizePicksFantasy.value);
    if (expectedFantasy > prizePicksFantasy.value) {
      plays.push({
        player,
        expectedFantasy,
        givenScore: prizePicksFantasy.value,
        averages
      });
    }
  });

  console.log(
    plays.sort((a, b) =>
      a.expectedFantasy - a.givenScore > b.expectedFantasy - b.givenScore
        ? 1
        : -1
    )
  );

  return [];
};

export const formatOutliers = (groups: Prop[][], allProps: Prop[]) => {};
