import { Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { MisvaluedPlay, Play } from "../../../db-analysis/player-props";
import { EdgeBetRow } from "./edge-bet-row";
import { ValueBetRow } from "./value-bet-row";

export const PropTable = ({
  bets,
  books,
  type,
  bankroll,
  kelly
}: {
  bets: Play[] | MisvaluedPlay[];
  books: string[];
  type: "edge" | "misvalue";
  bankroll: number;
  kelly: number;
}) => {
  const columns =
    type === "edge"
      ? ["Name", "Game", "Side", "Value", "Prop", "Fair line", ...books]
      : ["Name", "Game", "Side", "Value + Likelihood", "Prop", ...books];

  return (
    <div>
      <Table>
        <Thead>
          <Tr>
            {columns.map((title) => (
              <Td key={title}>
                <div>{title}</div>
              </Td>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {bets.map((bet) => {
            return type === "edge" ? (
              <EdgeBetRow key={Math.random()} bet={bet as Play} books={books} bankroll={bankroll} kelly={kelly} />
            ) : (
              <ValueBetRow key={Math.random()} bet={bet as MisvaluedPlay} books={books} bankroll={bankroll} kelly={kelly} />
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
