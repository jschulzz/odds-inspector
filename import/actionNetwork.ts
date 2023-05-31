import axios from "axios";
import { PlayerRegistry } from "../analysis/player-registry";
import { findBook } from "../books";
import {
  Book,
  League,
  Moneyline,
  Period,
  Prop,
  PropsStat,
  SourcedOdds,
} from "../types";
import { GameTotal, LineChoice, Spread, TeamTotal } from "../types/lines";
import { TeamManager } from "../database/team-manager";
import { Team } from "../database/team";
import { Game } from "../database/game";

const newYorkActionNetworkSportsBookMap = new Map([
  [972, Book.BETRIVERS],
  [973, Book.POINTSBET],
  [1006, Book.FANDUEL],
  [974, Book.WYNNBET],
  [1005, Book.CAESARS],
  // [15, Book.CAESARS],
  [68, Book.DRAFTKINGS],
  [939, Book.BETMGM],
  [347, Book.BETMGM],
  [266, Book.TWINSPIRES],
]);
const newYorkActionNetworkSportsbooks = [972, 973, 1006, 974, 939, 68, 266];

const leagueMap = new Map([
  [League.NBA, "nba?"],
  [League.WNBA, "wnba?"],
  [League.NCAAB, "ncaab?division=D1&"],
  [League.NCAAF, "ncaaf?"],
  [League.NHL, "nhl?"],
  [League.MLB, "mlb?"],
  [League.NFL, "nfl?"],
  [League.TENNIS, "atp?period=competition&"],
  [League.UFC, "ufc?period=competition&"],
]);

const periodMap = new Map([
  ["game", Period.FULL_GAME],
  ["competition", Period.FULL_GAME],
  ["firsthalf", Period.FIRST_HALF],
  ["firstquarter", Period.FIRST_QUARTER],
  ["firstperiod", Period.FIRST_PERIOD],
  ["secondperiod", Period.SECOND_PERIOD],
  ["thirdperiod", Period.THIRD_PERIOD],
]);

export const getActionNetworkLines = async (
  league: League
): Promise<SourcedOdds> => {
  const teamManager = new TeamManager();
  const leagueKey = leagueMap.get(league);
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  let dd = today.getDate().toString().padStart(2, "0");
  const startDate = `${yyyy}${mm}${dd}`;
  if (!leagueKey) {
    throw new Error("Unknown league");
  }

  const url = `https://api.actionnetwork.com/web/v1/scoreboard/${leagueKey}bookIds=15,30,1006,939,68,973,972,1005,974,1902,1903,76&date=${startDate}`;
  const { data } = await axios.get(url);
  const lines: SourcedOdds = {
    moneylines: [],
    spreads: [],
    teamTotals: [],
    gameTotals: [],
  };

  const useFullName = ["nfl", "mlb", "wnba", "nhl"].includes(league);

  const dataSet = data.games || data.competitions;
  for (let i = 0; i < dataSet.length; i++) {
    const gameRecord = dataSet[i];
    const opponents = gameRecord.competitors || gameRecord.teams;
    const homeTeamObj = opponents.find(
      (team: any) => team.id === gameRecord.home_team_id || team.side === "home"
    );
    const awayTeamObj = opponents.find(
      (team: any) => team.id === gameRecord.away_team_id || team.side === "away"
    );

    if (league === League.TENNIS || league === League.UFC) {
      homeTeamObj.display_name = homeTeamObj.player.full_name;
      awayTeamObj.display_name = awayTeamObj.player.full_name;
    }

    const homeTeamName = useFullName
      ? homeTeamObj.full_name
      : homeTeamObj.display_name;
    const awayTeamName = useFullName
      ? awayTeamObj.full_name
      : awayTeamObj.display_name;

    let homeTeam = await teamManager.find(homeTeamName, league);
    if (!homeTeam) {
      homeTeam = new Team({ name: homeTeamName, league });
      await teamManager.add(homeTeam);
    }
    let awayTeam = await teamManager.find(awayTeamName, league);
    if (!awayTeam) {
      awayTeam = new Team({ name: awayTeamName, league });
      await teamManager.add(awayTeam);
    }

    if (!gameRecord.odds) {
      continue;
    }

    const game = new Game({
      homeTeam,
      awayTeam,
      league,
      gameTime: gameRecord.start_time,
    });

    gameRecord.odds
      .filter((odds: any) => odds.meta)
      .filter((odds: any) =>
        newYorkActionNetworkSportsbooks.includes(odds.book_id)
      )
      .forEach((odds: any) => {
        const period = periodMap.get(odds.type);
        const book = newYorkActionNetworkSportsBookMap.get(odds.book_id);
        if (!book || !period) {
          return;
        }
        const gameData = {
          game,
          period,
          book,
        };
        const homeMoneyline = new Moneyline({
          ...gameData,
          price: odds.ml_home,
          otherOutcomePrice: odds.ml_away,
          choice: LineChoice.HOME,
        });
        const awayMoneyline = new Moneyline({
          ...gameData,
          price: odds.ml_away,
          otherOutcomePrice: odds.ml_home,
          choice: LineChoice.AWAY,
        });
        const homeSpread = new Spread({
          ...gameData,
          price: odds.spread_home_line,
          otherOutcomePrice: odds.spread_away_line,
          choice: LineChoice.HOME,
          value: odds.spread_home,
        });
        const awaySpread = new Spread({
          ...gameData,
          price: odds.spread_away_line,
          otherOutcomePrice: odds.spread_home_line,
          choice: LineChoice.AWAY,
          value: odds.spread_away,
        });
        const overGameTotal = new GameTotal({
          ...gameData,
          price: odds.over,
          otherOutcomePrice: odds.under,
          choice: LineChoice.OVER,
          value: odds.total,
        });
        const underGameTotal = new GameTotal({
          ...gameData,
          price: odds.under,
          otherOutcomePrice: odds.over,
          choice: LineChoice.UNDER,
          value: odds.total,
        });
        const overHomeTotal = new TeamTotal({
          ...gameData,
          price: odds.home_over,
          otherOutcomePrice: odds.home_under,
          choice: LineChoice.OVER,
          side: "home",
          value: odds.home_total,
        });
        const underHomeTotal = new TeamTotal({
          ...gameData,
          price: odds.home_under,
          otherOutcomePrice: odds.home_over,
          choice: LineChoice.UNDER,
          side: "home",
          value: odds.home_total,
        });
        const overAwayTotal = new TeamTotal({
          ...gameData,
          price: odds.away_over,
          otherOutcomePrice: odds.home_under,
          choice: LineChoice.OVER,
          side: "away",
          value: odds.away_total,
        });
        const underAwayTotal = new TeamTotal({
          ...gameData,
          price: odds.away_under,
          otherOutcomePrice: odds.home_over,
          choice: LineChoice.UNDER,
          side: "away",
          value: odds.home_total,
        });

        lines.moneylines.push(homeMoneyline, awayMoneyline);
        lines.spreads.push(homeSpread, awaySpread);
        lines.gameTotals.push(overGameTotal, underGameTotal);
        lines.teamTotals.push(
          overHomeTotal,
          overAwayTotal,
          underHomeTotal,
          underAwayTotal
        );
      });
  }
  return lines;
};

