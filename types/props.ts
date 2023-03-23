import { Book } from "./books";
import { LineChoice } from "./lines";

export enum PropsPlatform {
  UNDERDOG = "Underdog (3p)",
  PRIZEPICKS = "PrizePicks (5p)",
  THRIVE = "Thrive",
  NO_HOUSE = 'No House Advantage (5p)',
  MONKEY_KNIFE_FIGHT = 'Monkey Knife Fight'
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

  GOALS = "goals",
  SHOTS_ON_GOAL = "shotsOnGoal",
  GOALS_PLUS_ASSISTS = "goalsPlusAssists",
  ASSISTS = "assists",
  POWER_PLAY_POINTS = "powerPlayPoints",
  SAVES = "saves",
  GOALS_AGAINST = "goalsAgainst",
  HOCKEY_POINTS = 'hockeyPoints',
  HOCKEY_ASSISTS = 'hockeyAssists',

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

export interface Prop {
  book: PropsPlatform | Book;
  value: number;
  stat: PropsStat;
  player: string;
  team: string;
  price: number;
  choice: LineChoice;
}
