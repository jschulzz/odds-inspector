import { League, Period, PropsStat } from "../../frontend/src/types";
import { ResultMetadata } from "../accuracy";
import { GameScraper, StatError } from "./data-scraper";
import { load } from "cheerio";

export class NFLScraper extends GameScraper {
  constructor() {
    super(League.NFL);
  }

  async parseScoreboard(startDate?: Date, endDate?: Date): Promise<StatError[]> {
    const html = await this.backupAndFetch("https://www.pro-football-reference.com/boxscores/");
    const $ = load(html);
    const links = $(".game_summaries")
      .find(".gamelink")
      .find("a")
      .toArray()
      .map((x) => $(x).attr("href"));
    const allErrors: StatError[] = [];
    for (const link of links) {
      const errors = await this.calculateErrors("https://www.pro-football-reference.com" + link);
      allErrors.push(...errors);
    }
    return allErrors;
  }

  async parseGame(link: string): Promise<ResultMetadata> {
    const html = await this.backupAndFetch(link);
    const $ = load(html);

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
    const homeTeam = await this.findTeam(homeTeamName);
    const awayTeam = await this.findTeam(awayTeamName);
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
        player = await this.findPlayer(playerName);
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
  }
}
