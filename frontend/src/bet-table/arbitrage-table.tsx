import { Box, Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { EdgeRow } from "./edge-row";
import { Book, GameLineGroup, Price, PricedValue } from "../types";
import { americanOddsToDecimal } from "../utils/calculations";

export const ArbitrageGameLines = ({
  gameLines,
  books,
  bankroll,
  kelly
}: {
  gameLines: GameLineGroup[];
  books: string[];
  bankroll: number;
  kelly: number;
}) => {
  const columns = ["Metadata", "Fair line", ...books];
  const boost = 1;

  const calculateArbitrage = (group: GameLineGroup) => {
    const arbs = group.values.flatMap((value: PricedValue) => {
      return value.prices.flatMap((price1: Price) => {
        return value.prices.flatMap((price2: Price) => {
          if (price1.book === price2.book) {
            return { price1, price2, arbPcts: [1, 1] };
          }
          let transformer = (x: any) => x;
          if (price1.book === Book.DRAFTKINGS) {
            transformer = (x) => boost * (x - 1) + 1;
          }
          const arbPcts = [
            1 / transformer(americanOddsToDecimal(price1.overPrice)) +
              1 / americanOddsToDecimal(price2.underPrice),
            1 / transformer(americanOddsToDecimal(price1.underPrice)) +
              1 / americanOddsToDecimal(price2.overPrice)
          ];
          const arb = {
            price1,
            price2,
            arbPcts
          };
          return arb;
        });
      });
    });
    const [minArbitrage] = arbs.sort((a, b) =>
      Math.min(...a.arbPcts) > Math.min(...b.arbPcts) ? 1 : -1
    );
    return minArbitrage;
  };
  const arbitrageGameLines = gameLines
    .filter((group: GameLineGroup) => {
      const { arbPcts } = calculateArbitrage(group);
      //   console.log(arbPcts)
      return Math.min(...arbPcts) < 1;
    })
    .sort((a, b) => {
      return Math.min(...calculateArbitrage(a).arbPcts) > Math.min(...calculateArbitrage(b).arbPcts)
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
          {arbitrageGameLines.map((gameLineGroup) => {
            console.log(gameLineGroup, calculateArbitrage(gameLineGroup));
            return (
              <EdgeRow
                key={Math.random()}
                group={gameLineGroup}
                books={books}
                bankroll={bankroll}
                kelly={kelly}
              />
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
