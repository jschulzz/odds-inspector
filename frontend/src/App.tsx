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
  Tabs,
  Button
} from "@chakra-ui/react";
import "./App.css";
import { EVTable } from "./bet-table/ev/ev-table";
import { PropGroup, GameLineGroup, Market, Book, League } from "./types";
import { ArbitrageTable } from "./bet-table/arbitrage/arbitrage-table";
import { Filters } from "./filters/filters";
import { uniqBy } from "lodash";
import { DFSTable } from "./bet-table/dfs/dfs-table";
import { MiddleTable } from "./bet-table/middle/middle-table";
import { MisvalueTable } from "./bet-table/misvalue/misvalue-table";
import { StatComboTable } from "./bet-table/stat-combos/stat-combo-table";

const DEFAULT_BANKROLL = 2000;
const DEFAULT_KELLY = 0.2;
export const DEFAULT_FAIRLINE = 500;

export type AppliedFilters = {
  book: {
    excluded: Book[];
  };
  game: {
    excluded: string[];
  };
  type: {
    excluded: string[];
  };
  dates: {
    gte?: Date;
    lte?: Date;
  };
  fairLine: {
    gte?: number;
    lte?: number;
  };
};

export type FilterOptions = {
  book: {
    id: Book;
    display: string;
  }[];
  game: {
    league: League;
    id: string;
    display: string;
  }[];
  type: {
    id: string;
    display: string;
  }[];
  dates: {
    min: Date;
    max: Date;
  };
  fairLine: {
    min: number;
    max: number;
  };
  [key: string]: any;
};

export type Boost = {
  book: Book;
  teamAbbreviation?: string;
  league?: League;
  amount: number;
};

