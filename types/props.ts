import { Player } from "../analysis/player";
import { PlayerRegistry } from "../analysis/player-registry";
import { Book } from "./books";
import { LineChoice } from "./lines";

export enum PropsPlatform {
  UNDERDOG = "Underdog (3p)",
  PRIZEPICKS = "PrizePicks (5p)",
  THRIVE = "Thrive",
  NO_HOUSE = "No House Advantage (5p)",
  MONKEY_KNIFE_FIGHT = "Monkey Knife Fight",
}

export enum PropsStat {
  FANTASY_POINTS = "fantasyPoints",

  RECEPTIONS = "receptions",
  RECEIVING_YARDS = "receivingYards",
  LONGEST_RECEPTION = "longestReception",
  RECEIVING_TDS = "receivingTouchdowns",
  RUSH_ATTEMPTS = "rushAttempts",
  RUSHING_YARDS = "rushingYards",
  RUSHING_TDS = "rushingTouchdowns",
  LONGEST_RUSH = "longestRush",
  PASSING_YARDS = "passingYards",
  PASSING_TDS = "passingTouchdowns",
  TOTAL_TDS = "totalTouchdowns",
  PASS_ATTEMPTS = "passAttempts",
  PASS_COMPLETIONS = "passCompletions",
  LONGEST_PASSING_COMPLETION = "longestPassingCompletion",
  INTERCEPTIONS = "interceptions",
  RECEIVING_RUSHING_YARDS = "receivingAndRushingYards",
  PASSING_RUSHING_YARDS = "passingAndRushingYards",
  TACKLES_ASSISTS = "tacklesAndAssists",
  TACKLES = "tackles",
  SACKS = "sacks",
  KICKING_POINTS = "kickingPoints",
  FIELD_GOALS_MADE = "fieldGoalsMade",
  EXTRA_POINTS_MADE = "extraPointsMade",

  STRIKEOUTS = "strikeouts",
  WALKS = "walks",
  TOTAL_BASES = "totalBases",
  HITS = "hits",
  HITS_ALLOWED = "hitsAllowed",
  RBIS = "rbis",
  HOME_RUNS = "homeRuns",
  EARNED_RUNS = "earnedRuns",
  PITCHING_OUTS = "pitchingOuts",
  RUNS = "runs",
  DOUBLES = "doubles",
  SINGLES = "singles",
  TRIPLES = "triples",
  STOLEN_BASES = "stolenBases",
  HITS_RUNS_RBIS = "hitsPlusRunsPlusRBIs",

  GOALS = "goals",
  SHOTS_ON_GOAL = "shotsOnGoal",
  GOALS_PLUS_ASSISTS = "goalsPlusAssists",
  ASSISTS = "assists",
  POWER_PLAY_POINTS = "powerPlayPoints",
  SAVES = "saves",
  GOALS_AGAINST = "goalsAgainst",
  HOCKEY_POINTS = "hockeyPoints",
  HOCKEY_ASSISTS = "hockeyAssists",

  TURNOVERS = "turnovers",
  STEALS_PLUS_BLOCKS = "stealsPlusBlocks",
  BLOCKS = "blocks",
  PRA = "pointsPlusReboundsPlusAssists",
  THREE_POINTERS_MADE = "threePointersMade",
  REBOUNDS = "rebounds",
  DOUBLE_DOUBLE = "doubleDouble",
  POINTS_PLUS_ASSISTS = "pointsPlusAssists",
  POINTS_PLUS_REBOUNDS = "pointsPlusRebounds",
  REBOUNDS_PLUS_ASSISTS = "reboundsPlusAssists",
  STEALS = "steals",
  POINTS = "points",
  FREE_THROWS_MADE = "freeThrowsMade",
}

export interface PropArgs {
  book: PropsPlatform | Book;
  value: number;
  stat: PropsStat;
  playerName: string;
  team: string;
  price: number;
  choice: LineChoice;
}
export class Prop {
  public book: PropsPlatform | Book;
  public value: number;
  public stat: PropsStat;
  public player: Player;
  public price: number;
  public choice: LineChoice;

  constructor(args: PropArgs, playerRegistry: PlayerRegistry) {
    this.book = args.book;
    this.value = args.value;
    this.stat = args.stat;
    this.price = args.price;
    this.choice = args.choice;

    const tempPlayer = new Player(args.playerName, args.team);

    const { players, exact } = playerRegistry.find(tempPlayer);

    if (!players.length || args.playerName.includes("+")) {
      this.player = tempPlayer;
      playerRegistry.add(this.player);
    } else if (exact) {
      this.player = players[0];
      if (!this.player.team) {
        this.player.team = args.team;
      }
    } else {
      console.log(
        `Who is this? ${args.playerName}\n\t${players
          .map((x) => x.name)
          .join("\n\t")}`
      );
      this.player = players[0];
      players[0].addAlias(args.playerName, args.team);
    }
  }
}
