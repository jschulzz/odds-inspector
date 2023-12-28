import axios from "axios";
import { getConnection } from "../database/mongo.connection";
import { GameManager } from "../database/mongo.game";
import { GameLineManager } from "../database/mongo.game-line";
import { GroupManager, GroupSearchQuery } from "../database/mongo.group";
import { PlayerManager } from "../database/mongo.player";
import { PlayerPropManager } from "../database/mongo.player-prop";
import {
  League,
  Period,
  Price,
  PricedValue,
  PropGroup,
  PropsStat,
  Market,
  Book
} from "../frontend/src/types";
import { findGameLines } from "./game-lines";
import { getProps } from "./player-props";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import cheerio, { CheerioAPI } from "cheerio";
import { Team, TeamManager } from "../database/mongo.team";
import { Odds } from "../odds/odds";
import { groupBy } from "lodash";
import { NFLScraper } from "./data-scraper/nfl.data-scraper";
import { NCAAFScraper } from "./data-scraper/ncaaf.data-scraper";

const populateDB = async (league: League) => {
  await getConnection();
  const now = new Date();
  const yesterday = now;
  yesterday.setDate(now.getDate() - 4);
  const gameLineGroups = await findGameLines(league, yesterday);
  const propGroups = await getProps(league, yesterday);
  const groupManager = new GroupManager();
  const gameLineManager = new GameLineManager();
  const playerPropManager = new PlayerPropManager();
  const playerManager = new PlayerManager();
  const gameManager = new GameManager();
  for (let group of gameLineGroups) {
    await groupManager.tryToInsert(group);
  }
  for (let group of propGroups) {
    await groupManager.tryToInsert(group);
  }
  console.log("Done");
};

export type ResultMetadata = {
  homeTeam: Team;
  awayTeam: Team;
  gameTime: Date;
  scores: { period: Period; home: number; away: number; total: number }[];
  players: { name: string; stats: { stat: PropsStat; value: number }[] }[];
};
const getMetadata = async ($: CheerioAPI): Promise<ResultMetadata> => {
  const teamManager = new TeamManager();
  const playerManager = new PlayerManager();
  const scoreRows = $("table.linescore tbody").find("tr");
  const [awayRow, homeRow] = scoreRows.toArray();
  const awayContent = $(awayRow)
    .find("td")
    .toArray()
    .map((x) => $(x).text().trim());
  const homeContent = $(homeRow)
    .find("td")
    .toArray()
    .map((x) => $(x).text().trim());
  const [gameDate, timeBox] = $(".scorebox_meta").children().toArray();
  const [awayLogo, awayTeamName, away1q, away2q, away3q, away4q] = awayContent;
  const [homeLogo, homeTeamName, home1q, home2q, home3q, home4q] = homeContent;
  const homeTotal = +(homeContent.at(-1) as string);
  const awayTotal = +(awayContent.at(-1) as string);
  if (!homeTeamName || !awayTeamName) {
    throw new Error("Malformed game data");
  }
  const homeTeam = await teamManager.findByName(homeTeamName.split("(")[0].trim(), League.NFL);
  const awayTeam = await teamManager.findByName(awayTeamName.split("(")[0].trim(), League.NFL);
  // @ts-ignore
  const date = $(gameDate).text().trim().split("day")[1];
  const time = $(timeBox).text().trim().split("Start Time:")[1].split("").slice(0, -2).join("");
  // this timezone could mess things up later
  const dateString = date + time + " pm EDT";
  const gameTime = new Date(dateString);

  let players: any[] = [];
  const offenseStats = $("table#player_offense tbody").find("tr:not(.thead)").toArray();
  for (const statRow of offenseStats) {
    const playerName = $(statRow).find("a").text().trim();
    let player;
    try {
      player = await playerManager.findByName(playerName, League.NFL);
    } catch {
      continue;
    }
    const [
      team,
      pass_cmp,
      pass_att,
      pass_yds,
      pass_td,
      pass_int,
      pass_sacked,
      pass_sacked_yds,
      pass_long,
      pass_rating,
      rush_att,
      rush_yds,
      rush_td,
      rush_long,
      targtes,
      rec,
      rec_yds,
      red_td,
      rec_long,
      fumbles,
      fumbles_lost
    ] = $(statRow)
      .find("td")
      .toArray()
      .map((x) => Number($(x).text().trim()));
    players.push({
      name: player.name,
      stats: [
        { stat: PropsStat.PASS_COMPLETIONS, value: pass_cmp },
        { stat: PropsStat.PASS_ATTEMPTS, value: pass_att },
        { stat: PropsStat.PASSING_YARDS, value: pass_yds },
        { stat: PropsStat.PASSING_TDS, value: pass_td },
        { stat: PropsStat.INTERCEPTIONS, value: pass_int },
        { stat: PropsStat.LONGEST_PASSING_COMPLETION, value: pass_long },
        { stat: PropsStat.RUSH_ATTEMPTS, value: rush_att },
        { stat: PropsStat.RUSHING_YARDS, value: rush_yds },
        { stat: PropsStat.RUSHING_TDS, value: rush_td },
        { stat: PropsStat.LONGEST_RUSH, value: rush_long },
        { stat: PropsStat.RECEPTIONS, value: rec },
        { stat: PropsStat.RECEIVING_YARDS, value: rec_yds },
        { stat: PropsStat.RECEIVING_TDS, value: red_td },
        { stat: PropsStat.LONGEST_RECEPTION, value: rec_long }
      ]
    });
  }

  const result: ResultMetadata = {
    homeTeam,
    awayTeam,
    gameTime,
    scores: [
      { period: Period.FIRST_QUARTER, home: +home1q, away: +away1q, total: +home1q + +away1q },
      { period: Period.SECOND_QUARTER, home: +home2q, away: +away2q, total: +home2q + +away2q },
      { period: Period.THIRD_QUARTER, home: +home3q, away: +away3q, total: +home3q + +away3q },
      { period: Period.FOURTH_QUARTER, home: +home4q, away: +away4q, total: +home4q + +away4q },
      {
        period: Period.FIRST_HALF,
        home: +home1q + +home2q,
        away: +away1q + +away2q,
        total: +away1q + +away2q + +home1q + +home2q
      },
      {
        period: Period.SECOND_HALF,
        home: +home3q + +home4q,
        away: +away3q + +away4q,
        total: +away3q + +away4q + +home3q + +home4q
      },
      { period: Period.FULL_GAME, home: homeTotal, away: awayTotal, total: homeTotal + awayTotal }
    ],
    players: []
  };
  return result;
};

