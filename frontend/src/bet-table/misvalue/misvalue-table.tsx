import { Box, Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { GameLineGroup, Market, Price, PropGroup } from "../../types";
import { getLikelihood } from "../../utils/calculations";
import { AppliedFilters } from "../../App";
import { MisvalueRow } from "./misvalue-row";

type TransformedGroup = {
  value: number;
  count: number;
  prices: Price[];
  overLikelihood: number;
  underLikelihood: number;
};

type Misvalue = {
  bestLowest?: Price;
  bestHighest?: Price;
  lowestValue: number;
  highestValue: number;
};

export const MisvalueTable = ({
  groups,
  books,
  filters
}: {
  groups: (GameLineGroup | PropGroup)[];
  books: string[];
  filters: AppliedFilters;
}) => {
  const columns = ["Metadata", "Fair line", ...books];

  const isMisvalued = (group: GameLineGroup | PropGroup): Misvalue => {
    const priceFrequencies: TransformedGroup[] = group.values
      .map((value) => ({
        value: value.value,
        count: value.prices.length,
        prices: value.prices,
        overLikelihood: getLikelihood(
          value.prices,
          group.metadata.league,
          "over",
          (group as PropGroup).metadata.player ? "prop" : "game"
        ),
        underLikelihood: getLikelihood(
          value.prices,
          group.metadata.league,
          "under",
          (group as PropGroup).metadata.player ? "prop" : "game"
        )
      }))
      .sort((a, b) => (a.value > b.value ? 1 : -1));
    const lowestValue = priceFrequencies.at(0) as TransformedGroup;
    const highestValue = priceFrequencies.at(-1) as TransformedGroup;
    if (priceFrequencies.length === 1) {
      return { lowestValue: lowestValue.value, highestValue: highestValue.value };
    }
    // console.log({ highestValue, lowestValue });
    const [bestLowest] = lowestValue?.prices.sort((a, b) => (a.overPrice < b.overPrice ? 1 : -1));
    const [bestHighest] = highestValue?.prices.sort((a, b) =>
      a.underPrice < b.underPrice ? 1 : -1
    );
    const allFavoredAboveLowest = priceFrequencies.every((freq) => {
      if (freq.value === lowestValue?.value) {
        return true;
      }
      return freq.overLikelihood > 0.49;
    });
    const allFavoredBelowHighest = priceFrequencies.every((freq) => {
      if (freq.value === highestValue?.value) {
        return true;
      }
      return freq.underLikelihood > 0.49;
    });
    const results: Misvalue = {
      bestHighest: allFavoredBelowHighest ? bestHighest : undefined,
      bestLowest: allFavoredAboveLowest ? bestLowest : undefined,
      lowestValue: lowestValue.value,
      highestValue: highestValue.value
    };
    // console.log(results);
    return results;
  };
  const misvaluedLines = groups
    .filter(
      (group) => ![Market.SPREAD, Market.MONEYLINE].includes((group as GameLineGroup).metadata.type)
    )
    .filter((group) => {
      const { bestHighest, bestLowest } = isMisvalued(group);

      return (
        (bestHighest || bestLowest) &&
        bestHighest &&
        !filters.book.excluded.includes(bestHighest.book) &&
        bestLowest &&
        !filters.book.excluded.includes(bestLowest.book) &&
        !filters.game.excluded.includes(String(group.metadata.game._id))
      );
    })
    .sort((a, b) => {
      const misValueA = isMisvalued(a);
      const misValueB = isMisvalued(b);
      return misValueA.highestValue - misValueA.lowestValue <
        misValueB.highestValue - misValueB.lowestValue
        ? 1
        : -1;
    });

  return (
    <div>
      <Table>
        <Thead>
          <Tr>
            {columns.map((title) => (
              <Td key={title}>
                <Box>{title}</Box>
              </Td>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {misvaluedLines.map((group) => {
            const { bestHighest, bestLowest, highestValue, lowestValue } = isMisvalued(group);
            const over = {
              book: bestLowest?.book as string,
              value: lowestValue
            };
            const under = {
              book: bestHighest?.book as string,
              value: highestValue
            };
            return (
              <MisvalueRow
                key={Math.random()}
                group={group}
                books={books}
                over={over}
                under={under}
              />
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
