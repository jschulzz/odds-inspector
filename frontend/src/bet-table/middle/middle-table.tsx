import { Box, Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { GameLineGroup, Market, PricedValue, PropGroup } from "../../types";
import { AppliedFilters } from "../../App";
import { MiddleRow } from "./middle-row";

export const MiddleTable = ({
  groups,
  books,
  filters
}: {
  groups: (GameLineGroup | PropGroup)[];
  books: string[];
  filters: AppliedFilters;
}) => {
  const columns = ["Metadata", "Fair line", ...books];
  const columnWidths = new Map([
    ["Metadata", "18rem"],
    ["Fair line", "15rem"]
  ]);

  const calculateMiddle = (group: GameLineGroup | PropGroup) => {
    if ((group as GameLineGroup).metadata.type === "moneyline") {
      throw new Error("No line");
    }
    const maxValues = Math.max(...group.values.map((value) => value.value));
    const minValues = Math.min(...group.values.map((value) => value.value));
    const maxPrice = group.values.find((value) => value.value === maxValues) as PricedValue;
    const minPrice = group.values.find((value) => value.value === minValues) as PricedValue;

    if (!minPrice || !maxPrice) {
      console.log({ minPrice, maxPrice, maxValues, minValues, group });
    }

    const [bestMax] = maxPrice.prices
      .filter((price) => !filters.book.excluded.includes(price.book))
      .sort((a, b) => (a.underPrice < b.underPrice ? 1 : -1));
    const [bestMin] = minPrice.prices
      .filter((price) => !filters.book.excluded.includes(price.book) && price.book !== bestMax.book)
      .sort((a, b) => (a.overPrice < b.overPrice ? 1 : -1));

    const maxValue = maxPrice.value;
    const minValue = minPrice.value;

    return { bestMax, minValue, maxValue, bestMin };
  };
  const middleLines = groups
    .filter(
      (group) => ![Market.SPREAD, Market.MONEYLINE].includes((group as GameLineGroup).metadata.type)
    )
    .map((group) => {
      try {
        const { bestMax, minValue, maxValue, bestMin } = calculateMiddle(group);
        return {
          group,
          bestMax,
          minValue,
          maxValue,
          bestMin,
          score: Math.abs(minValue - maxValue) / ((minValue + maxValue) / 2)
        };
      } catch {
        return {
          group,
          score: 0
        };
      }
    })
    .filter(({ score, bestMax, bestMin }) => {
      return bestMax && bestMin && score > 0.1 && (bestMax.underPrice + bestMin.overPrice) / 2 > -115;
    })
    .sort((a, b) => {
      return a.score < b.score ? 1 : -1;
    });

  return (
    <div>
      <Table>
        <Thead>
          <Tr>
            {columns.map((title) => (
              <Td minW={columnWidths.get(title) || "10rem"} key={title}>
                <Box>{title}</Box>
              </Td>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {middleLines.map(({ group, bestMax, bestMin }) => {
            return (
              <MiddleRow
                key={Math.random()}
                group={group}
                books={books}
                overBook={bestMin?.book}
                underBook={bestMax?.book}
              />
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
