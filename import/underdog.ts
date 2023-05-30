import axios from "axios";
import { PlayerRegistry } from "../analysis/player-registry";
import { findStat } from "../props";
import { League, Prop, PropsPlatform, PropsStat } from "../types";
import { LineChoice } from "../types/lines";

const leagueMap = new Map([
  ["NFL", League.NFL],
  ["NBA", League.NBA],
  ["NHL", League.NHL],
  ["MLB", League.MLB],
  ["WNBA", League.WNBA],
  // ["ESP:ORTY", League.NHL],
  // ["NHL", League.NHL],
]);

export const getUnderdogLines = async (
  league: League,
  playerRegistry: PlayerRegistry
): Promise<Prop[]> => {
  const { data: teamData } = await axios.get(
    "https://stats.underdogfantasy.com/v1/teams"
  );
  const { data } = await axios.get(
    "https://api.underdogfantasy.com/beta/v3/over_under_lines"
  );

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
  data.over_under_lines.forEach((line: any) => {
    const event = events.get(line.over_under.appearance_stat.appearance_id);
    if (!event.game) {
      return;
    }
    const player = event.player;
    const sport = leagueMap.get(player.sport_id);
    if (!sport) {
      unknownLeages.add(player.sport_id);
    }
    if (sport !== league) {
      return;
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
      return;
    }

    // const gameTime = new Date(event.game.scheduled_at).toLocaleString();

    const underProp = new Prop(
      {
        playerName: player.first_name + " " + player.last_name,
        stat,
        value: Number(line.stat_value),
        team: player.team,
        book: PropsPlatform.UNDERDOG,
        choice: LineChoice.UNDER,
        price: -122,
      },
      playerRegistry
    );
    const overProp = new Prop(
      {
        playerName: player.first_name + " " + player.last_name,
        stat,
        value: Number(line.stat_value),
        team: player.team,
        book: PropsPlatform.UNDERDOG,
        choice: LineChoice.OVER,
        price: -122,
      },
      playerRegistry
    );

    props.push(overProp, underProp);
  });
  console.log("Unknown Leagues:", unknownLeages);

  return props;
};
