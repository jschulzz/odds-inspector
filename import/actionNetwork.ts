import axios from "axios";
import {
  Book,
  League,
  Moneyline,
  Period,
  Prop,
  PropsStat,
  SourcedOdds
} from "../frontend/src/types";
import { GameTotal, LineChoice, Spread, TeamTotal } from "../frontend/src/types/lines";
import { TeamManager, Team } from "../database/mongo.team";
import { Game } from "../database/game";
import { Player, PlayerManager } from "../database/mongo.player";
import { PlayerPropManager } from "../database/mongo.player-prop";
import { PriceManager } from "../database/mongo.price";
import { GameManager, Game as MongoGame } from "../database/mongo.game";
import { GameLineManager, HomeOrAway } from "../database/mongo.game-line";

const newYorkActionNetworkSportsBookMap = new Map([
  [972, Book.BETRIVERS],
  [76, Book.POINTSBET],
  [358, Book.FANDUEL],
  [974, Book.WYNNBET],
  [1005, Book.CAESARS],
  [68, Book.DRAFTKINGS],
  [347, Book.BETMGM],
  [266, Book.TWINSPIRES]
]);

const leagueMap = new Map([
  [
    League.NBA,
    "nba?periods=event,firsthalf,secondhalf,firstquarter,secondquarter,thirdquarter,fourthquarter&"
  ],
  [
    League.WNBA,
    "wnba?periods=event,firsthalf,secondhalf,firstquarter,secondquarter,thirdquarter,fourthquarter&"
  ],
  [League.NCAAB, "ncaab?division=D1&tournament=0&periods=event,firsthalf,secondhalf&"],
  [League.NCAAF, "ncaaf?division=FBS&week=13&periods=event,firsthalf,firstquarter&"],
  [League.NHL, "nhl?periods=event,firstperiod,secondperiod,thirdperiod&"],
  [League.MLB, "mlb?periods=event,firstinning,firstfiveinnings&"],
  [
    League.NFL,
    "nfl?periods=event,firsthalf,secondhalf,firstquarter,secondquarter,thirdquarter,fourthquarter&"
  ],
  [League.TENNIS, "atp?periods=competition&"],
  [League.UFC, "ufc?periods=competition&"]
]);

const periodMap = new Map([
  ["game", Period.FULL_GAME],
  ["competition", Period.FULL_GAME],
  ["event", Period.FULL_GAME],
  ["firstperiod", Period.FIRST_PERIOD],
  ["secondperiod", Period.SECOND_PERIOD],
  ["thirdperiod", Period.THIRD_PERIOD],
  ["firsthalf", Period.FIRST_HALF],
  ["secondhalf", Period.SECOND_HALF],
  ["firstquarter", Period.FIRST_QUARTER],
  ["secondquarter", Period.SECOND_QUARTER],
  ["thirdquarter", Period.THIRD_QUARTER],
  ["fourthquarter", Period.FOURTH_QUARTER]
]);
const leagueParamsMap = new Map([]);

