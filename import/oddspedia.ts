import axios from "axios";
import fs from "fs";
import path from "path";
import { findBook } from "../books";
import { findMarket } from "../markets";
import { Odds } from "../odds/odds";
import { League, Period, Moneyline, Spread, Market } from "../types";
import { GameTotal, LineChoice, SourcedOdds } from "../types/lines";

const marketMap = new Map([
  [League.NFL, { sport: "football", category: "usa", seasonId: "160389", league: "nfl" }],
  [League.NCAAF, { sport: "football", category: "usa", seasonId: "160664", league: "ncaa" }],
  [League.NCAAB, { sport: "basketball", category: "usa", seasonId: "98001", league: "ncaa" }],
  [League.MLB, { sport: "baseball", category: "usa", seasonId: "88607", league: "mlb" }],
  [League.NBA, { sport: "basketball", category: "usa", seasonId: "94573", league: "nba" }],
  [League.NHL, { sport: "ice-hockey", category: "usa", seasonId: "94839", league: "nhl" }],
  [League.SOCCER, { sport: "soccer", category: "usa", seasonId: "94839", league: "nhl" }]
]);

const periodMap = new Map([
  ["FT inc. OT", Period.FULL_GAME],
  ["Full Time", Period.FULL_GAME],
  ["1st Half", Period.FIRST_HALF],
  ["1Q", Period.FIRST_QUARTER],
  ["1st Period", Period.FIRST_PERIOD],
  ["2nd Period", Period.SECOND_PERIOD],
  ["3rd Period", Period.THIRD_PERIOD]
]);

