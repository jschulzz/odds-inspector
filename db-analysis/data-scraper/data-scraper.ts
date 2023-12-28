import { PlayerManager } from "../../database/mongo.player";
import { TeamManager } from "../../database/mongo.team";
import {
  Book,
  League,
  Market,
  Period,
  Price,
  PricedValue,
  PropsStat
} from "../../frontend/src/types";
import path from "path";
import { readFileSync, writeFileSync } from "fs";
import axios, { all } from "axios";
import { ResultMetadata } from "../accuracy";
import { getConnection } from "../../database/mongo.connection";
import { GroupManager, GroupSearchQuery } from "../../database/mongo.group";
import { GameLineManager } from "../../database/mongo.game-line";
import { PlayerPropManager } from "../../database/mongo.player-prop";
import { GameManager } from "../../database/mongo.game";
import { findGameLines } from "../game-lines";
import { getProps } from "../player-props";
import { Odds } from "../../odds/odds";
import { groupBy } from "lodash";

export type StatError = {
  league: League;
  market?: Market;
  stat?: PropsStat;
  book: Book;
  period?: Period;
  values: PricedValue[];
  expected: number;
  actual: number;
};

export class GameScraper {
  private league: League;
  teamManager: TeamManager;
  playerManager: PlayerManager;
  groupManager: GroupManager;
  gameLineManager: GameLineManager;
  playerPropManager: PlayerPropManager;
  gameManager: GameManager;
  constructor(league: League) {
    this.league = league;
    this.teamManager = new TeamManager();
    this.playerManager = new PlayerManager();
    this.groupManager = new GroupManager();
    this.gameLineManager = new GameLineManager();
    this.playerPropManager = new PlayerPropManager();
    this.gameManager = new GameManager();
  }

  getLeague() {
    return this.league;
  }

  async populateDB() {
    await getConnection();
    const now = new Date();
    const yesterday = now;
    yesterday.setDate(now.getDate() - 4);
    const gameLineGroups = await findGameLines(this.league, yesterday);
    const propGroups = await getProps(this.league, yesterday);
    for (let group of gameLineGroups) {
      await this.groupManager.tryToInsert(group);
    }
    for (let group of propGroups) {
      await this.groupManager.tryToInsert(group);
    }
    console.log("Done");
  }

  async backupAndFetch(url: string): Promise<string> {
    const fileName = url.split("//")[1].replaceAll("/", "_");
    //https://www.pro-football-reference.com/years/2023/week_4.htm
    // https://www.sports-reference.com/cfb/boxscores/
    const savedFile = path.join(__filename, `../../backup/${fileName}`);
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
  }

  async findTeam(name: string) {
    return this.teamManager.findByName(name, this.league);
  }
  async findPlayer(name: string) {
    return this.playerManager.findByName(name, this.league);
  }

  async parseScoreboard(startDate?: Date, endDate?: Date): Promise<StatError[]> {
    throw Error("parseScoreboard has not been implemented`");
  }

  async parseGame(gameLink: string): Promise<ResultMetadata> {
    throw Error("parseGame has not been implemented");
  }

