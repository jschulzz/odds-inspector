import { useEffect, useState } from "react";
import {
  ChakraProvider,
  FormControl,
  FormLabel,
  Box,
  NumberInput,
  NumberInputField,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs
} from "@chakra-ui/react";
import "./App.css";
import { EVTable } from "./bet-table/ev-table";
import { PropGroup, GameLineGroup, Market, Book } from "./types";
import { calculateEV, getLikelihood, hasEV, probabilityToAmerican } from "./utils/calculations";
import { ArbitrageGameLines } from "./bet-table/arbitrage-table";
import { FilterOptions, Filters } from "./filters/filters";
import { uniqBy } from "lodash";

const DEFAULT_BANKROLL = 2000;
const DEFAULT_KELLY = 0.2;

function App() {
  const [propGroups, setPropGroups] = useState<PropGroup[]>([]);
  const [edgeBooks, setEdgeBooks] = useState<string[]>([]);
  const [gameLines, setGameLines] = useState<GameLineGroup[]>([]);
  const [gameBooks, setGameBooks] = useState<string[]>([]);
  const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
  const [kelly, setKelly] = useState<number>(DEFAULT_KELLY);
  const [allLines, setAllLines] = useState<(GameLineGroup | PropGroup)[]>([]);
  const [filteredLines, setFilteredLines] = useState<(GameLineGroup | PropGroup)[]>([]);

  useEffect(() => {
    const getProps = async () => {
      try {
        const propsResponse = await fetch("http://localhost:5000/api/player-props");
        const { propGroups, books }: { propGroups: PropGroup[]; books: string[] } =
          await propsResponse.json();
        const filteredPropGroups = propGroups.filter((group) => hasEV(group, "prop").hasPositiveEv);
        setEdgeBooks(books);
        setPropGroups(filteredPropGroups);
      } catch (err) {
        console.error(err);
      }
    };

    const getGameLines = async () => {
      try {
        const gameLineResponse = await fetch("http://localhost:5000/api/game-lines");
        const { lineGroups, books }: { lineGroups: GameLineGroup[]; books: string[] } =
          await gameLineResponse.json();
        const filteredGameLineGroups = lineGroups.filter(
          (group) => hasEV(group, "game").hasPositiveEv
        );
        setGameBooks(books);
        setGameLines(filteredGameLineGroups);
      } catch (err) {
        console.error(err);
      }
    };
    console.log("once");
    getProps();
    getGameLines();
  }, []);

  useEffect(() => {
    const combinedGroups = [...gameLines, ...propGroups].sort((a, b) => {
      return Math.max(
        ...[
          ...a.values.flatMap((v) => {
            const fairline = probabilityToAmerican(
              getLikelihood(v.prices, a.metadata.league, "over", "game")
            );
            return v.prices.map((price) => calculateEV(price.overPrice, fairline));
          }),
          ...a.values.flatMap((v) => {
            const fairline = probabilityToAmerican(
              getLikelihood(v.prices, a.metadata.league, "under", "game")
            );
            return v.prices.map((price) => calculateEV(price.underPrice, fairline));
          })
        ]
      ) <
        Math.max(
          ...[
            ...b.values.flatMap((v) => {
              const fairline = probabilityToAmerican(
                getLikelihood(v.prices, b.metadata.league, "over", "game")
              );
              return v.prices.map((price) => calculateEV(price.overPrice, fairline));
            }),
            ...b.values.flatMap((v) => {
              const fairline = probabilityToAmerican(
                getLikelihood(v.prices, b.metadata.league, "under", "game")
              );
              return v.prices.map((price) => calculateEV(price.underPrice, fairline));
            })
          ]
        )
        ? 1
        : -1;
    });
    setAllLines(combinedGroups);
    setFilteredLines(combinedGroups);
  }, [gameLines, propGroups]);

  const filterOptions: FilterOptions[] = [
    {
      id: "league",
      display: "League",
      options: [...new Set(allLines.map((x) => x.metadata.league))].map((league) => ({
        id: league,
        display: league.toUpperCase()
      }))
    },
    {
      id: "game",
      display: "Game",
      options: uniqBy(allLines, "metadata.game._id").map((group) => {
        const id = String(group.metadata.game._id);
        const display = `${group.metadata.game.awayTeam.abbreviation} @ ${group.metadata.game.homeTeam.abbreviation}`;
        return {
          id,
          display
        };
      })
    },
    {
      id: "book",
      display: "Book",
      options: [
        ...new Set(
          allLines.flatMap((group) =>
            group.values.flatMap((value) => value.prices.flatMap((price) => price.book))
          )
        )
      ].map((book) => ({
        id: book,
        display: book
      }))
    },
    {
      id: "type",
      display: "Type",
      options: [
        { display: Market.MONEYLINE, id: Market.MONEYLINE },
        { display: Market.SPREAD, id: Market.SPREAD },
        { display: Market.TEAM_TOTAL, id: Market.TEAM_TOTAL },
        { display: Market.GAME_TOTAL, id: Market.GAME_TOTAL },
        { display: "Player Prop", id: "prop" }
      ]
    }
  ];

  const handleFilterChange = (x: any) => {
    setFilteredLines(
      allLines.filter(
        (group) =>
          x.game.includes(group.metadata.game._id) &&
          x.league.includes(group.metadata.league) &&
          (x.type.includes((group as GameLineGroup).metadata.type) ||
            (x.type.includes("prop") && (group as PropGroup).metadata.player)) &&
          x.book.some((book: Book) =>
            hasEV(
              group,
              (group as PropGroup).metadata.player ? "prop" : "game"
            ).positiveEvBooks.includes(book)
          )
      )
    );
    console.log(x);
  };

  return (
    <ChakraProvider>
      <Box
        display={"flex"}
        position={"sticky"}
        top={0}
        background={"white"}
        zIndex={2}
        height={150}
      >
        <FormControl maxW={200} padding={"1rem"}>
          <FormLabel>Bankroll</FormLabel>
          <NumberInput defaultValue={DEFAULT_BANKROLL} onChange={(_a, n) => setBankroll(n)}>
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl maxW={200} padding={"1rem"}>
          <FormLabel>Kelly Multiplier</FormLabel>
          <NumberInput defaultValue={DEFAULT_KELLY} onChange={(_a, n) => setKelly(n)}>
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <Filters options={filterOptions} onChange={handleFilterChange} />
      </Box>
      <Tabs>
        <TabList overflowY="hidden" position={"sticky"} top={150} background={"white"} zIndex={1}>
          <Tab>Positive EV</Tab>
          <Tab>Arbs</Tab>
        </TabList>
        <TabPanels>
          <TabPanel overflowX="scroll">
            <EVTable groups={filteredLines} books={edgeBooks} bankroll={bankroll} kelly={kelly} />
          </TabPanel>
          <TabPanel>
            <ArbitrageGameLines
              gameLines={gameLines}
              books={gameBooks}
              bankroll={bankroll}
              kelly={kelly}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </ChakraProvider>
  );
}

export default App;
