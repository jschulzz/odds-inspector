import axios from "axios";
import { findStat } from "../props";
import { League, Prop, PropsPlatform } from "../types";
import { LineChoice } from "../types/lines";

const leagueMap = new Map([
  ["NFL", League.NFL],
  ["NBA", League.NBA],
  ["NHL", League.NHL],
  ["MLB", League.MLB],
  // ["ESP:ORTY", League.NHL],
  // ["NHL", League.NHL],
]);

export const getUnderdogLines = async (league: League): Promise<Prop[]> => {
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
    const stat = findStat(line.over_under.appearance_stat.display_stat);
    if (!stat) {
      return;
    }

    // const gameTime = new Date(event.game.scheduled_at).toLocaleString();
    props.push({
      player: player.first_name + " " + player.last_name,
      stat,
      value: Number(line.stat_value),
      team: player.team,
      book: PropsPlatform.UNDERDOG,
      choice: LineChoice.UNDER,
      price: 0,
    });
    props.push({
      player: player.first_name + " " + player.last_name,
      stat,
      value: Number(line.stat_value),
      team: player.team,
      book: PropsPlatform.UNDERDOG,
      choice: LineChoice.OVER,
      price: 0,
    });
  });
  console.log("Unknown Leagues:", unknownLeages);

  return props;
};
