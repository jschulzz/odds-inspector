import { Td, Tr } from "@chakra-ui/react";
import { MisvaluedPlay } from "../../../db-analysis/player-props";
import { BookPrice } from "./book-price";

export const ValueBetRow = ({ bet, books }: { bet: MisvaluedPlay; books: string[] }) => {
  return (
    <Tr key={Math.random()}>
      <Td>{bet.player.name}</Td>
      <Td>
        {bet.awayTeam.abbreviation} @ {bet.homeTeam.abbreviation}
      </Td>
      <Td>{bet.side}</Td>
      <Td>
        {bet.consensusProp.value} @ {(bet.consensusLikelihood * 100).toFixed(2)}%
      </Td>
      <Td>{bet.consensusProp.propStat}</Td>
      {books.map((book) => {
        let isOff = true;
        let thisBooksPrice = bet.prices.find((p) => p.book === book);
        if (!thisBooksPrice) {
          isOff = false;
          thisBooksPrice = bet.consensusPrices.find((p) => p.book === book);
          if (!thisBooksPrice) {
            return <Td key={Math.random()}>N/A</Td>;
          }
        }
        return (
          <Td key={Math.random()}>
            <BookPrice
              overPrice={thisBooksPrice.overPrice}
              underPrice={thisBooksPrice.underPrice}
              value={isOff ? bet.offValue : bet.consensusProp.value}
              isTarget={bet.prices.map((p) => p.book).includes(book)}
              type="playerprop-misvalue"
              book={book}
              side={bet.side}
            />
          </Td>
        );
      })}
    </Tr>
  );
};
