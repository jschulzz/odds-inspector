import axios from "axios";
import fs from "fs";
import path from "path";
import { PlayerRegistry } from "../analysis/player-registry";
import { findStat } from "../props";
import { League, Prop, PropsPlatform, PropsStat } from "../types";
import { LineChoice } from "../types/lines";

// const leagueMap = new Map([
//   [League.NFL, 9],
//   [League.MLB, 2],
//   [League.NCAAF, 15],
//   [League.WNBA, 3],
//   [League.NHL, 8],
//   [League.NBA, 7],
// ]);

export const getPrizePicksLines = async (
  league: League,
  playerRegistry: PlayerRegistry
) => {
  const datastorePath = path.join(__dirname, "../backups/prizepicks");
  const linesFilename = `${datastorePath}/${league}.json`;

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

  const { data, included } = JSON.parse(
    fs.readFileSync(linesFilename).toString()
  );

  const fixtureArray = included;
  const fixtures: {
    stat_types: any[];
    players: any[];
    leagues: any[];
    projection_types: any[];
  } = {
    stat_types: [],
    players: [],
    leagues: [],
    projection_types: [],
  };
  fixtureArray.forEach((fixture: any) => {
    if (fixture.type === "new_player") {
      fixtures.players.push(fixture);
    } else if (fixture.type === "stat_type") {
      fixtures.stat_types.push(fixture);
    } else if (fixture.type === "projection_type") {
      fixtures.projection_types.push(fixture);
    } else if (fixture.type === "league") {
      fixtures.leagues.push(fixture);
    } else {
      console.log(fixture.type);
    }
  });
  let props: Prop[] = [];

  data.forEach((projection: any) => {
    const player = fixtures.players.find(
      (p) => p.id === projection.relationships.new_player.data.id
    );
    let stat = findStat(projection.attributes.stat_type);
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

    const value =
      projection.attributes.flash_sale_line_score ||
      projection.attributes.line_score;
    const standard = {
      playerName: player.attributes.name,
      team: player.attributes.team,
      stat,
      value,
      book: PropsPlatform.PRIZEPICKS,
      price: -119,
    };
    const overProp = new Prop(
      {
        ...standard,
        choice: LineChoice.OVER,
      },
      playerRegistry
    );
    const underProp = new Prop(
      {
        ...standard,
        choice: LineChoice.UNDER,
      },
      playerRegistry
    );
    const existingProps = props.filter((p) => {
      return (
        p.player === standard.playerName &&
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
