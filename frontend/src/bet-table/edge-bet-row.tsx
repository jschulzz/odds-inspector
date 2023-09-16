import { Td, Tr } from "@chakra-ui/react";
import { Play } from "../../../db-analysis/player-props";
import { BookPrice } from "./book-price";

export const EdgeBetRow = ({
  bet,
  books,
  bankroll,
  kelly
}: {
  bet: Play;
  books: string[];
  bankroll: number;
  kelly: number;
}) => {
  return (
    <Tr key={Math.random()}>
      <Td>{bet.player.name}</Td>
      <Td>
        {bet.awayTeam.abbreviation} @ {bet.homeTeam.abbreviation}
      </Td>
      <Td>{bet.side}</Td>
      <Td>{bet.prop.value}</Td>
      <Td>{bet.prop.propStat}</Td>
      <Td>{bet.fairLine}</Td>
      {books.map((book) => {
        const thisBooksPrice = bet.prices.find((p) => p.book === book);
        return (
          <Td key={Math.random()}>
            <BookPrice
              overPrice={thisBooksPrice?.overPrice}
              underPrice={thisBooksPrice?.underPrice}
              EV={bet.EV}
              isTarget={bet.book === book}
              type="playerprop-edge"
              book={book}
              side={bet.side}
              fairLine={bet.fairLine}
              bankroll={bankroll}
              kelly={kelly}
            />
          </Td>
        );
      })}
    </Tr>
  );
};