export const getActionNetworkV2Lines = async (league: League): Promise<SourcedOdds> => {
  const teamManager = new TeamManager();
  const gameLineManager = new GameLineManager();
  const gameManager = new GameManager();
  const priceManager = new PriceManager();
  const cleanedBooks = new Set<Book>();

  const leagueKey = leagueMap.get(league);
  let today = new Date();
  today.setDate(today.getDate() + 1);
  let yyyy = today.getFullYear();
  let mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  let dd = today.getDate().toString().padStart(2, "0");
  const startDate = `${yyyy}${mm}${dd}`;
  if (!leagueKey) {
    throw new Error("Unknown league");
  }

  const leagueParams = leagueParamsMap.get(league) || "";

  const url = `https://api.actionnetwork.com/web/v2/scoreboard/${leagueKey}bookIds=15,30,358,347,68,973,972,1005,974,1902,1903,76${leagueParams}`;
  console.log(url);
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent": "insomnia/8.5.1"
    }
  });
  const lines: SourcedOdds = {
    moneylines: [],
    spreads: [],
    teamTotals: [],
    gameTotals: []
  };

  const useFullName = ["nfl", "mlb", "wnba", "nhl"].includes(league);

  const dataSet: any[] = data.games || data.competitions;
  for (const gameRecord of dataSet) {
    if (gameRecord.status !== "scheduled") {
      continue;
    }
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

    const homeTeamName = useFullName ? homeTeamObj.full_name : homeTeamObj.display_name;
    const awayTeamName = useFullName ? awayTeamObj.full_name : awayTeamObj.display_name;

    let homeTeam;

    try {
      homeTeam = await teamManager.findByAbbreviation(homeTeamObj.abbr, league);
    } catch {
      homeTeam = await teamManager.add({
        name: homeTeamName,
        league,
        abbreviation: homeTeamObj.abbr
      });
    }
    let awayTeam;
    try {
      awayTeam = await teamManager.findByAbbreviation(awayTeamObj.abbr, league);
    } catch {
      awayTeam = await teamManager.add({
        name: awayTeamName,
        league,
        abbreviation: awayTeamObj.abbr
      });
    }

    if (!gameRecord.markets) {
      continue;
    }

    const game = new Game({
      homeTeam,
      awayTeam,
      league,
      gameTime: new Date(gameRecord.start_time)
    });

    console.log(`Recording ${awayTeam.abbreviation}@${homeTeam.abbreviation}`);
    const oddsByBook: object[] = Object.values(gameRecord.markets);
    const oddsByPeriod: object[] = oddsByBook.flatMap((odds) => Object.values(odds));
    await Promise.allSettled(
      oddsByPeriod.map((odds: any) => {
        return (async () => {
          const period = periodMap.get(odds.total[0].period);
          const book = newYorkActionNetworkSportsBookMap.get(odds.total[0].book_id);
          if (!book || !period) {
            throw new Error("Unknown book or period");
          }
          if (!cleanedBooks.has(book)) {
            await priceManager.deleteGamePricesForLeagueOnBook(league, book);
            cleanedBooks.add(book);
          }
          let mongoGame: MongoGame;

          try {
            mongoGame = await gameManager.findByTeamAbbr(game.homeTeam.abbreviation[0], league);
          } catch {
            // console.log("HERE");
            console.log(
              "Could not find game",
              `${game.awayTeam.abbreviation}@${game.homeTeam.abbreviation}`
            );
            throw new Error("Could not find game");
          }
          const moneylines = odds.moneyline;
          const homeMoneyline = moneylines.find((x: any) => x.side === "home");
          const awayMoneyline = moneylines.find((x: any) => x.side === "away");
          const spreads = odds.spread;
          const homeSpread = spreads.find((x: any) => x.side === "home");
          const awaySpread = spreads.find((x: any) => x.side === "away");
          const totals = odds.total;
          const overTotal = totals.find((x: any) => x.side === "over");
          const underTotal = totals.find((x: any) => x.side === "under");

          const mongoHomeMoneyline = await gameLineManager.upsertMoneyline(mongoGame, period);
          await priceManager.upsertGameLinePrice(mongoHomeMoneyline, book, {
            overPrice: homeMoneyline.odds,
            underPrice: awayMoneyline.odds
          });

          const mongoHomeSpread = await gameLineManager.upsertSpread(mongoGame, period, {
            side: HomeOrAway.HOME,
            value: homeSpread.value
          });
          await priceManager.upsertGameLinePrice(mongoHomeSpread, book, {
            overPrice: homeSpread.odds,
            underPrice: awaySpread.odds
          });
          const mongoAwaySpread = await gameLineManager.upsertSpread(mongoGame, period, {
            side: HomeOrAway.AWAY,
            value: awaySpread.value
          });
          await priceManager.upsertGameLinePrice(mongoAwaySpread, book, {
            overPrice: awaySpread.odds,
            underPrice: homeSpread.odds
          });

          const mongoGameTotal = await gameLineManager.upsertGameTotal(mongoGame, period, {
            value: overTotal.value
          });
          await priceManager.upsertGameLinePrice(mongoGameTotal, book, {
            overPrice: overTotal.odds,
            underPrice: underTotal.odds
          });
        })();
      })
    );
  }
  return lines;
};