const backupAndFetch = async (url: string) => {
  const fileName = url.split("//")[1].replaceAll("/", "_");
  //https://www.pro-football-reference.com/years/2023/week_4.htm
  // https://www.sports-reference.com/cfb/boxscores/
  const savedFile = path.join(__filename, `../backup/${fileName}`);
  let savedHtml;
  try {
    savedHtml = readFileSync(savedFile).toString();
  } catch {
    console.log("Couldn't find saved copy - fetching");
  }
  if (!savedHtml) {
    const response = await axios.get(url);
    await new Promise((res) => setTimeout(res, 3000));
    savedHtml = response.data;
    writeFileSync(savedFile, savedHtml);
  }
  return savedHtml;
};

const parseScoreboard = async () => {
  const html = await backupAndFetch(
    "https://www.sports-reference.com/cfb/boxscores/index.cgi?month=10&day=7&year=2023&conf_id="
  );
  const $ = cheerio.load(html);
  const links = $(".game_summaries")
    .find(".gamelink")
    .find("a")
    .toArray()
    .map((x) => $(x).attr("href"));
  const allStats: any[] = [];
  for (const link of links) {
    const stats = await grabStats("https://www.sports-reference.com" + link);
    allStats.push(...stats);
  }
  const summary: any[] = [];
  const groupedByBook = groupBy(allStats, "book");
  Object.entries(groupedByBook).forEach(([book, bookGroup]: [string, any[]]) => {
    const groupedByLeague = groupBy(bookGroup, "league");
    Object.entries(groupedByLeague).forEach(([league, leagueGroup]: [string, any[]]) => {
      const groupedByMarket = groupBy(leagueGroup, "market");
      Object.entries(groupedByMarket).forEach(([market, marketGroup]: [string, any[]]) => {
        let error = 0;
        marketGroup.forEach((item) => (error += (item.expected - item.actual) ** 2));
        error /= leagueGroup.length;
        summary.push({ book, market, league, error });
        // console.log(book, market, league, error);
      });
      const groupedByStat = groupBy(leagueGroup, "stat");
      Object.entries(groupedByStat).forEach(([stat, statGroup]: [string, any[]]) => {
        let error = 0;
        statGroup.forEach((item) => (error += (item.expected - item.actual) ** 2));
        error /= leagueGroup.length;
        summary.push({ book, stat, league, error });
        // console.log(book, market, league, error);
      });
    });
  });
  const sorted = summary.sort((a, b) => (a.error > b.error ? 1 : -1));
  const groupedByMarket = groupBy(
    sorted.filter((s) => s.market),
    "market"
  );
  Object.entries(groupedByMarket).forEach(([market, errors]: [string, any[]]) => {
    if (market) {
      console.log(market);
      const sortedErrors = errors.sort((a, b) => (a.error > b.error ? 1 : -1));
      sortedErrors.forEach((e) => {
        console.log(`\t${e.book}: ${e.error}`);
      });
    }
  });
  const groupedByStat = groupBy(
    sorted.filter((s) => s.stat),
    "stat"
  );
  // console.log(groupedByMarket);
};

