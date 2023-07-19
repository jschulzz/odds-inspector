import { Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { MisvaluedPlay, Play } from "../../../db-analysis/player-props";
import { EdgeBetRow } from "./edge-bet-row";
import { ValueBetRow } from "./value-bet-row";

export const PropTable = ({
  bets,
  books,
  type
}: {
  bets: Play[] | MisvaluedPlay[];
  books: string[];
  type: "edge" | "misvalue";
}) => {
  const columns =
    type === "edge"
      ? ["Name", "Game", "Side", "Value", "Prop", ...books]
      : ["Name", "Game", "Side", "Value + Likelihood", "Prop", ...books];

  return (
    <div>
      <Table>
        <Thead>
          <Tr>
            {columns.map((title) => (
              <Td minW="8rem" key={title}>
                <div>{title}</div>
              </Td>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {bets.map((bet) => {
            return type === "edge" ? (
              <EdgeBetRow key={Math.random()} bet={bet as Play} books={books} />
            ) : (
              <ValueBetRow key={Math.random()} bet={bet as MisvaluedPlay} books={books} />
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
