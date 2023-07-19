import { useEffect, useState } from "react";
import { ChakraProvider, Divider, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import "./App.css";
import { PropTable } from "./bet-table/prop-table";
import { MisvaluedPlay, Play } from "../../db-analysis/player-props";
import { GameLinePlay } from "../../db-analysis/game-lines";
import { GameLineTable } from "./bet-table/gameline-table";

function App() {
  const [edgeBets, setEdgeBets] = useState<Play[]>([]);
  const [edgeBooks, setEdgeBooks] = useState<string[]>([]);
  const [misvalueBets, setMisvalueBets] = useState<MisvaluedPlay[]>([]);
  const [misvalueBooks, setMisvalueBooks] = useState<string[]>([]);
  const [gameBets, setGameBets] = useState<GameLinePlay[]>([]);
  const [gameBooks, setGameBooks] = useState<string[]>([]);

  useEffect(() => {
    const getEdges = async () => {
      try {
        const edgeResponse = await fetch("http://localhost:5000/api/player-props/edge");
        const { bets: edgeBets, books: edgeBooks }: { bets: Play[]; books: string[] } =
          await edgeResponse.json();
        edgeBets.sort((a, b) => (a.EV < b.EV ? 1 : -1));
        setEdgeBets(edgeBets);

        setEdgeBooks(edgeBooks);
      } catch (err) {
        console.error(err);
      }
    };
    const getMisValues = async () => {
      try {
        const misvalueResponse = await fetch("http://localhost:5000/api/player-props/misvalue");
        const {
          bets: misvalueBets,
          books: misvalueBooks
        }: { bets: MisvaluedPlay[]; books: string[] } = await misvalueResponse.json();
        setMisvalueBets(misvalueBets);

        setMisvalueBooks(misvalueBooks);
      } catch (err) {
        console.error(err);
      }
    };
    const getGameLines = async () => {
      try {
        const gameLineResponse = await fetch("http://localhost:5000/api/game-lines/edge");
        const { bets, books }: { bets: GameLinePlay[]; books: string[] } =
          await gameLineResponse.json();
        bets.sort((a, b) => (a.EV < b.EV ? 1 : -1));
        setGameBets(bets);

        setGameBooks(books);
      } catch (err) {
        console.error(err);
      }
    };
    getEdges();
    getMisValues();
    getGameLines();
  }, []);

  return (
    <ChakraProvider>
      <Tabs>
        <TabList overflowX="hidden">
          <Tab>Player Props</Tab>
          <Tab>Game Lines</Tab>
        </TabList>
        <TabPanels>
          <TabPanel overflowX="scroll">
            <PropTable bets={edgeBets} books={edgeBooks} type="edge" />
            <Divider />
            <PropTable bets={misvalueBets} books={misvalueBooks} type="misvalue" />
          </TabPanel>
          <TabPanel>
            <GameLineTable bets={gameBets} books={gameBooks} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </ChakraProvider>
  );
}

export default App;