export const getActionNetworkProps = async (
  league: League,
  playerRegistry: PlayerRegistry
) => {
  const leagueKey = leagueMap.get(league);

  if (!leagueKey) {
    throw new Error("Unknown league");
  }

  const leagueIdMap = new Map([
    [League.WNBA, 5],
    [League.NBA, 4],
    [League.NFL, 1],
    [League.NHL, 3],
    [League.MLB, 8],
  ]);

  const propEndpointMap = new Map([
    [PropsStat.THREE_POINTERS_MADE, "core_bet_type_21_3fgm"],
    [PropsStat.ASSISTS, "core_bet_type_26_assists"],
    [PropsStat.BLOCKS, "core_bet_type_25_blocks"],
    [PropsStat.DOUBLE_DOUBLE, "core_bet_type_113_double-double"],
    [PropsStat.POINTS, "core_bet_type_27_points"],
    [PropsStat.POINTS_PLUS_ASSISTS, "core_bet_type_87_points_assists"],
    [PropsStat.POINTS_PLUS_REBOUNDS, "core_bet_type_86_points_rebounds"],
    [PropsStat.PRA, "core_bet_type_85_points_rebounds_assists"],
    [PropsStat.REBOUNDS, "core_bet_type_23_rebounds"],
    [PropsStat.REBOUNDS_PLUS_ASSISTS, "core_bet_type_88_rebounds_assists"],
    [PropsStat.STEALS, "core_bet_type_24_steals"],
    [PropsStat.STEALS_PLUS_BLOCKS, "core_bet_type_89_steals_blocks"],

    [PropsStat.SHOTS_ON_GOAL, "core_bet_type_31_shots_on_goal"],
    [PropsStat.SAVES, "core_bet_type_38_goaltender_saves"],
    [PropsStat.HOCKEY_ASSISTS, "core_bet_type_279_assists"],
    [PropsStat.HOCKEY_POINTS, "core_bet_type_280_points"],

    [PropsStat.WALKS, "core_bet_type_76_walks"],
    [PropsStat.DOUBLES, "core_bet_type_35_doubles"],
    [PropsStat.EARNED_RUNS, "core_bet_type_74_earned_runs"],
    [PropsStat.HITS, "core_bet_type_36_hits"],
    [PropsStat.HOME_RUNS, "core_bet_type_33_hr"],
    [PropsStat.STRIKEOUTS, "core_bet_type_37_strikeouts"],
    [PropsStat.PITCHING_OUTS, "core_bet_type_42_pitching_outs"],
    [PropsStat.RBIS, "core_bet_type_34_rbi"],
    [PropsStat.RUNS, "core_bet_type_78_runs_scored"],
    [PropsStat.STOLEN_BASES, "core_bet_type_73_stolen_bases"],
    [PropsStat.SINGLES, "core_bet_type_32_singles"],
    [PropsStat.TOTAL_BASES, "core_bet_type_77_total_bases"],
  ]);

  const leaguePropsMap = new Map([
    [League.WNBA, [PropsStat.POINTS, PropsStat.REBOUNDS, PropsStat.ASSISTS]],
    [
      League.NBA,
      [
        PropsStat.THREE_POINTERS_MADE,
        PropsStat.ASSISTS,
        PropsStat.BLOCKS,
        // PropsStat.DOUBLE_DOUBLE,
        PropsStat.POINTS,
        PropsStat.POINTS_PLUS_ASSISTS,
        PropsStat.POINTS_PLUS_REBOUNDS,
        PropsStat.PRA,
        PropsStat.REBOUNDS,
        PropsStat.REBOUNDS_PLUS_ASSISTS,
        PropsStat.STEALS,
        PropsStat.STEALS_PLUS_BLOCKS,
      ],
    ],
    [
      League.NHL,
      [
        PropsStat.SHOTS_ON_GOAL,
        PropsStat.SAVES,
        PropsStat.HOCKEY_ASSISTS,
        PropsStat.HOCKEY_POINTS,
      ],
    ],
    [
      League.MLB,
      [
        PropsStat.WALKS,
        PropsStat.DOUBLES,
        PropsStat.EARNED_RUNS,
        PropsStat.HITS,
        PropsStat.HOME_RUNS,
        PropsStat.STRIKEOUTS,
        PropsStat.PITCHING_OUTS,
        PropsStat.RBIS,
        PropsStat.RUNS,
        PropsStat.STOLEN_BASES,
        PropsStat.SINGLES,
        PropsStat.TOTAL_BASES,
      ],
    ],
  ]);

  const leagueId = leagueIdMap.get(league);
  if (!leagueId) {
    throw new Error(`Unknown league ${league}`);
  }

  const propTypes = leaguePropsMap.get(league) || [];
  const props: Prop[] = [];
  let now = new Date();
  let endDate = new Date(now);
  if (league === League.NBA) {
    endDate.setDate(endDate.getDate() + 1);
  }

  for (let date = now; date <= endDate; date.setDate(date.getDate() + 1)) {
    let yyyy = date.getFullYear();
    let mm = (date.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
    let dd = date.getDate().toString().padStart(2, "0");
    const endpointDate = `${yyyy}${mm}${dd}`;
    for (const propType of propTypes) {
      const endpoint = propEndpointMap.get(propType);
      if (!endpoint) {
        throw new Error(`Unknown prop ${propType}`);
      }
      const url = `https://api.actionnetwork.com/web/v1/leagues/${leagueId}/props/${endpoint}?bookIds=15,30,1006,939,68,973,972,1005,974,1902,1903,76,347&date=${endpointDate}`;

      let data;
      try {
        ({ data } = await axios.get(url));
      } catch (error) {
        console.log(`No ActionNetwork props for ${propType}`);
        continue;
      }

      const odds = data.markets[0];
      const OVER = Object.entries(odds.rules.options)
        .find(([key, value]: any) => ["o"].includes(value.abbreviation))?.[0]
        .toString();
      const UNDER = Object.entries(odds.rules.options)
        .find(([key, value]: any) => ["u"].includes(value.abbreviation))?.[0]
        .toString();
      // console.log(OVER, UNDER);
      if (!OVER || !UNDER) {
        throw new Error(`Unknown options for ${propType}`);
      }
      odds.books.forEach((book: any) => {
        const book_id = book.book_id;
        let bookName = newYorkActionNetworkSportsBookMap.get(book_id);
        book.odds.forEach((listing: any) => {
          const value = listing.value;
          const player = odds.players.find(
            (p: any) => p.id === listing.player_id
          ).full_name;
          const team = odds.teams.find(
            (t: any) => t.id === listing.team_id
          ).abbr;
          const choice =
            listing.option_type_id.toString() === OVER
              ? LineChoice.OVER
              : LineChoice.UNDER;
          const price = listing.money;
          if (!bookName) {
            // console.log(`unknown book: ${player} ${choice} ${prop} @ ${price} on book ${book_id}`);
            return;
          }
          const prop = new Prop(
            {
              value,
              choice,
              book: bookName,
              stat: propType,
              playerName: player,
              team,
              price,
            },
            playerRegistry
          );

          props.push(prop);
        });
      });
    }
  }
  return props;
};
