import axios from "axios";
import fs from "fs";
import path from "path";
import { findStat } from "../props";
import { NO_HOUSE_KEY } from "../secrets";
import { League, Prop, PropsPlatform } from "../types";
import { LineChoice } from "../types/lines";

export const getNoHouse = async (league: League) => {
  const datastorePath = path.join(__dirname, "../backups/no-house");
  const linesFilename = `${datastorePath}/data.json`;

  try {
    const url = `https://webadmin.nohouseadvantage.com/api/thehousecontest/get-contest`;
    const { data } = await axios.post(
      url,
      { timezone: "America/New_York", type: 1 },
      {
        headers: {
          authorization: NO_HOUSE_KEY,
        },
      }
    );
    fs.mkdirSync(datastorePath, { recursive: true });

    fs.writeFileSync(linesFilename, JSON.stringify(data, null, 4));
  } catch (e) {
    // @ts-ignore
    console.error(e.response);
    console.log("Couldn't request new No House lines. Using saved lines");
  }

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
