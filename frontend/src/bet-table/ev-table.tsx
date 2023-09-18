import { Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { GameLineGroup, PropGroup } from "../types";
import { EdgeRow } from "./edge-row";

export const EVTable = ({
  groups,
  books,
  bankroll,
  kelly
}: {
  groups: (PropGroup | GameLineGroup)[];
  books: string[];
  bankroll: number;
  kelly: number;
}) => {
  const columnsToWidth = new Map([
    ["Fair Lines", "10rem"],
    ["Metadata", "15rem"]
  ]);
  const columns = ["Metadata", "Fair Lines", ...books];

  return (
    <div>
      <Table>
        <Thead>
          <Tr>
            {columns.map((title) => (
              <Td minW={columnsToWidth.get(title) || "5rem"} key={title}>
                <div>{title}</div>
              </Td>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {groups.map((group) => (
            <EdgeRow
              key={Math.random()}
              group={group}
              books={books}
              bankroll={bankroll}
              kelly={kelly}
            />
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
