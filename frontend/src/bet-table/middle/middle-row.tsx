import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "../book-price";
import { GameLineGroup, PropGroup } from "../../types";
import { Metadata } from "../metadata";

export const MiddleRow = ({
  group,
  books,
  overBook,
  underBook
}: {
  group: GameLineGroup | PropGroup;
  books: string[];
  overBook: string;
  underBook: string;
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
        return (
          <Td key={book}>
            <BookPrice
              overPrice={thisBooksPrice?.overPrice}
              underPrice={thisBooksPrice?.underPrice}
              book={book}
              value={thisBooksPrice?.value}
              highlight={highlight}
            />
          </Td>
        );
      })}
    </Tr>
  );
};
