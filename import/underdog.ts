import axios from "axios";
import { findStat } from "../props";
import { League, Prop, PropsPlatform, PropsStat } from "../types";
import { LineChoice } from "../types/lines";
import { PlayerManager } from "../database/mongo.player";
import { GameManager } from "../database/mongo.game";
import { PlayerPropManager } from "../database/mongo.player-prop";
import { PriceManager } from "../database/mongo.price";

const leagueMap = new Map([
  ["NFL", League.NFL],
  ["NBA", League.NBA],
  ["NHL", League.NHL],
  ["MLB", League.MLB],
  ["WNBA", League.WNBA]
  // ["ESPORTS", League.NHL],
]);

export const getUnderdogLines = async (league: League): Promise<Prop[]> => {
  const { data: teamData } = await axios.get("https://stats.underdogfantasy.com/v1/teams");
  const { data } = await axios.get("https://api.underdogfantasy.com/beta/v3/over_under_lines");

  const gameManager = new GameManager();
  const priceManager = new PriceManager();
  const playerPropManager = new PlayerPropManager();
  const playerManager = new PlayerManager();

  // console.log(teamData);

  const players = new Map();
  const events = new Map();
  const unknownLeages = new Set();
  const props: Prop[] = [];
  data.players.forEach((player: any) => {
    const teamObject = teamData.teams.find((t: any) => t.id === player.team_id);
    // if (!teamObject) {
    //   console.log(teamData.teams, player);
    // }
    const team = teamObject?.abbr || "";
    players.set(player.id, { ...player, team });
  });
  data.appearances.forEach((event: any) => {
    const player = players.get(event.player_id);
    const game = data.games.find((g: any) => g.id === event.match_id);
    events.set(event.id, { ...event, player, game });
  });
  for (const line of data.over_under_lines) {
    const event = events.get(line.over_under.appearance_stat.appearance_id);
    if (!event.game) {
      continue;
    }
    const player = event.player;
    const sport = leagueMap.get(player.sport_id);
    if (!sport) {
      unknownLeages.add(player.sport_id);
    }
    if (sport !== league) {
      continue;
    }
    let stat = findStat(line.over_under.appearance_stat.display_stat);
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

    const underProp = await Prop.createProp(
      {
        playerName: player.first_name + " " + player.last_name,
        stat,
        value: Number(line.stat_value),
        team: player.team,
        book: PropsPlatform.UNDERDOG,
        choice: LineChoice.UNDER,
        price: -122,
        league
      },
      playerManager
    );
    const overProp = await Prop.createProp(
      {
        playerName: player.first_name + " " + player.last_name,
        stat,
        value: Number(line.stat_value),
        team: player.team,
        book: PropsPlatform.UNDERDOG,
        choice: LineChoice.OVER,
        price: -122,
        league
      },
      playerManager
    );
    let game, dbPlayer;
    try {
      game = await gameManager.findByTeamAbbr(player.team, league);
    } catch {
      console.error("Could not find game");
      continue;
    }
    try {
      dbPlayer = await playerManager.findByName(player.first_name + " " + player.last_name, league);
    } catch {
      console.error("Could not find player");
      continue;
    }

    const dbProp = await playerPropManager.upsert(
      dbPlayer,
      game,
      league,
      stat,
      Number(line.stat_value)
    );

    await priceManager.upsertPlayerPropPrice(dbProp, PropsPlatform.UNDERDOG, {
      overPrice: -122,
      underPrice: -122
    });

    props.push(overProp, underProp);
  }
  console.log("Unknown Leagues:", unknownLeages);

  return props;
};
