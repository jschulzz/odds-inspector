import axios from "axios";
import fs from "fs";
import path from "path";
import { findStat } from "../props";
import { League, Prop, PropsPlatform } from "../types";
import { LineChoice } from "../types/lines";

// const leagueMap = new Map([
//   [League.NFL, 9],
//   [League.MLB, 2],
//   [League.NCAAF, 15],
//   [League.WNBA, 3],
//   [League.NHL, 8],
//   [League.NBA, 7],
// ]);

export const getNoHouse = async (league: League) => {
  const datastorePath = path.join(__dirname, "../backups/no-house");
  const linesFilename = `${datastorePath}/data.json`;

  // const MARKET_ID = leagueMap.get(league);
  // try {
  //   const url = `https://cors-anywhere.herokuapp.com/https://api.prizepicks.com/projections?league_id=${MARKET_ID}`;
  //   const { data } = await axios.get(url, {
  //     headers: {
  //       origin: "app.prizepicks.com",
  //     },
  //   });
  //   fs.mkdirSync(datastorePath, { recursive: true });

  //   fs.writeFileSync(linesFilename, JSON.stringify(data, null, 4));
  // } catch (e) {
  //   console.error(e);
  //   console.log("Couldn't request new PP lines. Using saved lines");
  // }

  const { data } = JSON.parse(fs.readFileSync(linesFilename).toString());

  const props: Prop[] = [];

  data
    .filter((x: any) => x.league.toLowerCase() === league)
    .forEach((prop: any) => {
      const player = prop.player1.name;
      const stat = findStat(prop.player_spreads);
      if (!stat) {
        return;
      }
      const value = +prop.player1.points;
      const standard = {
        player,
        team: prop.player1.team,
        stat,
        value,
        book: PropsPlatform.NO_HOUSE,
        price: -119,
      };
      const overProp: Prop = {
        ...standard,
        choice: LineChoice.OVER,
      };
      const underProp: Prop = {
        ...standard,
        choice: LineChoice.UNDER,
      };
      props.push(overProp, underProp);
    });
  return props;
};

// getPrizePicksLines('mlb').then(console.log);
