import { Table, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { Book, GameLineGroup, PropGroup } from "../../types";
import { EdgeRow } from "./edge-row";
import { AppliedFilters, Boost, DEFAULT_FAIRLINE } from "../../App";
import { calculateEV, getLikelihood, hasEV, probabilityToAmerican } from "../../utils/calculations";

export const EVTable = ({
  groups,
  books,
  filters,
  bankroll,
  kelly,
  boosts = []
}: {
  groups: (PropGroup | GameLineGroup)[];
  books: Book[];
  filters: AppliedFilters;
  bankroll: number;
  kelly: number;
  boosts: Boost[];
}) => {
  const columnsToWidth = new Map([
    ["Fair Lines", "10rem"],
    ["Metadata", "15rem"]
  ]);
  const columns = ["Metadata", "Fair Lines", ...books];

  const filteredGroups = groups
    .filter((group) => {
      const { hasPositiveEv, positiveEvBooks } = hasEV(
        group,
        (group as PropGroup).metadata.player ? "prop" : "game",
        books,
        boosts
      );
      const isSportsbook = !positiveEvBooks.every((book) =>
        [Book.PRIZEPICKS, Book.UNDERDOG].includes(book)
      );

      const gameNotExcluded = !filters.game.excluded.includes(String(group.metadata.game._id));
      const typeNotExcluded = !(
        filters.type.excluded.includes((group as GameLineGroup).metadata.type) ||
        (filters.type.excluded.includes("prop") && (group as PropGroup).metadata.player)
      );
      const withinFairLineRange = group.values.every((value) => {
        const likelihoodOfOver = getLikelihood(
          value.prices,
          group.metadata.league,
          "over",
          (group as PropGroup).metadata.player ? "prop" : "game"
        );
        const positiveFairLine = probabilityToAmerican(
          Math.min(likelihoodOfOver, 1 - likelihoodOfOver)
        );
        return positiveFairLine < (filters.fairLine.lte ? filters.fairLine.lte : DEFAULT_FAIRLINE);
      });
      return (
        hasPositiveEv && gameNotExcluded && typeNotExcluded && withinFairLineRange && isSportsbook
      );
    })
    .sort((a, b) => {
      return Math.max(
        ...[
          ...a.values.flatMap((v) => {
            const fairline = probabilityToAmerican(
              getLikelihood(
                v.prices,
                a.metadata.league,
                "over",
                (a as PropGroup).metadata.player ? "prop" : "game"
              )
            );
            return v.prices.map((price) => calculateEV(price.overPrice, fairline));
          }),
          ...a.values.flatMap((v) => {
            const fairline = probabilityToAmerican(
              getLikelihood(
                v.prices,
                a.metadata.league,
                "under",
                (a as PropGroup).metadata.player ? "prop" : "game"
              )
            );
            return v.prices.map((price) => calculateEV(price.underPrice, fairline));
          })
        ]
      ) <
        Math.max(
          ...[
            ...b.values.flatMap((v) => {
              const fairline = probabilityToAmerican(
                getLikelihood(
                  v.prices,
                  b.metadata.league,
                  "over",
                  (b as PropGroup).metadata.player ? "prop" : "game"
                )
              );
              return v.prices.map((price) => calculateEV(price.overPrice, fairline));
            }),
            ...b.values.flatMap((v) => {
              const fairline = probabilityToAmerican(
                getLikelihood(
                  v.prices,
                  b.metadata.league,
                  "under",
                  (b as PropGroup).metadata.player ? "prop" : "game"
                )
              );
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
              propOrGroup={(group as PropGroup).metadata.player ? "prop" : "game"}
              boosts={boosts}
            />
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
