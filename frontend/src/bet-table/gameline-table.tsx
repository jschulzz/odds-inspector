import { Box, Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { GameLinePlay } from "../../../db-analysis/game-lines";
import { GameLineRow } from "./gameline-row";

export const GameLineTable = ({
  bets,
  books,
  bankroll,
  kelly
}: {
  bets: GameLinePlay[];
  books: string[];
  bankroll: number;
  kelly: number;
}) => {
  const columns = ["Game", "Metadata", "Type", "Period", "Fair line", ...books];

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
          {bets.map((bet) => (
            <GameLineRow key={Math.random()} bet={bet as GameLinePlay} books={books} bankroll={bankroll} kelly={kelly} />
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
