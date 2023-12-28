import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "../book-price";
import { Book, GameLineGroup, PropGroup } from "../../types";
import { Metadata } from "../metadata";

export const MisvalueRow = ({
  group,
  books,
  overs,
  unders
}: {
  group: GameLineGroup | PropGroup;
  books: Book[];
  overs: { books: Book[]; value: number };
  unders: { books: Book[]; value: number };
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
        <Box>
          <strong>Under:</strong> {unders.books.join(", ")}
        </Box>
        <Box>
          <strong>Over:</strong> {overs.books.join(", ")}
        </Box>
      </Td>
      {books.map((book) => {
        const thisBooksPrice = allPrices.find(
          (p) =>
            p.book === book &&
            (overs.books.includes(book)
              ? p.value === overs.value
              : unders.books.includes(book)
              ? p.value === unders.value
              : true)
        );
        const highlightUnder = unders.books.includes(book);
        const highlightOver = overs.books.includes(book);
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
