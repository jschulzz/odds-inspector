import fs from "fs";
import path from "path";
import { findStat } from "../props";
import { League, Prop, PropsPlatform, PropsStat } from "../types";
import { LineChoice } from "../types/lines";
import { PlayerManager } from "../database/mongo.player";
import { GameManager } from "../database/mongo.game";
import { PlayerPropManager } from "../database/mongo.player-prop";
import { PriceManager } from "../database/mongo.price";

export const getPrizePicksLines = async (league: League) => {
  const datastorePath = path.join(__dirname, "../backups/prizepicks");
  const linesFilename = `${datastorePath}/${league}.json`;

  const gameManager = new GameManager();
  const priceManager = new PriceManager();
  const playerPropManager = new PlayerPropManager();
  const playerManager = new PlayerManager();

  const { data, included } = JSON.parse(fs.readFileSync(linesFilename).toString());

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
    projection_types: []
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
  const projections = [...data];
  projections.sort(
    (a, b) => a.attributes.flash_sale_line_score - b.attributes.flash_sale_line_score
  );
  for (const projection of projections) {
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
      continue;
    }

    let isFlashSale = !!projection.attributes.flash_sale_line_score;

    const value = projection.attributes.flash_sale_line_score || projection.attributes.line_score;

    const standard = {
      playerName: player.attributes.name,
      team: player.attributes.team,
      stat,
      value,
      book: PropsPlatform.PRIZEPICKS,
      price: -119,
      league
    };
    const overProp = await Prop.createProp(
      {
        ...standard,
        choice: LineChoice.OVER
      },
      playerManager
    );
    const underProp = await Prop.createProp(
      {
        ...standard,
        choice: LineChoice.UNDER
      },
      playerManager
    );
    let game, dbPlayer;
    try {
      game = await gameManager.findByTeamAbbr(player.attributes.team, league);
    } catch {
      console.error("Could not find game");
      continue;
    }
    try {
      dbPlayer = await playerManager.findByName(player.attributes.name, league);
    } catch {
      console.error("Could not find player");
      continue;
    }
    const dbProp = await playerPropManager.upsert(dbPlayer, game, league, stat, value);

    await priceManager.upsertPlayerPropPrice(dbProp, PropsPlatform.PRIZEPICKS, {
      overPrice: -119,
      underPrice: -119
    });
    const existingProps = props.filter((p) => {
      return p.player === overProp.player && p.stat === standard.stat && p.value !== standard.value;
    });
    let newProps = [overProp, underProp];
    if (existingProps.length) {
      if (isFlashSale) {
        console.log("Found a better one", overProp.value);
        props = props.filter((p) => !existingProps.includes(p));
      } else {
        console.log("Better one already exists");
        newProps = [underProp];
      }
    }
    props.push(...newProps);
  }
  return props;
};

// getPrizePicksLines('mlb').then(console.log);
