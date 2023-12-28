import { groupBy } from "lodash";
import { Book, PropGroup, PropGroupMetadata, PropsStat } from "../../types";
import { getLikelihood, leaguePlayerPropWeights } from "../../utils/calculations";

const ComboMaps = new Map([
  [
    Book.PRIZEPICKS,
    [
      {
        name: PropsStat.POINTS_PLUS_ASSISTS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.ASSISTS, weight: 1 }
        ]
      },
      {
        name: PropsStat.POINTS_PLUS_REBOUNDS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.REBOUNDS_PLUS_ASSISTS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.ASSISTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.PRA,
        requiresAll: true,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.ASSISTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.PASSING_RUSHING_YARDS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.PASSING_YARDS, weight: 1 },
          { stat: PropsStat.RUSHING_YARDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.RECEIVING_RUSHING_YARDS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.RECEIVING_YARDS, weight: 1 },
          { stat: PropsStat.RUSHING_YARDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.ANYTIME_TDs_NONQB,
        requiresAll: true,
        weights: [
          { stat: PropsStat.RUSHING_TDS, weight: 1 },
          { stat: PropsStat.RECEIVING_TDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.ANYTIME_TDs_QB,
        weights: [
          { stat: PropsStat.RUSHING_TDS, weight: 1 },
          { stat: PropsStat.RECEIVING_TDS, weight: 1 },
          { stat: PropsStat.PASSING_TDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.HITS_RUNS_RBIS,
        weights: [
          { stat: PropsStat.HITS, weight: 1 },
          { stat: PropsStat.RUNS, weight: 1 },
          { stat: PropsStat.RBIS, weight: 1 }
        ]
      },
      {
        name: PropsStat.FANTASY_POINTS,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1.2 },
          { stat: PropsStat.ASSISTS, weight: 1.5 },
          { stat: PropsStat.BLOCKS, weight: 3 },
          { stat: PropsStat.STEALS, weight: 3 },
          { stat: PropsStat.TURNOVERS, weight: -1 }
        ]
      }
    ]
  ],
  [
    Book.UNDERDOG,
    [
      {
        name: PropsStat.POINTS_PLUS_ASSISTS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.ASSISTS, weight: 1 }
        ]
      },
      {
        name: PropsStat.POINTS_PLUS_REBOUNDS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.REBOUNDS_PLUS_ASSISTS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.ASSISTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.PRA,
        requiresAll: true,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.ASSISTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.PASSING_RUSHING_YARDS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.PASSING_YARDS, weight: 1 },
          { stat: PropsStat.RUSHING_YARDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.RECEIVING_RUSHING_YARDS,
        requiresAll: true,
        weights: [
          { stat: PropsStat.RECEIVING_YARDS, weight: 1 },
          { stat: PropsStat.RUSHING_YARDS, weight: 1 }
        ]
      },
      {
        name: PropsStat.HITS_RUNS_RBIS,
        weights: [
          { stat: PropsStat.HITS, weight: 1 },
          { stat: PropsStat.RUNS, weight: 1 },
          { stat: PropsStat.RBIS, weight: 1 }
        ]
      },
      {
        name: PropsStat.FANTASY_POINTS,
        weights: [
          { stat: PropsStat.POINTS, weight: 1 },
          { stat: PropsStat.REBOUNDS, weight: 1.2 },
          { stat: PropsStat.ASSISTS, weight: 1.5 },
          { stat: PropsStat.BLOCKS, weight: 3 },
          { stat: PropsStat.STEALS, weight: 3 },
          { stat: PropsStat.TURNOVERS, weight: -1 }
        ]
      }
    ]
  ]
]);

export type StatComboProps = {
  props: PropGroup[];
};

export type Play = {
  metadata: PropGroupMetadata;
  projectedTotal: number;
  book: Book;
  bookValue: number;
  comboStat: PropsStat;
};

export const StatComboTable = ({ props }: StatComboProps) => {
  const groupedByPlayer = Object.values(groupBy(props, "metadata.player._id"))
    .map((playerGroup) => ({
      metadata: { ...playerGroup[0].metadata, propStat: undefined },
      group: playerGroup[0],
      stats: playerGroup.map((group) => ({
        stat: group.metadata.propStat,
        values: group.values
      }))
    }))
    .sort((a, b) => (a.metadata.game.gameTime > b.metadata.game.gameTime ? 1 : -1));
  let plays: Play[] = [];
  ComboMaps.forEach((combos, book) => {
    combos.forEach(({ name, weights, requiresAll }) => {
      groupedByPlayer.forEach((playerGroup) => {
        const requiresAndHasAll =
          requiresAll &&
          weights.every(({ stat }) =>
            playerGroup.stats.some((playerStat) => playerStat.stat === stat)
          );
        const doesNotRequireAllAndHasSome =
          !requiresAll &&
          weights.some(({ stat }) =>
            playerGroup.stats.some((playerStat) => playerStat.stat === stat)
          );
        if (requiresAndHasAll || doesNotRequireAllAndHasSome) {
          //   if (name === PropsStat.ANYTIME_TDs_QB) {
          //     console.log(playerGroup.metadata);
          //   }
          let metStatGroups: PropsStat[] = [];
          let comboTotal = 0;
          weights.forEach(({ stat: weightedStat, weight }) => {
            const groupStats = playerGroup.stats.find(
              (playerStat) => playerStat.stat === weightedStat
            );
            if (!!groupStats) {
              metStatGroups.push(weightedStat);
            }
            let totalWeight = 0;
            const projectedTotal = !groupStats
              ? 0
              : groupStats.values.reduce((prevSum: number, currValue) => {
                  const overLikelihood = getLikelihood(
                    currValue.prices,
                    playerGroup.group,
                    "over",
                    "prop"
                  );
                  const projectedTotal = currValue.value + (overLikelihood - 0.5) * currValue.value;
                  const weight = currValue.prices.reduce(
                    (prev: number, curr) =>
                      prev +
                      (leaguePlayerPropWeights.get(playerGroup.metadata.league)?.get(curr.book) ||
                        1),
                    0
                  );
                  totalWeight += weight;
                  return weight * projectedTotal + prevSum;
                }, 0);
            comboTotal += !totalWeight ? 0 : (projectedTotal / totalWeight) * weight;
          });
          const recordedCombo = playerGroup.stats.find((stat) => stat.stat === name);
          if (recordedCombo && metStatGroups.length + 1 >= weights.length) {
            const valueMatchingBook = recordedCombo.values.find((combo) =>
              combo.prices.map((p) => p.book).includes(book)
            );

            if (valueMatchingBook) {
              plays.push({
                metadata: playerGroup.metadata,
                projectedTotal: comboTotal,
                book,
                bookValue: valueMatchingBook.value,
                comboStat: name
              });
            }
          }
        }
      });
    });
  });

  const sortedPlays = plays.sort((a, b) =>
    Math.abs(a.projectedTotal - a.bookValue) / a.projectedTotal <
    Math.abs(b.projectedTotal - b.bookValue) / b.projectedTotal
      ? 1
      : -1
  );

  return (
    <div>
      {sortedPlays.map((play) => (
        <>
          <div>{play.book}</div>
          <div>{play.bookValue}</div>
          <div>{play.projectedTotal}</div>
          <div>{play.metadata.player.name}</div>
          <div>{play.metadata.league}</div>
          <div>{play.comboStat}</div>
          <div>
            {((100 * (play.projectedTotal - play.bookValue)) / play.projectedTotal).toFixed(2)}
          </div>
          <br />
        </>
      ))}
    </div>
  );
};