  async calculateErrors(gameUrl: string): Promise<StatError[]> {
    let resultMetadata: ResultMetadata;
    try {
      resultMetadata = await this.parseGame(gameUrl);
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
    const matchingGameGroups = await this.groupManager.findGroupsByMetadata(gameGroupSearchQuery);
    const matchingPropGroups = await this.groupManager.findGroupsByMetadata(propGroupSearchQuery);
    const counts: StatError[] = [];
    if (!matchingGameGroups) {
      return [];
    }
    // @ts-ignore
    matchingGameGroups.forEach((group: GameLineGroup) => {
      // @ts-ignore
      const thisPeriodScores = resultMetadata.scores.find(
        (s) => s.period === group.metadata.period
      );
      if (!thisPeriodScores) {
        return;
      }
      const marketToCalculations = new Map<Market, number>([
        [Market.MONEYLINE, thisPeriodScores.home > thisPeriodScores.away ? 1 : 0],
        [
          Market.SPREAD,
          group.metadata.side === "Away"
            ? thisPeriodScores.home - thisPeriodScores.away
            : thisPeriodScores.away - thisPeriodScores.home
        ],
        [Market.GAME_TOTAL, thisPeriodScores.total],
        [
          Market.TEAM_TOTAL,
          group.metadata.side === "Home" ? thisPeriodScores.home : thisPeriodScores.away
        ]
      ]);

      let likelihoodModifier = (pricedValue: PricedValue, likelihood: number) => likelihood;
      if ([Market.GAME_TOTAL, Market.TEAM_TOTAL].includes(group.metadata.market)) {
        likelihoodModifier = (pricedValue: PricedValue, likelihood: number) =>
          pricedValue.value * (1 + likelihood - 0.5);
      }

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
            expected: likelihoodModifier(pricedValue, likelihood),
            actual: marketToCalculations.get(group.metadata.market) as number,
            values: group.values
          });
        })
      );
    });
    // @ts-ignore
    matchingPropGroups.forEach((group: PropGroup) => {
      const matchingPlayer = resultMetadata.players.find(
        (p) => p.name === group.metadata.player.name
      );
      const matchingStat = matchingPlayer?.stats.find((s) => s.stat === group.metadata.propStat);

      group.values.forEach((pricedValue: PricedValue) =>
        pricedValue.prices.forEach((price: Price) => {
          const likelihood = Odds.fromVigAmerican(
            price.overPrice,
            price.underPrice
          ).toProbability();
          counts.push({
            league: group.metadata.league,
            stat: group.metadata.propStat,
            book: price.book,
            expected: likelihood,
            actual: matchingStat?.value as number,
            values: group.values
          });
        })
      );
    });
    return counts;
  }

  async aggregateErrors() {
    const allErrors = await this.parseScoreboard();
    console.log("errors:", allErrors);
    const summary: any[] = [];
    const groupedByBook = groupBy(allErrors, "book");
    Object.entries(groupedByBook).forEach(([book, bookGroup]: [string, any[]]) => {
      const groupedByLeague = groupBy(bookGroup, "league");
      Object.entries(groupedByLeague).forEach(([league, leagueGroup]: [string, any[]]) => {
        const groupedByMarket = groupBy(leagueGroup, "market");
        Object.entries(groupedByMarket).forEach(([market, marketGroup]: [string, any[]]) => {
          const groupedByPeriod = groupBy(marketGroup, "period");
          Object.entries(groupedByPeriod).forEach(([period, periodGroup]: [string, any[]]) => {
            let error = 0;
            periodGroup.forEach((item) => (error += (item.expected - item.actual) ** 2));
            error /= leagueGroup.length;
            summary.push({ book, market, league, error, period });
          });
          let error = 0;
          marketGroup.forEach((item) => (error += (item.expected - item.actual) ** 2));
          error /= leagueGroup.length;
          summary.push({ book, market, league, error });
        });
        const groupedByStat = groupBy(leagueGroup, "stat");
        Object.entries(groupedByStat).forEach(([stat, statGroup]: [string, any[]]) => {
          let error = 0;
          statGroup.forEach((item) => (error += (item.expected - item.actual) ** 2));
          error /= leagueGroup.length;
          summary.push({ book, stat, league, error });
        });
      });
    });
    const sorted = summary.sort((a, b) => (a.error > b.error ? 1 : -1));
    const groupedByMarket = groupBy(
      sorted.filter((s) => s.market),
      "market"
    );
    Object.entries(groupedByMarket).forEach(([market, marketErrors]: [string, any[]]) => {
      if (market) {
        console.log(market);
        const groupedByPeriod = groupBy(
          marketErrors.filter((s) => s.period),
          "period"
        );
        Object.entries(groupedByPeriod).forEach(([period, errors]: [string, any[]]) => {
          console.log(`\t${period}`)
          const sortedErrors = errors.sort((a, b) => (a.error > b.error ? 1 : -1));
          sortedErrors.forEach((e) => {
            console.log(`\t\t${e.book}: ${e.error}`);
          });
        });
      }
    });
    const groupedByStat = groupBy(
      sorted.filter((s) => s.stat),
      "stat"
    );
  }
}