function App() {
  const [propGroups, setPropGroups] = useState<PropGroup[]>([]);
  const [sportsbooks, setsSportsbooks] = useState<Book[]>([]);
  const [dfsBooks, setDFSBooks] = useState<Book[]>([]);
  const [dfsLoading, setDFSLoading] = useState(false);
  const [gameLines, setGameLines] = useState<GameLineGroup[]>([]);
  const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
  const [kelly, setKelly] = useState<number>(DEFAULT_KELLY);
  const [allLines, setAllLines] = useState<(GameLineGroup | PropGroup)[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    book: [],
    fairLine: { min: 0, max: DEFAULT_FAIRLINE },
    dates: { min: new Date(), max: new Date() },
    game: [],
    type: []
  });
  const [appliedFilters, setAppliedFilter] = useState<AppliedFilters>({
    book: { excluded: [] },
    game: { excluded: [] },
    type: { excluded: [] },
    fairLine: {},
    dates: {}
  });

  const boosts: Boost[] = [
    // {
    //   amount: 1.5,
    //   league: League.NFL,
    //   book: Book.BETMGM
    // },
    // {
    //   amount: 1.1,
    //   league: League.NCAAB,
    //   book: Book.FANDUEL
    // },
    // {
    //   amount: 1.1,
    //   league: League.NBA,
    //   book: Book.FANDUEL
    // },
    // {
    //   amount: 1.13,
    //   league: League.NBA,
    //   book: Book.DRAFTKINGS
    // },
    // {
    //   amount: 1.07,
    //   league: League.NBA,
    //   book: Book.DRAFTKINGS
    // },
    // {
    //   amount: 1.13,
    //   league: League.NFL,
    //   book: Book.FANDUEL
    // },
  ];

  const getDFS = async () => {
    setDFSLoading(true);
    await fetch("http://localhost:5000/api/import/dfs", {
      method: "POST",
      body: JSON.stringify({ leagues: [League.MLB, League.NFL, League.WNBA] }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    await getProps();
    setDFSLoading(false);
  };

  const getBooks = async () => {
    try {
      const booksResponse = await fetch("http://localhost:5000/api/books");
      const { sportsbooks, dfsBooks }: { sportsbooks: Book[]; dfsBooks: Book[] } =
        await booksResponse.json();
      setsSportsbooks(sportsbooks);
      setDFSBooks(dfsBooks);
    } catch (err) {
      console.error(err);
    }
  };

  const getProps = async () => {
    try {
      const propsResponse = await fetch("http://localhost:5000/api/player-props");
      const propGroups: PropGroup[] = await propsResponse.json();
      // const filteredPropGroups = propGroups.filter((group) => hasEV(group, "prop").hasPositiveEv);
      setPropGroups(propGroups);
      // console.log(filteredPropGroups);
    } catch (err) {
      console.error(err);
    }
  };

  const getGameLines = async () => {
    try {
      const gameLineResponse = await fetch("http://localhost:5000/api/game-lines");
      const lineGroups: GameLineGroup[] = await gameLineResponse.json();
      // const filteredGameLineGroups = lineGroups.filter(
      //   (group) => hasEV(group, "game").hasPositiveEv
      // );
      setGameLines(lineGroups);
      // console.log(filteredGameLineGroups);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    getProps();
    getGameLines();
    getBooks();
  }, []);

  useEffect(() => {
    if (propGroups.length || gameLines.length) {
      const combinedGroups = [...gameLines, ...propGroups];
      setAllLines(combinedGroups);
      console.log(combinedGroups);
      console.log("Setting Original Filter Options");
      setFilterOptions({
        book: [
          ...new Set(
            combinedGroups.flatMap((group) =>
              group.values.flatMap((value) => value.prices.flatMap((price) => price.book))
            )
          )
        ].map((x) => ({ id: x, display: x })),
        game: uniqBy(
          combinedGroups.map((group) => ({
            id: String(group.metadata.game._id),
            league: group.metadata.league,
            display: `${group.metadata.game.awayTeam.abbreviation} @ ${group.metadata.game.homeTeam.abbreviation}`
          })),
          "id"
        ),
        type: [
          { display: Market.MONEYLINE, id: Market.MONEYLINE },
          { display: Market.SPREAD, id: Market.SPREAD },
          { display: Market.TEAM_TOTAL, id: Market.TEAM_TOTAL },
          { display: Market.GAME_TOTAL, id: Market.GAME_TOTAL },
          { display: "Player Prop", id: "prop" }
        ],
        dates: {
          max: new Date(
            Math.max(
              ...combinedGroups.map((group) => new Date(group.metadata.game.gameTime).getTime())
            )
          ),
          min: new Date(
            Math.min(
              ...combinedGroups.map((group) => new Date(group.metadata.game.gameTime).getTime())
            )
          )
        },
        fairLine: {
          max: DEFAULT_FAIRLINE,
          min: 0
        }
      });
    }
  }, [propGroups, gameLines]);

  const handleFilterChange = (returnedFilters: AppliedFilters) => {
    setAppliedFilter({ ...returnedFilters });
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
        <FormControl maxW={200} padding={"1rem"}>
          <Button isDisabled={dfsLoading} onClick={getDFS}>
            {dfsLoading ? "Fetching" : "Fetch DFS"}
          </Button>
        </FormControl>
        <Filters originalOptions={filterOptions} onChange={handleFilterChange} />
      </Box>
      <Tabs>
        <TabList overflowY="hidden" position={"sticky"} top={150} background={"white"} zIndex={1}>
          <Tab>Positive EV</Tab>
          <Tab>Arbs</Tab>
          <Tab>DFS</Tab>
          <Tab>Middle</Tab>
          <Tab>MisValue</Tab>
          <Tab>Stat Combos</Tab>
        </TabList>
        <TabPanels>
          <TabPanel overflowX="scroll">
            <EVTable
              filters={appliedFilters}
              groups={allLines}
              books={sportsbooks}
              bankroll={bankroll}
              kelly={kelly}
              boosts={boosts}
            />
          </TabPanel>
          <TabPanel>
            <ArbitrageTable
              groups={allLines}
              books={sportsbooks}
              filters={appliedFilters}
              boosts={boosts}
            />
          </TabPanel>
          <TabPanel>
            <DFSTable
              filters={appliedFilters}
              groups={propGroups}
              books={dfsBooks}
              bankroll={bankroll}
              kelly={kelly}
            />
          </TabPanel>
          <TabPanel>
            <MiddleTable
              filters={appliedFilters}
              groups={allLines}
              books={[...sportsbooks, ...dfsBooks]}
            />
          </TabPanel>
          <TabPanel>
            <MisvalueTable
              filters={appliedFilters}
              groups={allLines}
              books={[...sportsbooks, ...dfsBooks]}
            />
          </TabPanel>
          <TabPanel>
            <StatComboTable props={propGroups} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </ChakraProvider>
  );
}

export default App;
