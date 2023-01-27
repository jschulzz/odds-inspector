import { PropsStat } from "../types";

const statMaps = [
  {
    names: [
      "Fantasy Points",
      "Fantasy Score",
      "Hitter Fantasy Score",
      "Pitcher Fantasy Score",
    ],
    stat: PropsStat.FANTASY_POINTS,
  },
  { names: ["Interceptions", "INT"], stat: PropsStat.INTERCEPTIONS },
  {
    names: [
      "Passing + Rushing Yards",
      "Total Yards",
      "Pass+Rush Yds",
      "Pass YDS, Rush YDS",
    ],
    stat: PropsStat.PASSING_RUSHING_YARDS,
  },
  {
    names: ["Passing Attempts", "PassAttempts", "Pass Attempts"],
    stat: PropsStat.PASS_ATTEMPTS,
  },
  {
    names: ["Passing Completions", "Completions", "Pass Completions", "CMP"],
    stat: PropsStat.PASS_COMPLETIONS,
  },
  {
    names: [
      "Passing Touchdowns",
      "TouchdownPasses",
      "Passing TDs",
      "Pass TD's",
      "Pass TDs",
    ],
    stat: PropsStat.PASSING_TDS,
  },
  {
    names: ["Passing Yards", "PassingYards", "Pass Yards", "Pass YDS"],
    stat: PropsStat.PASSING_YARDS,
  },
  {
    names: ["Receiving Yards", "ReceivingYards", "Rec YDS"],
    stat: PropsStat.RECEIVING_YARDS,
  },
  {
    names: [
      "TouchdownReceptions",
      "Rec TDs",
      "Receiving Touchdowns",
      "Receiving TDs",
    ],
    stat: PropsStat.RECEIVING_TDS,
  },
  {
    names: ["Receptions", "PassReceptions", "REC"],
    stat: PropsStat.RECEPTIONS,
  },
  {
    names: ["LongestReception", "Longest Reception"],
    stat: PropsStat.LONGEST_RECEPTION,
  },
  {
    names: ["Rushing + Receiving Yards", "Rush+Rec Yds", "Rush YDS, Rec YDS"],
    stat: PropsStat.RECEIVING_RUSHING_YARDS,
  },
  {
    names: [
      "Rushing + Receiving TDs",
      "Total TDs",
      "Pass+Rush+Rec TDs",
      "Rush+Rec TDs",
    ],
    stat: PropsStat.TOTAL_TDS,
  },
  { names: ["Longest Rush"], stat: PropsStat.LONGEST_RUSH },
  {
    names: ["Rushing Attempts", "Rush Attempts"],
    stat: PropsStat.RUSH_ATTEMPTS,
  },
  {
    names: [
      "RushingTouchdowns",
      "Rush TDs",
      "Rushing Touchdowns",
      "Rushing TDs",
    ],
    stat: PropsStat.RUSHING_TDS,
  },
  {
    names: ["Rushing Yards", "RushingYards", "Rush Yards", "Rush YDS"],
    stat: PropsStat.RUSHING_YARDS,
  },
  {
    names: ["Longest Passing Completion", "LongestPassComplete"],
    stat: PropsStat.LONGEST_PASSING_COMPLETION,
  },
  {
    names: ["Field Goal Made", "FG Made"],
    stat: PropsStat.FIELD_GOALS_MADE,
  },
  {
    names: ["Kicking Points", "KickingPoints"],
    stat: PropsStat.KICKING_POINTS,
  },
  {
    names: ["Extra Point Made", "XP Made"],
    stat: PropsStat.EXTRA_POINTS_MADE,
  },
  {
    names: ["Tackles + Assists", "Tackles+Ast"],
    stat: PropsStat.TACKLES_ASSISTS,
  },
  { names: ["Tackles"], stat: PropsStat.TACKLES },
  { names: ["Sacks"], stat: PropsStat.SACKS },

  { names: ["Strikeouts", "Ks"], stat: PropsStat.STRIKEOUTS },
  { names: ["Walks"], stat: PropsStat.WALKS },
  {
    names: ["TotalBases", "Total Bases", "BASEs"],
    stat: PropsStat.TOTAL_BASES,
  },
  { names: ["Hits", "HITs"], stat: PropsStat.HITS },
  { names: ["Hits Allowed"], stat: PropsStat.HITS_ALLOWED },
  { names: ["RBIs"], stat: PropsStat.RBIS },
  { names: ["Home Runs", "HomeRuns"], stat: PropsStat.HOME_RUNS },
  { names: ["Doubles"], stat: PropsStat.DOUBLES },
  { names: ["Singles"], stat: PropsStat.SINGLES },
  { names: ["Triples"], stat: PropsStat.TRIPLES },
  { names: ["Stolen Bases"], stat: PropsStat.STOLEN_BASES },
  {
    names: ["EarnedRuns", "Earned Runs", "Earned Runs Allowed"],
    stat: PropsStat.EARNED_RUNS,
  },
  { names: ["PitchingOuts", "Outs"], stat: PropsStat.PITCHING_OUTS },
  { names: ["Runs"], stat: PropsStat.RUNS },

  { names: ["Goals", "GOLs"], stat: PropsStat.GOALS },
  {
    names: ["Shots", "ShotsOnGoal", "Shots On Goal"],
    stat: PropsStat.SHOTS_ON_GOAL,
  },
  { names: ["Assists", "ASTs", "ASTS"], stat: PropsStat.ASSISTS },
  { names: ["Points", "PTS", "GOLs, ASTs"], stat: PropsStat.POINTS },
  { names: ["Power Play Points"], stat: PropsStat.POWER_PLAY_POINTS },
  { names: ["Saves", "Goalie Saves", "SAVs"], stat: PropsStat.SAVES },
  { names: ["Goals Against", "Goals Allowed"], stat: PropsStat.GOALS_AGAINST },

  { names: ["Steals", "STLS"], stat: PropsStat.STEALS },
  { names: ["TurnOvers", "Turnovers"], stat: PropsStat.TURNOVERS },
  {
    names: [
      "StealsBlocks",
      "Blocks + Steals",
      "Blks+Stls",
      "BLKS, STLS",
      "Steals + Blocks",
    ],
    stat: PropsStat.STEALS_PLUS_BLOCKS,
  },
  {
    names: ["Points + Assists", "Pts+Asts", "PTS, ASTS"],
    stat: PropsStat.POINTS_PLUS_ASSISTS,
  },
  {
    names: ["Points + Rebounds", "Pts+Rebs", "PTS, REBS"],
    stat: PropsStat.POINTS_PLUS_REBOUNDS,
  },
  {
    names: ["Rebounds + Assists", "Rebs+Asts", "REBS, ASTS"],
    stat: PropsStat.REBOUNDS_PLUS_ASSISTS,
  },
  {
    names: [
      "Pts + Rebs + Asts",
      "PointsReboundsAssist",
      "Pts+Rebs+Asts",
      "PTS, REBS, ASTS",
      "Points + Rebounds + Assists",
    ],
    stat: PropsStat.PRA,
  },
  { names: ["Blocks", "Blocked Shots", "BLKS"], stat: PropsStat.BLOCKS },
  { names: ["Rebounds", "REBS"], stat: PropsStat.REBOUNDS },
  { names: ["DoubleDouble", "Double-Double"], stat: PropsStat.DOUBLE_DOUBLE },
  {
    names: [
      "3-Pointers Made",
      "ThreePointFieldGoals",
      "3-PT Made",
      "Three Points Made",
    ],
    stat: PropsStat.THREE_POINTERS_MADE,
  },
  {
    names: ["FT Made", "Free Throws Made"],
    stat: PropsStat.FREE_THROWS_MADE,
  },
];

export const findStat = (stat: string) => {
  for (const statNames of statMaps) {
    if (statNames.names.includes(stat)) {
      return statNames.stat;
    }
  }
  console.log(`No known stat ${stat}`);
};
