import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "../book-price";
import { GameLineGroup, Price, PropGroup } from "../../types";
import { Metadata } from "../metadata";

export const MiddleRow = ({
  group,
  books,
  overBook,
  underBook
}: {
  group: GameLineGroup | PropGroup;
  books: string[];
  overBook?: string;
  underBook?: string;
}) => {
  const americanToPayoutMultiplier = (americanOdds: number) => {
    if (americanOdds < 0) {
      return -100 / americanOdds;
    }
    return americanOdds / 100;
  };

  const getWagers = (overWager: number, overPrice: number, underPrice: number) => {
    //underWager = (C * payout(overPrice) + C) / (payout(underPrice) + 1)
    const underWager =
      (overWager * americanToPayoutMultiplier(overPrice) + overWager) /
      (americanToPayoutMultiplier(underPrice) + 1);
    return underWager;
  };

  const allPrices = group.values.flatMap((pricedValue) => {
    return pricedValue.prices.map((price) => {
      return {
        value: pricedValue.value,
        ...price
      };
    });
  });

  const overValue =
    group.values
      .filter((g) => g.prices.some((p) => p.book === overBook))
      .sort((a, b) => (a.value < b.value ? 1 : -1))
      .at(-1)?.value || 0;
  const underValue =
    group.values
      .filter((g) => g.prices.some((p) => p.book === underBook))
      .sort((a, b) => (a.value < b.value ? 1 : -1))
      .at(0)?.value || 0;
  const overPrice =
    allPrices.find((p) => p.book === overBook && p.value === overValue)?.overPrice || 0;
  const underPrice =
    allPrices.find((p) => p.book === underBook && p.value === underValue)?.underPrice || 0;
  const overWager = 10;
  const underWager = 10;
  // const underWager = getWagers(overWager, overPrice, underPrice);

  let goodRange = [Math.ceil(overValue), Math.floor(underValue)];
  if (overValue === Math.ceil(overValue)) {
    goodRange = [goodRange[0] + 1, goodRange[1]];
  }
  if (underValue === Math.floor(underValue)) {
    goodRange = [goodRange[0], goodRange[1] - 1];
  }
  if (goodRange[0] === goodRange[1]) {
    goodRange = [goodRange[0]];
  }

  return (
    <Tr key={Math.random()}>
      <Td>
        <Metadata group={group} />
      </Td>
      <Td w="20rem">
        <Box>
          <strong>Under: </strong>${underWager.toFixed(2)} - {underBook}
        </Box>
        <Box>
          <strong>Over: </strong>${overWager} - {overBook}
        </Box>
        <br />
        <Box>
          <strong>
            {Math.floor(overValue) === overValue ? overValue - 1 : Math.floor(overValue)} or less:{" "}
          </strong>
          ${(underWager * americanToPayoutMultiplier(underPrice) - overWager).toFixed(2)}
        </Box>
        {overValue === Math.ceil(overValue) ? (
          <Box>
            <strong>Push {overValue} </strong>$
            {(underWager * americanToPayoutMultiplier(underPrice)).toFixed(2)}
          </Box>
        ) : (
          <></>
        )}
        <Box>
          <strong>Between [{goodRange.join(", ")}]: </strong>$
          {(
            overWager * americanToPayoutMultiplier(overPrice) +
            underWager * americanToPayoutMultiplier(underPrice)
          ).toFixed(2)}
        </Box>
        {underValue === Math.floor(underValue) ? (
          <Box>
            <strong>Push {underValue} </strong>$
            {(overWager * americanToPayoutMultiplier(overPrice)).toFixed(2)}
          </Box>
        ) : (
          <></>
        )}
        <Box>
          <strong>
            {Math.ceil(underValue) === underValue ? underValue + 1 : Math.ceil(underValue)} or more:{" "}
          </strong>
          ${(overWager * americanToPayoutMultiplier(overPrice) - underWager).toFixed(2)}
        </Box>
      </Td>
      {books.map((book) => {
        const highlightUnder = underBook === book;
        const highlightOver = overBook === book;
        const thisBooksPrice = allPrices
          .filter((p) => p.book === book)
          .sort((a, b) => (a.value < b.value ? 1 : -1))
          .at(highlightOver ? -1 : 0);
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