export const getActionNetworkLines = async (league: League): Promise<SourcedOdds> => {
  const teamManager = new TeamManager();
  const gameLineManager = new GameLineManager();
  const gameManager = new GameManager();
  const priceManager = new PriceManager();
  const cleanedBooks = new Set<Book>();

  const leagueKey = leagueMap.get(league);
  let today = new Date();
  today.setDate(today.getDate() + 1);
  let yyyy = today.getFullYear();
  let mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  let dd = today.getDate().toString().padStart(2, "0");
  const startDate = `${yyyy}${mm}${dd}`;
  if (!leagueKey) {
    throw new Error("Unknown league");
  }

  const leagueParams = leagueParamsMap.get(league) || "";

  const url = `https://api.actionnetwork.com/web/v1/scoreboard/${leagueKey}bookIds=15,30,358,347,68,973,972,1005,974,1902,1903,76${leagueParams}`;
  console.log(url);
  const { data } = await axios.get(url);
  const lines: SourcedOdds = {
    moneylines: [],
    spreads: [],
    teamTotals: [],
    gameTotals: []
  };

  const useFullName = ["nfl", "mlb", "wnba", "nhl"].includes(league);

  const dataSet: any[] = data.games || data.competitions;
  for (const gameRecord of dataSet) {
    if (gameRecord.status !== "scheduled") {
      continue;
    }
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

    const homeTeamName = useFullName ? homeTeamObj.full_name : homeTeamObj.display_name;
    const awayTeamName = useFullName ? awayTeamObj.full_name : awayTeamObj.display_name;

    let homeTeam;

    try {
      homeTeam = await teamManager.findByAbbreviation(homeTeamObj.abbr, league);
    } catch {
      homeTeam = await teamManager.add({
        name: homeTeamName,
        league,
        abbreviation: homeTeamObj.abbr
      });
    }
    let awayTeam;
    try {
      awayTeam = await teamManager.findByAbbreviation(awayTeamObj.abbr, league);
    } catch {
      awayTeam = await teamManager.add({
        name: awayTeamName,
        league,
        abbreviation: awayTeamObj.abbr
      });
    }

    if (!gameRecord.odds) {
      continue;
    }

    const game = new Game({
      homeTeam,
      awayTeam,
      league,
      gameTime: new Date(gameRecord.start_time)
    });

    console.log(`Recording ${awayTeam.abbreviation}@${homeTeam.abbreviation}`);
    const filteredOdds = gameRecord.odds.filter((odds: any) => odds.meta);
    await Promise.allSettled(
      filteredOdds.map((odds: any) => {
        return (async () => {
          const period = periodMap.get(odds.type);
          const book = newYorkActionNetworkSportsBookMap.get(odds.book_id);
          if (!book || !period) {
            throw new Error("Unknown book or period");
          }
          if (!cleanedBooks.has(book)) {
            await priceManager.deleteGamePricesForLeagueOnBook(league, book);
            cleanedBooks.add(book);
          }
          let mongoGame: MongoGame;

          try {
            mongoGame = await gameManager.findByTeamAbbr(game.homeTeam.abbreviation[0], league);
          } catch {
            // console.log("HERE");
            console.log(
              "Could not find game",
              `${game.awayTeam.abbreviation}@${game.homeTeam.abbreviation}`
            );
            throw new Error("Could not find game");
          }
          if (odds.ml_home && odds.ml_away) {
            const mongoHomeMoneyline = await gameLineManager.upsertMoneyline(mongoGame, period);
            // if (awayTeam.abbreviation === "ATL" && book === Book.POINTSBET) {
            //   console.log(mongoHomeMoneyline, book, {
            //     overPrice: odds.ml_home,
            //     underPrice: odds.ml_away
            //   });
            // }
            await priceManager.upsertGameLinePrice(mongoHomeMoneyline, book, {
              overPrice: odds.ml_home,
              underPrice: odds.ml_away
            });
          }

          if (odds.spread_home_line && odds.spread_away_line) {
            const mongoHomeSpread = await gameLineManager.upsertSpread(mongoGame, period, {
              side: HomeOrAway.HOME,
              value: odds.spread_home
            });
            const mongoAwaySpread = await gameLineManager.upsertSpread(mongoGame, period, {
              side: HomeOrAway.AWAY,
              value: odds.spread_away
            });
            await priceManager.upsertGameLinePrice(mongoHomeSpread, book, {
              overPrice: odds.spread_home_line,
              underPrice: odds.spread_away_line
            });
            await priceManager.upsertGameLinePrice(mongoAwaySpread, book, {
              overPrice: odds.spread_away_line,
              underPrice: odds.spread_home_line
            });
          }
          if (odds.home_over && odds.home_under) {
            const mongoAwayTeamTotal = await gameLineManager.upsertTeamTotal(mongoGame, period, {
              side: HomeOrAway.AWAY,
              value: odds.away_total
            });

            const mongoHomeTeamTotal = await gameLineManager.upsertTeamTotal(mongoGame, period, {
              side: HomeOrAway.HOME,
              value: odds.home_total
            });
            await priceManager.upsertGameLinePrice(mongoHomeTeamTotal, book, {
              overPrice: odds.home_over,
              underPrice: odds.home_under
            });
            await priceManager.upsertGameLinePrice(mongoAwayTeamTotal, book, {
              overPrice: odds.away_over,
              underPrice: odds.away_under
            });
          }
          if (odds.over && odds.under) {
            const mongoGameTotal = await gameLineManager.upsertGameTotal(mongoGame, period, {
              value: odds.total
            });

            await priceManager.upsertGameLinePrice(mongoGameTotal, book, {
              overPrice: odds.over,
              underPrice: odds.under
            });
          }

          // const homeMoneyline = new Moneyline({
          //   ...gameData,
          //   price: odds.ml_home,
          //   otherOutcomePrice: odds.ml_away,
          //   choice: LineChoice.HOME
          // });
          // const awayMoneyline = new Moneyline({
          //   ...gameData,
          //   price: odds.ml_away,
          //   otherOutcomePrice: odds.ml_home,
          //   choice: LineChoice.AWAY
          // });
          // const homeSpread = new Spread({
          //   ...gameData,
          //   price: odds.spread_home_line,
          //   otherOutcomePrice: odds.spread_away_line,
          //   choice: LineChoice.HOME,
          //   value: odds.spread_home
          // });
          // const awaySpread = new Spread({
          //   ...gameData,
          //   price: odds.spread_away_line,
          //   otherOutcomePrice: odds.spread_home_line,
          //   choice: LineChoice.AWAY,
          //   value: odds.spread_away
          // });
          // const overGameTotal = new GameTotal({
          //   ...gameData,
          //   price: odds.over,
          //   otherOutcomePrice: odds.under,
          //   choice: LineChoice.OVER,
          //   value: odds.total
          // });
          // const underGameTotal = new GameTotal({
          //   ...gameData,
          //   price: odds.under,
          //   otherOutcomePrice: odds.over,
          //   choice: LineChoice.UNDER,
          //   value: odds.total
          // });
          // const overHomeTotal = new TeamTotal({
          //   ...gameData,
          //   price: odds.home_over,
          //   otherOutcomePrice: odds.home_under,
          //   choice: LineChoice.OVER,
          //   side: "home",
          //   value: odds.home_total
          // });
          // const underHomeTotal = new TeamTotal({
          //   ...gameData,
          //   price: odds.home_under,
          //   otherOutcomePrice: odds.home_over,
          //   choice: LineChoice.UNDER,
          //   side: "home",
          //   value: odds.home_total
          // });
          // const overAwayTotal = new TeamTotal({
          //   ...gameData,
          //   price: odds.away_over,
          //   otherOutcomePrice: odds.home_under,
          //   choice: LineChoice.OVER,
          //   side: "away",
          //   value: odds.away_total
          // });
          // const underAwayTotal = new TeamTotal({
          //   ...gameData,
          //   price: odds.away_under,
          //   otherOutcomePrice: odds.home_over,
          //   choice: LineChoice.UNDER,
          //   side: "away",
          //   value: odds.home_total
          // });

          // lines.moneylines.push(homeMoneyline, awayMoneyline);
          // lines.spreads.push(homeSpread, awaySpread);
          // lines.gameTotals.push(overGameTotal, underGameTotal);
          // lines.teamTotals.push(overHomeTotal, overAwayTotal, underHomeTotal, underAwayTotal);
        })();
      })
    );
  }
  return lines;
};

