import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "../book-price";
import { Book, GameLineGroup, Price, PropGroup } from "../../types";
import {
  probabilityToAmerican,
  getLikelihood,
  findApplicableBoost
} from "../../utils/calculations";
import { Boost } from "../../App";
import { Metadata } from "../metadata";

export const EdgeRow = ({
  group,
  books,
  bankroll,
  kelly,
  propOrGroup,
  boosts = []
}: {
  group: GameLineGroup | PropGroup;
  books: Book[];
  bankroll: number;
  kelly: number;
  propOrGroup: "prop" | "game";
  boosts?: Boost[];
}) => {
  const valueToOverFairLine = new Map();
  group.values.forEach(({ value, prices }) => {
    if (!valueToOverFairLine.has(value)) {
      const fairLine = probabilityToAmerican(
        getLikelihood(prices, group, "over", propOrGroup)
      );
      valueToOverFairLine.set(value, fairLine);
    }
  });

  const allPrices = group.values.flatMap((pricedValue) => {
    return pricedValue.prices.map((price) => {
      return {
        value: pricedValue.value,
        ...price
      };
    });
  });

  return (
    <Tr key={Math.random()}>
      <Td>
        <Metadata group={group} />
      </Td>
      <Td w="15rem">
        {[...valueToOverFairLine.entries()]
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map((entry) => (
            <Box key={entry[0]}>
              o{entry[0]}: {Math.ceil(entry[1])}
            </Box>
          ))}
      </Td>
      {books.map((book) => {
        const thisBooksPrice = allPrices.find((p) => p.book === book);
        const boost = findApplicableBoost(group, thisBooksPrice as Price, boosts);
        return (
          <Td key={book}>
            <BookPrice
              overPrice={thisBooksPrice?.overPrice}
              underPrice={thisBooksPrice?.underPrice}
              book={book}
              value={thisBooksPrice?.value}
              overFairLine={valueToOverFairLine.get(thisBooksPrice?.value)}
              bankroll={bankroll}
              kelly={kelly}
              boost={boost}
            />
          </Td>
        );
      })}
    </Tr>
  );
};
