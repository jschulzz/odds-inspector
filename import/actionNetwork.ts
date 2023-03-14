import axios from "axios";
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

const newYorkActionNetworkSportsBookMap = new Map([
  [972, Book.BETRIVERS],
  [973, Book.POINTSBET],
  [1006, Book.FANDUEL],
  [974, Book.WYNNBET],
  // [1005, Book.CAESARS],
  [939, Book.BETMGM],
  [68, Book.DRAFTKINGS],
  [266, Book.TWINSPIRES],
]);
const newYorkActionNetworkSportsbooks = [
  972, 973, 1006, 974, 939, 68, 266,
];

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

  dataSet.forEach((game: any) => {
    const opponents = game.competitors || game.teams;
    const homeTeam = opponents.find(
      (team: any) => team.id === game.home_team_id || team.side === "home"
    );
    const awayTeam = opponents.find(
      (team: any) => team.id === game.away_team_id || team.side === "away"
    );

    if (league === League.TENNIS || league === League.UFC) {
      homeTeam.display_name = homeTeam.player.full_name;
      awayTeam.display_name = awayTeam.player.full_name;
    }

    if (!game.odds) {
      return;
    }

    game.odds
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
          homeTeam: useFullName ? homeTeam.full_name : homeTeam.display_name,
          awayTeam: useFullName ? awayTeam.full_name : awayTeam.display_name,
          period,
          book,
          gameTime: game.start_time,
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
  });
  return lines;
};

export const getActionNetworkProps = async (league: League) => {
  const leagueKey = leagueMap.get(league);
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  let dd = today.getDate().toString().padStart(2, "0");
  const startDate = `${yyyy}${mm}${dd}`;
  if (!leagueKey) {
    throw new Error("Unknown league");
  }

  const leagueIdMap = new Map([
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
  ]);

  const leaguePropsMap = new Map([
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
    [League.NHL, [PropsStat.SHOTS_ON_GOAL, PropsStat.SAVES]],
  ]);

  const leagueId = leagueIdMap.get(league);
  if (!leagueId) {
    throw new Error(`Unknown league ${league}`);
  }

  const propTypes = leaguePropsMap.get(league) || [];
  const props: Prop[] = [];

  for (const prop of propTypes) {
    const endpoint = propEndpointMap.get(prop);
    if (!endpoint) {
      throw new Error(`Unknown prop ${prop}`);
    }
    const url = `https://api.actionnetwork.com/web/v1/leagues/${leagueId}/props/${endpoint}?bookIds=15,30,1006,939,68,973,972,1005,974,1902,1903,76&date=${startDate}`;
    console.log(url);
    const { data } = await axios.get(url);

    const odds = data.markets[0];
    const OVER = Object.entries(odds.rules.options)
      .find(([key, value]: any) => ["o"].includes(value.abbreviation))?.[0]
      .toString();
    const UNDER = Object.entries(odds.rules.options)
      .find(([key, value]: any) => ["u"].includes(value.abbreviation))?.[0]
      .toString();
    // console.log(OVER, UNDER);
    if (!OVER || !UNDER) {
      throw new Error(`Unknown options for ${prop}`);
    }
    odds.books.forEach((book: any) => {
      const book_id = book.book_id;
      let bookName = newYorkActionNetworkSportsBookMap.get(book_id);
      book.odds.forEach((listing: any) => {
        const value = listing.value;
        const player = odds.players.find(
          (p: any) => p.id === listing.player_id
        ).full_name;
        const team = odds.teams.find((t: any) => t.id === listing.team_id).abbr;
        const choice =
          listing.option_type_id.toString() === OVER
            ? LineChoice.OVER
            : LineChoice.UNDER;
        const price = listing.money;
        if (!bookName) {
          // console.log(`unknown book: ${player} ${choice} ${prop} @ ${price} on book ${book_id}`);
          return;
        }
        props.push({
          value,
          choice,
          book: bookName,
          stat: prop,
          player,
          team,
          price,
        });
      });
    });
  }
  console.log(new Set(props.map((x) => x.book)));
  return props;
};
