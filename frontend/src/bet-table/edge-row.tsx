import { Td, Tr, Box } from "@chakra-ui/react";
import { BookPrice } from "./book-price";
import { GameLineGroup, PropGroup } from "../types";
import { probabilityToAmerican, getLikelihood } from "../utils/calculations";

const getMetadataView = (group: GameLineGroup | PropGroup) => {
  const gameBox = (
    <Box>
      Game: {group.metadata.game.awayTeam.abbreviation} @{" "}
      {group.metadata.game.homeTeam.abbreviation} ({group.metadata.league})
    </Box>
  );
  if ((group as GameLineGroup).metadata.type) {
    // is gameline
    const { metadata } = group as GameLineGroup;
    const teamBox = <Box>Team: {metadata.side}</Box>;
    const marketBox = <Box>Market: {metadata.type}</Box>;
    const metadataViews = new Map([
      [
        "moneyline",
        <Box>
          {gameBox}
          {marketBox}
        </Box>
      ],
      [
        "spread",
        <Box>
          {gameBox}
          {teamBox}
          {marketBox}
        </Box>
      ],
      [
        "gameTotal",
        <Box>
          {gameBox}
          {marketBox}
        </Box>
      ],
      [
        "teamTotal",
        <Box>
          {gameBox}
          {marketBox}
          {teamBox}
        </Box>
      ]
    ]);
    return metadataViews.get(metadata.type);
  } else if ((group as PropGroup).metadata.player) {
    const { metadata } = group as PropGroup;
    return (
      <Box>
        {gameBox}
        <Box>
          Player: {metadata.player.name} ({metadata.player.team.abbreviation})
        </Box>
        <Box>Prop: {metadata.propStat}</Box>
      </Box>
    );
  }
};

export const EdgeRow = ({
  group,
  books,
  bankroll,
  kelly
}: {
  group: GameLineGroup | PropGroup;
  books: string[];
  bankroll: number;
  kelly: number;
}) => {
  const valueToOverFairLine = new Map();
  group.values.forEach(({ value, prices }) => {
    if (!valueToOverFairLine.has(value)) {
      const fairLine = probabilityToAmerican(
        getLikelihood(prices, group.metadata.league, "over", "game")
      );
      valueToOverFairLine.set(value, fairLine);
    }
  });

  const allPrices = group.values.flatMap((pricedValue) => {
    return pricedValue.prices.map((price) => {
      return {
        value: pricedValue.value,
        ...price
      };
    });
  });

  return (
    <Tr key={Math.random()}>
      <Td>{getMetadataView(group)}</Td>
      <Td w="15rem">
        {[...valueToOverFairLine.entries()].map((entry) => (
          <Box key={entry[0]}>
            o{entry[0]}: {Math.ceil(entry[1])}
          </Box>
        ))}
      </Td>
      {books.map((book) => {
        const thisBooksPrice = allPrices.find((p) => p.book === book);
        return (
          <Td key={book}>
            <BookPrice
              overPrice={thisBooksPrice?.overPrice}
              underPrice={thisBooksPrice?.underPrice}
              book={book}
              value={thisBooksPrice?.value}
              overFairLine={valueToOverFairLine.get(thisBooksPrice?.value)}
              bankroll={bankroll}
              kelly={kelly}
            />
          </Td>
        );
      })}
    </Tr>
  );
};
