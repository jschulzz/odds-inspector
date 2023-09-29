import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "../book-price";
import { Book, GameLineGroup, Price, PropGroup } from "../../types";
import { Boost } from "../../App";
import { findApplicableBoost } from "../../utils/calculations";
import { Metadata } from "../metadata";

export const ArbRow = ({
  group,
  books,
  overBook,
  underBook,
  boosts
}: {
  group: GameLineGroup | PropGroup;
  books: Book[];
  overBook: string;
  underBook: string;
  boosts: Boost[];
}) => {
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
        <Box>Under: {underBook}</Box>
        <Box>Over: {overBook}</Box>
      </Td>
      {books.map((book) => {
        const thisBooksPrice = allPrices.find((p) => p.book === book);
        const highlightUnder = underBook === book;
        const highlightOver = overBook === book;
        const highlight = highlightOver ? "over" : highlightUnder ? "under" : undefined;
        const boost = findApplicableBoost(group, thisBooksPrice as Price, boosts);
        return (
          <Td key={book}>
            <BookPrice
              overPrice={thisBooksPrice?.overPrice}
              underPrice={thisBooksPrice?.underPrice}
              book={book}
              value={thisBooksPrice?.value}
              highlight={highlight}
              boost={boost}
            />
          </Td>
        );
      })}
    </Tr>
  );
};
