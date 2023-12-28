import { Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { AppliedFilters, DEFAULT_FAIRLINE } from "../../App";
import { PropGroup, Book } from "../../types";
import { hasEV, getLikelihood, probabilityToAmerican, calculateEV } from "../../utils/calculations";
import { EdgeRow } from "../ev/edge-row";

export const DFSTable = ({
  groups,
  books,
  filters,
  bankroll,
  kelly
}: {
  groups: PropGroup[];
  books: Book[];
  filters: AppliedFilters;
  bankroll: number;
  kelly: number;
}) => {
  const columnsToWidth = new Map([
    ["Fair Lines", "10rem"],
    ["Metadata", "15rem"]
  ]);
  const columns = ["Metadata", "Fair Lines", ...books];

  const filteredGroups = groups
    .filter((group) => {
      const { hasPositiveEv, positiveEvBooks } = hasEV(group, "prop", [
        Book.PRIZEPICKS,
        Book.UNDERDOG
      ]);

      if(hasPositiveEv){
        console.log(positiveEvBooks)
      }
      const isDFS = positiveEvBooks.some((book) => [Book.PRIZEPICKS, Book.UNDERDOG].includes(book));
      const gameNotExcluded = !filters.game.excluded.includes(String(group.metadata.game._id));
      const withinValueRange = group.values.every((value) => {
        const likelihoodOfOver = getLikelihood(value.prices, group, "over", "prop");
        const positiveFairLine = probabilityToAmerican(
          Math.min(likelihoodOfOver, 1 - likelihoodOfOver)
        );
        return positiveFairLine < (filters.fairLine.lte ? filters.fairLine.lte : DEFAULT_FAIRLINE);
      });
      return hasPositiveEv && isDFS && gameNotExcluded && withinValueRange;
    })
    .sort((a, b) => {
      return Math.max(
        ...[
          ...a.values.flatMap((v) => {
            const fairline = probabilityToAmerican(getLikelihood(v.prices, a, "over", "prop"));
            return v.prices.map((price) => calculateEV(price.overPrice, fairline));
          }),
          ...a.values.flatMap((v) => {
            const fairline = probabilityToAmerican(getLikelihood(v.prices, a, "under", "prop"));
            return v.prices.map((price) => calculateEV(price.underPrice, fairline));
          })
        ]
      ) <
        Math.max(
          ...[
            ...b.values.flatMap((v) => {
              const fairline = probabilityToAmerican(getLikelihood(v.prices, b, "over", "prop"));
              return v.prices.map((price) => calculateEV(price.overPrice, fairline));
            }),
            ...b.values.flatMap((v) => {
              const fairline = probabilityToAmerican(getLikelihood(v.prices, b, "under", "prop"));
              return v.prices.map((price) => calculateEV(price.underPrice, fairline));
            })
          ]
        )
        ? 1
        : -1;
    });

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
          {filteredGroups.map((group) => (
            <EdgeRow
              key={Math.random()}
              group={group}
              books={books}
              bankroll={bankroll}
              kelly={kelly}
              propOrGroup="prop"
            />
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
