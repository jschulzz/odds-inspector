import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "./book-price";
import { GameLinePlay } from "../../../db-analysis/game-lines";
import { WithId } from "../../../database/types";
import { Price } from "../../../database/mongo.price";

const getMetadataView = (bet: GameLinePlay) => {
  const metadataViews = new Map([
    ["moneyline", <Box></Box>],
    [
      "spread",
      <Box>
        Team: {bet.metadata.side}, Value: {bet.metadata.value}
      </Box>
    ],
    ["gameTotal", <Box>Value: {bet.metadata.value}</Box>],
    [
      "teamTotal",
      <Box>
        Team: {bet.metadata.side}, Value: {bet.metadata.value}
      </Box>
    ]
  ]);
  return metadataViews.get(bet.type);
};

export const GameLineRow = ({ bet, books }: { bet: GameLinePlay; books: string[] }) => {
  return (
    <Tr key={Math.random()}>
      <Td minW="10rem">{bet.gameLabel}</Td>
      <Td minW="8rem">{getMetadataView(bet)}</Td>
      <Td>{bet.type}</Td>
      <Td>{bet.period}</Td>
      {books.map((book) => {
        const thisBooksPrice = bet.prices.find((p: WithId<Price>) => p.book === book);
        return (
          <Td key={Math.random()}>
            <BookPrice
              overPrice={thisBooksPrice?.overPrice}
              underPrice={thisBooksPrice?.underPrice}
              EV={bet.EV}
              isTarget={bet.book === book}
              type={"game-" + bet.type}
              book={book}
              side={bet.metadata.side as string}
            />
          </Td>
        );
      })}
    </Tr>
  );
};
