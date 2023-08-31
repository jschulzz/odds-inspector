import { Schema, model, InferSchemaType, Types } from "mongoose";
import { Market, Period } from "../types";
import { getConnection } from "./mongo.connection";
import { Game } from "./mongo.game";

export const gameLineSchema = new Schema({
  game: { type: Schema.ObjectId, required: true },
  type: { type: String, required: true },
  period: { type: String, required: true },
  value: { type: Number },
  side: { type: String }
});

export type GameLine = InferSchemaType<typeof gameLineSchema>;

const GameLineModel = model("game-line", gameLineSchema);

export enum HomeOrAway {
  HOME = "Home",
  AWAY = "Away"
}

interface GameTotalMetadata {
  value: number;
}

interface TeamTotalMetadata {
  value: number;
  side: HomeOrAway;
}

interface SpreadMetadata {
  value: number;
  side: HomeOrAway;
}

export type GameLineMetadata = GameTotalMetadata | TeamTotalMetadata | SpreadMetadata;

export class GameLineManager {
  constructor() {}

  private async tryToInsert(game: Game, period: Period, type: Market, metadata?: GameLineMetadata) {
    await getConnection();
    let gameLine;
    try {
      gameLine = await GameLineModel.findOneAndUpdate(
        {
          game,
          type,
          period,
          ...metadata
        },
        {
          _id: new Types.ObjectId(),
          game,
          type,
          period,
          ...metadata
        },
        { upsert: true, returnDocument: "after" }
      );
    } catch {
      gameLine = await GameLineModel.findOneAndUpdate(
        {
          game,
          type,
          period,
          ...metadata
        },
        {
          game,
          type,
          period,
          ...metadata
        },
        { upsert: true, returnDocument: "after" }
      );
    }
    return gameLine;
  }

  async upsertGameTotal(game: Game, period: Period, metadata: GameTotalMetadata) {
    await getConnection();
    const gameLine = await this.tryToInsert(game, period, Market.GAME_TOTAL, metadata);

    return gameLine;
  }

  async upsertTeamTotal(game: Game, period: Period, metadata: TeamTotalMetadata) {
    await getConnection();
    const gameLine = await this.tryToInsert(game, period, Market.TEAM_TOTAL, metadata);

    return gameLine;
  }

  async upsertSpread(game: Game, period: Period, metadata: SpreadMetadata) {
    await getConnection();
    const gameLine = await this.tryToInsert(game, period, Market.SPREAD, metadata);

    return gameLine;
  }

  async upsertMoneyline(game: Game, period: Period) {
    await getConnection();
    const gameLine = await this.tryToInsert(game, period, Market.MONEYLINE);

    return gameLine;
  }

  async findAlternateLines(line: GameLine) {
    await getConnection();
    const alternateLines = await GameLineModel.find({
      game: line.game,
      side: line.side,
      type: line.type,
      value: { $ne: line.value }
    })
      .populate("game")
      .exec();
    return alternateLines;
  }

  async findLinesForGames(games: Types.ObjectId[]) {
    await getConnection();
    const lines = await GameLineModel.find({
      game: { $in: games }
    }).exec();
    return lines;
  }
}
