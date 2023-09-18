// @ts-nocheck
import axios from "axios";
import fs from "fs";
import path from "path";
import { ODDS_API_KEY } from "../secrets";
import { Book, League, Moneyline, Period, SourcedOdds } from "../frontend/src/types";
import { GameTotal, LineChoice, Spread } from "../frontend/src/types/lines";

const leagueMap = new Map([
  [League.NBA, "basketball_nba"],
  [League.MLB, "baseball_mlb"],
  [League.NFL, "americanfootball_nfl"],
  [League.NHL, "icehockey_nhl"],
  [League.NCAAB, "basketball_ncaab"],
  [League.NCAAF, "americanfootball_ncaaf"]
]);

const getFilename = (league: League) => {
  const datastorePath = path.join(__dirname, "../backups/odds-api");
  return `${datastorePath}/${league}.json`;
};

export const getOddsAPI = async (league: League) => {
  const leagueKey = leagueMap.get(league);
  if (!leagueKey) {
    console.log("Unknown league", league);
    return;
  }

  const url = `https://api.the-odds-api.com/v4/sports/${leagueKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&oddsFormat=american&markets=h2h,spreads,totals`;

  const data = await axios.get(url);

  console.log(data.headers);

  const filename = getFilename(league);

  fs.writeFileSync(filename, JSON.stringify(data.data, null, 2));
};

export const readOddsAPI = (league: League): SourcedOdds => {
  const bookmakerMap = new Map([
    ["williamhill_us", Book.CAESARS],
    ["wynnbet", Book.WYNNBET],
    ["fanduel", Book.FANDUEL],
    ["betus", Book.BETUS],
    ["lowvig", Book.LOWVIG],
    ["bovada", Book.BOVADA],
    ["mybookieag", Book.MYBOOKIE],
    ["pointsbetus", Book.POINTSBET],
    ["draftkings", Book.DRAFTKINGS],
    ["betmgm", Book.BETMGM],
    ["unibet_us", Book.UNIBET],
    ["barstool", Book.BARSTOOL],
    ["betrivers", Book.BETRIVERS],
    ["twinspires", Book.TWINSPIRES],
    ["foxbet", Book.FOXBET],
    ["superbook", Book.SUPERBOOK],
    ["circasports", Book.CIRCA],
    ["betonlineag", Book.BETONLINE]
  ]);
  const filename = getFilename(league);
  const games = JSON.parse(fs.readFileSync(filename).toString());

  const odds: SourcedOdds = {
    moneylines: [],
    spreads: [],
    teamTotals: [],
    gameTotals: []
  };
  games.forEach((game: any) => {
    const homeTeam = game.home_team;
    const awayTeam = game.away_team;
    let homeTeamName = homeTeam;
    let awayTeamName = awayTeam;

    if (league == League.NBA) {
      homeTeamName = homeTeam.split(" ").slice(1).join(" ").trim();
      awayTeamName = awayTeam.split(" ").slice(1).join(" ").trim();
    }
    if (league == League.NCAAB) {
      homeTeamName = homeTeam.split(" ").slice(0, -1).join(" ").trim();
      awayTeamName = awayTeam.split(" ").slice(0, -1).join(" ").trim();
    }
    game.bookmakers.forEach((bookmaker: any) => {
      const bookmakerKey = bookmaker.key;
      const bookmakerName = bookmakerMap.get(bookmakerKey);
      if (!bookmakerName) {
        return;
      }
      const standard = {
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        period: Period.FULL_GAME,
        gameTime: game.commence_time,
        book: bookmakerName
      };
      bookmaker.markets.forEach((market: any) => {
        if (market.key === "h2h") {
          const homePrice = market.outcomes.find((outcome: any) => outcome.name === homeTeam).price;
          const awayPrice = market.outcomes.find((outcome: any) => outcome.name === awayTeam).price;
          const homeMoneyline = new Moneyline({
            ...standard,
            choice: LineChoice.HOME,
            price: homePrice,
            otherOutcomePrice: awayPrice
          });
          const awayMoneyline = new Moneyline({
            ...standard,
            choice: LineChoice.AWAY,
            price: awayPrice,
            otherOutcomePrice: homePrice
          });
          odds.moneylines.push(homeMoneyline, awayMoneyline);
        }
        if (market.key === "spreads") {
          const { price: homePrice, point: homePoint } = market.outcomes.find(
            (outcome: any) => outcome.name === homeTeam
          );
          const { price: awayPrice, point: awayPoint } = market.outcomes.find(
            (outcome: any) => outcome.name === awayTeam
          );
          const homeSpread = new Spread({
            ...standard,
            choice: LineChoice.HOME,
            price: homePrice,
            value: homePoint,
            otherOutcomePrice: awayPrice
          });
          const awaySpread = new Spread({
            ...standard,
            choice: LineChoice.AWAY,
            price: awayPrice,
            value: awayPoint,
            otherOutcomePrice: homePrice
          });
          odds.spreads.push(homeSpread, awaySpread);
        }
        if (market.key === "totals") {
          const { price: overPrice, point: overPoint } = market.outcomes.find(
            (outcome: any) => outcome.name === "Over"
          );
          const { price: underPrice, point: underPoint } = market.outcomes.find(
            (outcome: any) => outcome.name === "Under"
          );
          const overTotal = new GameTotal({
            ...standard,
            choice: LineChoice.OVER,
            price: overPrice,
            value: overPoint,
            otherOutcomePrice: underPrice
          });
          const underTotal = new GameTotal({
            ...standard,
            choice: LineChoice.UNDER,
            price: underPrice,
            value: underPoint,
            otherOutcomePrice: overPrice
          });
          odds.gameTotals.push(overTotal, underTotal);
        }
      });
    });
  });
  return odds;
};
