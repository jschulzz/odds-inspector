import axios from "axios";
import { findBook } from "../books";
import { Book, League, Moneyline, Period, SourcedOdds } from "../types";
import { GameTotal, LineChoice, Spread, TeamTotal } from "../types/lines";

const newYorkActionNetworkSportsBookMap = new Map([
  [972, Book.BETRIVERS],
  [973, Book.POINTSBET],
  [1006, Book.FANDUEL],
  [974, Book.WYNNBET],
  [1005, Book.CAESARS],
  [939, Book.BETMGM],
  [1548, Book.DRAFTKINGS],
  [266, Book.TWINSPIRES],
]);
const newYorkActionNetworkSportsbooks = [
  972, 973, 1006, 974, 1005, 939, 1548, 266,
];

const periodMap = new Map([
  ["game", Period.FULL_GAME],
  ["firsthalf", Period.FIRST_HALF],
  ["firstquarter", Period.FIRST_QUARTER],
  ["firstperiod", Period.FIRST_PERIOD],
  ["secondperiod", Period.SECOND_PERIOD],
  ["thirdperiod", Period.THIRD_PERIOD],
]);

export const getActionNetworkLines = async (
  league: League
): Promise<SourcedOdds> => {
  const url = `https://api.actionnetwork.com/web/v1/scoreboard/${league}?bookIds=15,30,1006,68,973,939,972,1005,974,76,75,123`;
  const { data } = await axios.get(url);
  const lines: SourcedOdds = {
    moneylines: [],
    spreads: [],
    teamTotals: [],
    gameTotals: [],
  };

  const useFullName = ["nfl", "mlb", "wnba", "nhl"].includes(league);

  data.games.forEach((game: any) => {
    const homeTeam = game.teams.find(
      (team: any) => team.id === game.home_team_id
    );
    const awayTeam = game.teams.find(
      (team: any) => team.id === game.away_team_id
    );

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