const grabStats = async (url: string) => {
  const html = await backupAndFetch(url);
  const $ = cheerio.load(html);
  const groupManager = new GroupManager();
  let resultMetadata: ResultMetadata;
  try {
    resultMetadata = await getMetadata($);
  } catch {
    return [];
  }
  const gameGroupSearchQuery: GroupSearchQuery = {
    type: "game",
    homeTeamName: resultMetadata.homeTeam.name,
    awayTeamName: resultMetadata.awayTeam.name,
    date: resultMetadata.gameTime,
    league: League.NFL
  };
  const propGroupSearchQuery: GroupSearchQuery = {
    type: "prop",
    homeTeamName: resultMetadata.homeTeam.name,
    awayTeamName: resultMetadata.awayTeam.name,
    date: resultMetadata.gameTime,
    league: League.NFL
  };
  const matchingGameGroups = await groupManager.findGroupsByMetadata(gameGroupSearchQuery);
  const matchingPropGroups = await groupManager.findGroupsByMetadata(propGroupSearchQuery);
  const counts: any[] = [];
  // @ts-ignore
  matchingGameGroups.forEach((group: GameLineGroup) => {
    // @ts-ignore
    const thisPeriodScores = resultMetadata.scores.find((s) => s.period === group.metadata.period);
    // @ts-ignore
    if (group.metadata.market === Market.MONEYLINE) {
      // @ts-ignore
      const didHomeWin = thisPeriodScores?.home > thisPeriodScores?.away;
      group.values.forEach((pricedValue: PricedValue) =>
        pricedValue.prices.forEach((price: Price) => {
          const likelihood = Odds.fromVigAmerican(
            price.overPrice,
            price.underPrice
          ).toProbability();
          counts.push({
            league: group.metadata.league,
            // @ts-ignore
            market: group.metadata.market,
            book: price.book,
            period: group.metadata.period,
            expected: likelihood,
            actual: didHomeWin ? 1 : 0
          });
        })
      );
    }
    // @ts-ignore
    if (group.metadata.market === Market.GAME_TOTAL) {
      // @ts-ignore
      const gameTotal = thisPeriodScores?.total;
      group.values.forEach((pricedValue: PricedValue) =>
        pricedValue.prices.forEach((price: Price) => {
          const likelihood = Odds.fromVigAmerican(
            price.overPrice,
            price.underPrice
          ).toProbability();
          const adjustedValue = pricedValue.value * (1 + likelihood - 0.5);
          counts.push({
            league: group.metadata.league,
            // @ts-ignore
            market: group.metadata.market,
            book: price.book,
            period: group.metadata.period,
            expected: adjustedValue,
            actual: gameTotal
          });
        })
      );
    }
    // @ts-ignore
    if (group.metadata.market === Market.TEAM_TOTAL) {
      // @ts-ignore
      const teamTotal =
        group.metadata.side === "Home" ? thisPeriodScores?.home : thisPeriodScores?.away;
      group.values.forEach((pricedValue: PricedValue) =>
        pricedValue.prices.forEach((price: Price) => {
          const likelihood = Odds.fromVigAmerican(
            price.overPrice,
            price.underPrice
          ).toProbability();
          const adjustedValue = pricedValue.value * (1 + likelihood - 0.5);
          counts.push({
            league: group.metadata.league,
            // @ts-ignore
            market: group.metadata.market,
            book: price.book,
            period: group.metadata.period,
            expected: adjustedValue,
            actual: teamTotal
          });
        })
      );
    }
    // @ts-ignore
    if (group.metadata.market === Market.SPREAD) {
      const homeWinMargin =
        group.metadata.side === "Away"
          ? // @ts-ignore
            thisPeriodScores?.home - thisPeriodScores?.away
          : // @ts-ignore
            thisPeriodScores?.away - thisPeriodScores?.home;
      group.values.forEach((pricedValue: PricedValue) =>
        pricedValue.prices.forEach((price: Price) => {
          const likelihood = Odds.fromVigAmerican(
            price.overPrice,
            price.underPrice
          ).toProbability();
          const adjustedValue = pricedValue.value * (1 + likelihood - 0.5);
          counts.push({
            league: group.metadata.league,
            // @ts-ignore
            market: group.metadata.market,
            book: price.book,
            period: group.metadata.period,
            expected: adjustedValue,
            actual: homeWinMargin
          });
        })
      );
    }
  });
  // @ts-ignore
  matchingPropGroups.forEach((group: PropGroup) => {
    const matchingPlayer = resultMetadata.players.find(
      (p) => p.name === group.metadata.player.name
    );
    const matchingStat = matchingPlayer?.stats.find((s) => s.stat === group.metadata.propStat);

    group.values.forEach((pricedValue) =>
      pricedValue.prices.forEach((price) => {
        const likelihood = Odds.fromVigAmerican(price.overPrice, price.underPrice).toProbability();
        counts.push({
          league: group.metadata.league,
          stat: group.metadata.propStat,
          book: price.book,
          expected: likelihood,
          actual: matchingStat?.value
        });
      })
    );
  });
  console.log(counts);
  return counts;
};

const testMap = new Map([
  [Book.PINNACLE, 2.5],
  [Book.DRAFTKINGS, 2],
  [Book.FANDUEL, 2],
  [Book.BETRIVERS, 0.5],
  [Book.CAESARS, 0.75],
  [Book.TWINSPIRES, 0],
  [Book.POINTSBET, 2],
  [Book.WYNNBET, 1.5],
  [Book.BETMGM, 0.75]
]);

const scraper = new NFLScraper();
scraper.populateDB();
