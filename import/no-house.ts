import axios from "axios";
import fs from "fs";
import path from "path";
import { findStat } from "../props";
import { NO_HOUSE_KEY } from "../secrets";
import { League, Prop, PropsPlatform, PropsStat } from "../types";
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

  let props: Prop[] = [];

  data
    .filter((x: any) => x.league.toLowerCase() === league)
    .forEach((prop: any) => {
      const player = prop.player1.name;
      let stat = findStat(prop.player_spreads);
      if (league === League.NHL) {
        if (stat === PropsStat.POINTS) {
          stat = PropsStat.HOCKEY_POINTS;
        }
        if (stat === PropsStat.ASSISTS) {
          stat = PropsStat.HOCKEY_ASSISTS;
        }
      }
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
      const existingProps = props.filter((p) => {
        return (
          p.player === standard.player &&
          p.stat === standard.stat &&
          p.value !== standard.value
        );
      });
      let newProps = [overProp, underProp];
      if (existingProps.length) {
        if (existingProps[0].value > standard.value) {
          console.log("Found a better one");
          props = props.filter((p) => !existingProps.includes(p));
        } else {
          console.log("Better one already exists");
          newProps = [underProp];
        }
      }
      props.push(...newProps);
    });
  return props;
};

// getPrizePicksLines('mlb').then(console.log);
