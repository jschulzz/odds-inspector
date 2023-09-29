import { Box, Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { Book, GameLineGroup, Price, PricedValue, PropGroup } from "../../types";
import { americanOddsToDecimal, boostLine, findApplicableBoost } from "../../utils/calculations";
import { AppliedFilters, Boost } from "../../App";
import { ArbRow } from "./arb-row";

export const ArbitrageTable = ({
  groups,
  books,
  filters,
  boosts
}: {
  groups: (GameLineGroup | PropGroup)[];
  books: Book[];
  filters: AppliedFilters;
  boosts: Boost[];
}) => {
  const columns = ["Metadata", "Fair line", ...books];

  const calculateArbitrage = (group: GameLineGroup | PropGroup) => {
    const arbs = group.values.flatMap((value: PricedValue) => {
      return value.prices.flatMap((price1: Price) => {
        return value.prices.flatMap((price2: Price) => {
          if (price1.book === price2.book) {
            return { over: price1, under: price2, arbPct: 1 };
          }
          const overBoost = findApplicableBoost(group, price1, boosts);
          const underBoost = findApplicableBoost(group, price1, boosts);
          let decimalOver = americanOddsToDecimal(price1.overPrice);
          let decimalUnder = americanOddsToDecimal(price1.underPrice);
          if (overBoost) {
            decimalOver = americanOddsToDecimal(boostLine(price1.overPrice, overBoost));
          }
          if (underBoost) {
            decimalOver = americanOddsToDecimal(boostLine(price2.underPrice, underBoost));
          }
          const arbPct = 1 / decimalOver + 1 / decimalUnder;

          const arb = {
            over: price1,
            under: price2,
            arbPct
          };
          return arb;
        });
      });
    });
    const [minArbitrage] = arbs.sort((a, b) => (a.arbPct > b.arbPct ? 1 : -1));
    return minArbitrage;
  };
  const arbitrageGameLines = groups
    .filter((group) => {
      const { arbPct, over, under } = calculateArbitrage(group);
      const gameNotExcluded = !filters.game.excluded.includes(String(group.metadata.game._id));

      return (
        arbPct < 1 &&
        !filters.book.excluded.includes(over.book) &&
        !filters.book.excluded.includes(under.book) &&
        gameNotExcluded
      );
    })
    .sort((a, b) => {
      return calculateArbitrage(a).arbPct > calculateArbitrage(b).arbPct ? 1 : -1;
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
          {arbitrageGameLines.map((group) => {
            const { over, under } = calculateArbitrage(group);
            return (
              <ArbRow
                key={Math.random()}
                group={group}
                books={books}
                overBook={over.book}
                underBook={under.book}
                boosts={boosts}
              />
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