export const getActionNetworkProps = async (league: League) => {
  const leagueKey = leagueMap.get(league);
  const playerPropManager = new PlayerPropManager();
  const priceManager = new PriceManager();
  const gameManager = new GameManager();
  const playerManager = new PlayerManager();

  if (!leagueKey) {
    throw new Error("Unknown league");
  }

  const leagueIdMap = new Map([
    [League.WNBA, 5],
    [League.NBA, 4],
    [League.NFL, 1],
    [League.NHL, 3],
    [League.MLB, 8]
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

    [PropsStat.EXTRA_POINTS_MADE, "core_bet_type_212_extra_points_made"],
    [PropsStat.FIELD_GOALS_MADE, "core_bet_type_213_field_goals_made"],
    [PropsStat.INTERCEPTIONS, "core_bet_type_65_interceptions"],
    [PropsStat.KICKING_POINTS, "core_bet_type_43_kicking_points"],
    [PropsStat.PASSING_RUSHING_YARDS, "core_bet_type_71_passing_rushing_yards"],
    [PropsStat.PASSING_TDS, "core_bet_type_11_passing_tds"],
    [PropsStat.PASSING_YARDS, "core_bet_type_9_passing_yards"],
    [PropsStat.PASS_ATTEMPTS, "core_bet_type_30_passing_attempts"],
    [PropsStat.PASS_COMPLETIONS, "core_bet_type_10_pass_completions"],
    [PropsStat.LONGEST_PASSING_COMPLETION, "core_bet_type_60_longest_completion"],
    [PropsStat.RUSHING_TDS, "core_bet_type_13_rushing_tds"],
    [PropsStat.RUSHING_YARDS, "core_bet_type_12_rushing_yards"],
    [PropsStat.RUSH_ATTEMPTS, "core_bet_type_18_rushing_attempts"],
    [PropsStat.LONGEST_RUSH, "core_bet_type_58_longest_rush"],
    [PropsStat.RECEIVING_RUSHING_YARDS, "core_bet_type_66_rushing_receiving_yards"],
    [PropsStat.RECEIVING_TDS, "core_bet_type_17_receiving_tds"],
    [PropsStat.RECEIVING_YARDS, "core_bet_type_16_receiving_yards"],
    [PropsStat.RECEPTIONS, "core_bet_type_15_receptions"],
    [PropsStat.LONGEST_RECEPTION, "core_bet_type_59_longest_reception"],
    [PropsStat.TACKLES_ASSISTS, "core_bet_type_70_tackles_assists"]
  ]);

  const leaguePropsMap = new Map([
    [
      League.WNBA,
      [PropsStat.POINTS, PropsStat.REBOUNDS, PropsStat.ASSISTS, PropsStat.THREE_POINTERS_MADE]
    ],
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
        PropsStat.STEALS_PLUS_BLOCKS
      ]
    ],
    [
      League.NHL,
      [PropsStat.SHOTS_ON_GOAL, PropsStat.SAVES, PropsStat.HOCKEY_ASSISTS, PropsStat.HOCKEY_POINTS]
    ],
    [
      League.NFL,
      [
        PropsStat.EXTRA_POINTS_MADE,
        PropsStat.FIELD_GOALS_MADE,
        PropsStat.INTERCEPTIONS,
        PropsStat.KICKING_POINTS,
        PropsStat.PASSING_RUSHING_YARDS,
        PropsStat.PASSING_TDS,
        PropsStat.PASSING_YARDS,
        PropsStat.PASS_ATTEMPTS,
        PropsStat.PASS_COMPLETIONS,
        PropsStat.LONGEST_PASSING_COMPLETION,
        PropsStat.RUSHING_TDS,
        PropsStat.RUSHING_YARDS,
        PropsStat.RUSH_ATTEMPTS,
        PropsStat.LONGEST_RUSH,
        PropsStat.RECEIVING_RUSHING_YARDS,
        PropsStat.RECEIVING_TDS,
        PropsStat.RECEIVING_YARDS,
        PropsStat.RECEPTIONS,
        PropsStat.LONGEST_RECEPTION,
        PropsStat.TACKLES_ASSISTS
      ]
    ],
    [
      League.MLB,
      [
        PropsStat.WALKS,
        PropsStat.STRIKEOUTS,
        PropsStat.EARNED_RUNS,
        PropsStat.PITCHING_OUTS,
        PropsStat.HITS,
        PropsStat.RBIS,
        PropsStat.RUNS,
        PropsStat.STOLEN_BASES,
        // PropsStat.SINGLES,
        // PropsStat.DOUBLES,
        // PropsStat.HOME_RUNS,
        PropsStat.TOTAL_BASES
      ]
    ]
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
      const url = `https://api.actionnetwork.com/web/v1/leagues/${leagueId}/props/${endpoint}?bookIds=15,30,358,347,68,973,972,1005,974,1902,1903,76,347&date=${endpointDate}`;
      console.log(`Recording ${propType}`);
      let data;
      try {
        ({ data } = await axios.get(url, {
          headers: {
            "User-Agent": "insomnia/8.5.1"
          }
        }));
      } catch (error) {
        console.log(`No ActionNetwork props for ${propType}`);
        continue;
      }

      const odds = data.markets[0];
      if (!odds) {
        console.log(`No props for ${propType}`);
        continue;
      }
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
      if (!odds.players) {
        continue;
      }
      const activeTeams: any[] = [];
      for (const team of odds.teams) {
        try {
          await gameManager.findByTeamAbbr(team.abbr, league);
          activeTeams.push(team);
        } catch {
          console.log(`Could not find game for team ${team.abbr}. Might be in past`);
        }
      }
      for (const book of odds.books) {
        const book_id = book.book_id;
        let bookName = newYorkActionNetworkSportsBookMap.get(book_id);
        if (!bookName) {
          // console.log(`unknown book: ${player} ${choice} ${prop} @ ${price} on book ${book_id}`);
          continue;
        }

        await Promise.allSettled(
          (book.odds as any[]).map((listing: any) =>
            (async function () {
              const value = listing.value;
              const player = odds.players.find((p: any) => p.id === listing.player_id).full_name;
              const team = activeTeams.find((t: any) => t.id === listing.team_id);
              if (!team) {
                // console.log("Skipping prop, could not find team");
                return;
              }
              let game: MongoGame;
              try {
                game = await gameManager.findByTeamAbbr(team.abbr, league);
              } catch {
                console.log("Skipping prop, could not find game");
                return;
              }
              const choice =
                listing.option_type_id.toString() === OVER ? LineChoice.OVER : LineChoice.UNDER;
              const price = listing.money;

              let mongoPlayer: Player;
              try {
                mongoPlayer = await playerManager.findByName(player, league);
              } catch {
                console.log("Could not find player, now attempting to add");
                try {
                  mongoPlayer = await playerManager.add(player, team.abbr, league);
                } catch {
                  console.error("Could not add player", player);
                  return;
                }
              }
              const playerProp = await playerPropManager.upsert(
                // @ts-ignore
                mongoPlayer as Player,
                // @ts-ignore
                game,
                league,
                propType,
                value
              );
              await priceManager.upsertPlayerPropPrice(playerProp, bookName as Book, {
                overPrice: choice === LineChoice.OVER ? price : undefined,
                underPrice: choice === LineChoice.UNDER ? price : undefined
              });
              // @ts-ignore
              console.log(`Added prop ${mongoPlayer.name} ${value} ${propType} on ${bookName}`);
            })()
          )
        );
      }
    }
  }
  return props;
};
