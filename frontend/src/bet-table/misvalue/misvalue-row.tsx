import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "../book-price";
import { GameLineGroup, PropGroup } from "../../types";
import { Metadata } from "../metadata";

export const MisvalueRow = ({
  group,
  books,
  over,
  under
}: {
  group: GameLineGroup | PropGroup;
  books: string[];
  over?: { book: string; value: number };
  under?: { book: string; value: number };
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
        <Box>Under: {under?.book}</Box>
        <Box>Over: {over?.book}</Box>
      </Td>
      {books.map((book) => {
        const thisBooksPrice = allPrices.find(
          (p) =>
            p.book === book &&
            (over && over.book === book
              ? p.value === over.value
              : under && under.book === book
              ? p.value === under.value
              : true)
        );
        const highlightUnder = under?.book === book;
        const highlightOver = over?.book === book;
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
