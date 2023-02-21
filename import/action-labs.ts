import axios from "axios";
import { Book, League, Prop, PropsStat } from "../types";
import { LineChoice } from "../types/lines";

const bookMap = new Map([
  [108, Book.FANDUEL],
  [114, Book.BETMGM],
  [15, Book.DRAFTKINGS],
  [122, Book.BETRIVERS],
  [115, Book.POINTSBET],
  [113, Book.UNIBET],
]);

const leagueMap = new Map([
  [League.NFL, "NFL"],
  [League.NHL, "NHL"],
  [League.MLB, "MLB"],
  [League.NBA, "NBA"],
]);

const statMap = new Map([
  [32, PropsStat.SINGLES],
  [33, PropsStat.HOME_RUNS],
  [34, PropsStat.RBIS],
  [35, PropsStat.DOUBLES],
  [36, PropsStat.HITS],
  [37, PropsStat.STRIKEOUTS],
  [42, PropsStat.PITCHING_OUTS],
  [72, PropsStat.HITS_ALLOWED],
  [73, PropsStat.STOLEN_BASES],
  [74, PropsStat.EARNED_RUNS],
  [76, PropsStat.WALKS],
  [77, PropsStat.TOTAL_BASES],
  [78, PropsStat.RUNS],

  [9, PropsStat.PASSING_YARDS],
  [10, PropsStat.PASS_COMPLETIONS],
  [11, PropsStat.PASSING_TDS],
  [12, PropsStat.RUSHING_YARDS],
  [15, PropsStat.RECEPTIONS],
  [16, PropsStat.RECEIVING_YARDS],
  [18, PropsStat.RUSH_ATTEMPTS],
  [30, PropsStat.PASS_ATTEMPTS],
  [43, PropsStat.KICKING_POINTS],
  [58, PropsStat.LONGEST_RUSH],
  [59, PropsStat.LONGEST_RECEPTION],
  [60, PropsStat.LONGEST_PASSING_COMPLETION],
  [65, PropsStat.INTERCEPTIONS],
  [66, PropsStat.RECEIVING_RUSHING_YARDS],

  [31, PropsStat.SHOTS_ON_GOAL],
  [38, PropsStat.SAVES],
  [55, PropsStat.POWER_PLAY_POINTS],
  [279, PropsStat.ASSISTS],
  [280, PropsStat.GOALS_PLUS_ASSISTS],

  [21, PropsStat.THREE_POINTERS_MADE],
  [23, PropsStat.REBOUNDS],
  [24, PropsStat.STEALS],
  [25, PropsStat.BLOCKS],
  [26, PropsStat.ASSISTS],
  [27, PropsStat.POINTS],
  [85, PropsStat.PRA],
  [86, PropsStat.POINTS_PLUS_REBOUNDS],
  [87, PropsStat.POINTS_PLUS_ASSISTS],
  [88, PropsStat.REBOUNDS_PLUS_ASSISTS],
  [89, PropsStat.STEALS_PLUS_BLOCKS],
]);

export const getActionLabsProps = async (league: League): Promise<Prop[]> => {
  const props: Prop[] = [];

  const leagueID = leagueMap.get(league);
  if (!leagueID) {
    console.log("Unknown league", league);
    return props;
  }

  const { data: eventData } = await axios.get(
    "https://d3ttxfuywgi7br.cloudfront.net/events/default.json?initialRequest=true&xid=105b71d4-945d-40f0-9168-c9460dcf46d0"
  );
  const { data: playerData } = await axios.get(
    "https://d3ttxfuywgi7br.cloudfront.net/players/projections/all/actionnetwork/default.json"
  );

  const { events } = eventData;

  for (const bookId of bookMap.keys()) {
    const book = bookMap.get(bookId);
    if (!book) {
      continue;
    }
    const { data } = await axios.get(
      `https://d3ttxfuywgi7br.cloudfront.net/odds/${bookId}/default.json`
    );
    data.forEach((line: any) => {
      const correspondingEvent = events[line.eventId];
      if (!correspondingEvent) {
        return;
      }
      if (correspondingEvent.league.short_name === leagueID) {
        const outcomes = Object.values(line.lines);
        outcomes.forEach((outcome: any) => {
          const keyValues = outcome.key.split(":");
          const [playerId] = keyValues.at(-2).split(".");
          const player: any = Object.values(playerData).find(
            (p: any) => p.playerId === Number(playerId)
          );
          const choice = new Map([
            ["over", LineChoice.OVER],
            ["under", LineChoice.UNDER],
          ]).get(keyValues.at(-1));
          if (!choice || !player) {
            return;
          }
          const team = correspondingEvent.event_teams.find(
            (t: any) => t.team.team_id === player.teamId
          );
          const stat = statMap.get(Number(keyValues[2]));
          if (!stat) {
            console.log("Unknown Stat", keyValues[2]);
            return;
          }
          if (!team) {
            return;
          }
          const price = outcome.money;

          const prop: Prop = {
            price,
            stat,
            value: outcome.line,
            choice,
            book,
            player: player.name,
            team: team.team.short_name,
          };
          // if (book === Book.DRAFTKINGS && player.name.includes("Segura")) {
          //   console.log(keyValues[2], prop);
          // }
          props.push(prop);
        });
      }
    });
  }
  return props;
};