export const getOddspedia = async (
  league: League,
  pullNew: boolean = true
): Promise<SourcedOdds> => {
  let matches = [];
  const datastorePath = path.join(__dirname, "../backups/oddspedia");
  const linesFilename = `${datastorePath}/${league}.json`;
  const marketParams = marketMap.get(league);
  if (!marketParams) {
    throw new Error(`No matching params for League ${league} for OddsPedia`);
  }
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  let dd = today.getDate().toString().padStart(2, "0");
  const startDate = `${yyyy}-${mm}-${dd}`;
  let endDate = startDate;
  let dayAdder = 0;
  if (league === League.NBA) {
    dayAdder = 1;
  } else if ([League.NFL, League.NCAAF].includes(league)) {
    dayAdder = 6;
  }
  today.setDate(today.getDate() + dayAdder);

  yyyy = today.getFullYear();
  mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  dd = today.getDate().toString().padStart(2, "0");
  endDate = `${yyyy}-${mm}-${dd}`;

  const odds: SourcedOdds = {
    moneylines: [],
    spreads: [],
    gameTotals: [],
    teamTotals: []
  };
  if (pullNew) {
    try {
      let url = `https://oddspedia.com/api/v1/getMatchList?geoCode=US&sport=${marketParams.sport}&category=${marketParams.category}&league=${marketParams.league}&seasonId=${marketParams.seasonId}&popularLeaguesOnly=0&excludeSpecialStatus=0&status=all&sortBy=default&startDate=${startDate}T00%3A00%3A00Z&endDate=${endDate}T23%3A59%3A59Z&round=&page=1&perPage=100&perPageDefault=100&language=us`;
      if (league === League.SOCCER) {
        url = `https://oddspedia.com/api/v1/getMatchList?geoCode=US&startDate=${startDate}&endDate=${endDate}&sport=soccer&status=all&sortBy=default&popularLeaguesOnly=0&excludeSpecialStatus=0&page=1&perPage=50&perPageDefault=50&language=us`;
      }
      const { data } = await axios.get(url);
      matches = data.data.matchList
        .filter((match: any) => !match.inplay)
        .map((match: any) => ({
          id: match.uri.split("-").at(-1).split("?")[0],
          homeTeam: match.ht,
          awayTeam: match.at,
          gameTime: match.md
        }));
    } catch (e: any) {
      console.error(e.response.data);
    }
    const markets = [
      { marketID: 4, type: "total" },
      { marketID: 2, type: "moneyline" },
      { marketID: 3, type: "spread" }
    ];
    checkMatch: for (const match of matches) {
      const gameData = {
        gameId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        gameTime: new Date(match.gameTime)
      };
      for (const { marketID, type } of markets) {
        let data;
        try {
          ({ data } = await axios.get(
            `https://oddspedia.com/api/v1/getMatchOdds?wettsteuer=0&geoCode=US&bookmakerGeoCode=US&geoState=&matchKey=${match.id}&language=us&oddGroupId=${marketID}`,
            { timeout: 5000 }
          ));
        } catch (e: any) {
          if (e.response?.status === 404) {
            console.log("404");
            continue checkMatch;
          }
          console.log(e.code);
          console.log(
            `Could not find ${type} odds for ${gameData.awayTeam} @ ${gameData.homeTeam}`
          );
          // console.error(e);
        }
        if (!data || !data.data || !data.data.prematch) {
          continue;
        }
        const thisMarket = data.data.prematch.find((lines: any) => lines.id === marketID);
        if (!thisMarket) {
          continue;
        }

        const market = findMarket(thisMarket.name);

        if (market === Market.MONEYLINE) {
          thisMarket.periods.forEach((period: any) => {
            const periodName = periodMap.get(period.name);
            if (!periodName) {
              return;
            }
            period.odds.forEach((odd: any) => {
              if (odd.status === 2) {
                // not sure what this signifies, but it's not available
                return;
              }
              const homeOdds = Odds.fromDecimal(odd.o1).toAmericanOdds();
              const awayOdds = Odds.fromDecimal(odd.o2).toAmericanOdds();
              const book = findBook(odd.bookie_name);
              if (!book) {
                return;
              }
              const homeMoneyline = new Moneyline({
                homeTeam: gameData.homeTeam,
                awayTeam: gameData.awayTeam,
                choice: LineChoice.HOME,
                price: homeOdds,
                otherOutcomePrice: awayOdds,
                book,
                period: periodName,
                gameTime: gameData.gameTime
              });
              const awayMoneyline = new Moneyline({
                homeTeam: gameData.homeTeam,
                awayTeam: gameData.awayTeam,
                choice: LineChoice.AWAY,
                price: awayOdds,
                otherOutcomePrice: homeOdds,
                book,
                period: periodName,
                gameTime: gameData.gameTime
              });
              odds.moneylines.push(homeMoneyline, awayMoneyline);
            });
          });
        }
        if (market === Market.SPREAD) {
          thisMarket.periods.forEach((period: any) => {
            const periodName = periodMap.get(period.name);
            if (!periodName) {
              return;
            }
            const allLines = [...period.odds.alternative, ...period.odds.main];
            allLines.forEach((line) => {
              const bookLines = Object.values(line.odds);
              bookLines.forEach((bookLine: any) => {
                if (bookLine.status === 2) {
                  // not sure what this signifies, but it's not available
                  return;
                }
                const homeOdds = Odds.fromDecimal(bookLine.o1).toAmericanOdds();
                const awayOdds = Odds.fromDecimal(bookLine.o2).toAmericanOdds();
                const book = findBook(bookLine.bookie_name);
                if (!book) {
                  return;
                }
                const [homeLine, awayLine] = line.name.split("/").map(Number);
                const homeSpread = new Spread({
                  homeTeam: gameData.homeTeam,
                  awayTeam: gameData.awayTeam,
                  gameTime: gameData.gameTime,
                  value: homeLine,
                  price: homeOdds,
                  otherOutcomePrice: awayOdds,
                  book,
                  period: periodName,
                  choice: LineChoice.HOME
                });
                const awaySpread = new Spread({
                  homeTeam: gameData.homeTeam,
                  awayTeam: gameData.awayTeam,
                  gameTime: gameData.gameTime,
                  value: awayLine,
                  price: awayOdds,
                  otherOutcomePrice: homeOdds,
                  book,
                  period: periodName,
                  choice: LineChoice.AWAY
                });
                odds.spreads.push(homeSpread, awaySpread);
              });
            });
          });
        }
        if (market === Market.GAME_TOTAL) {
          thisMarket.periods.forEach((period: any) => {
            const periodName = periodMap.get(period.name);
            if (!periodName) {
              return;
            }
            const allLines = [...period.odds.alternative, ...period.odds.main];
            allLines.forEach((line) => {
              const bookLines = Object.values(line.odds);
              bookLines.forEach((bookLine: any) => {
                if (bookLine.status === 2) {
                  // not sure what this signifies, but it's not available
                  return;
                }
                const overOdds = Odds.fromDecimal(bookLine.o1).toAmericanOdds();
                const underOdds = Odds.fromDecimal(bookLine.o2).toAmericanOdds();
                const book = findBook(bookLine.bookie_name);
                if (!book) {
                  return;
                }
                const value = Number(line.name);
                const overTotal = new GameTotal({
                  homeTeam: gameData.homeTeam,
                  awayTeam: gameData.awayTeam,
                  gameTime: gameData.gameTime,
                  book,
                  price: overOdds,
                  otherOutcomePrice: underOdds,
                  period: periodName,
                  value,
                  choice: LineChoice.OVER
                });
                const underTotal = new GameTotal({
                  homeTeam: gameData.homeTeam,
                  awayTeam: gameData.awayTeam,
                  gameTime: gameData.gameTime,
                  book,
                  price: underOdds,
                  otherOutcomePrice: overOdds,
                  period: periodName,
                  value,
                  choice: LineChoice.UNDER
                });
                odds.gameTotals.push(overTotal, underTotal);
              });
            });
          });
        }
      }
      console.log(`Retrieved Oddspedia lines for ${gameData.awayTeam} @ ${gameData.homeTeam}`);
    }
    fs.mkdirSync(datastorePath, { recursive: true });

    fs.writeFileSync(linesFilename, JSON.stringify(odds, null, 4));
  }

  const readOdds = JSON.parse(fs.readFileSync(linesFilename).toString()) as SourcedOdds;
  return readOdds;
};

// getOdds("nfl");
