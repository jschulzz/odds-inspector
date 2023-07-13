import { Schema, model, InferSchemaType, Types } from "mongoose";
import { League } from "../types";
import { getConnection } from "./mongo.connection";
import { Team, TeamManager } from "./mongo.team";

export const gameSchema = new Schema({
  homeTeam: { type: Schema.ObjectId, required: true },
  awayTeam: { type: Schema.ObjectId, required: true },
  league: { type: String, required: true },
  gameTime: { type: Date, required: true }
});

export type Game = InferSchemaType<typeof gameSchema>;

const GameModel = model("Game", gameSchema);

export class GameManager {
  constructor() {}

  async upsert(homeTeam: Team, awayTeam: Team, gameTime: Date, league: League) {
    await getConnection();
    console.log(
      `Adding game: ${awayTeam.abbreviation} @ ${homeTeam.abbreviation} ${league} ${gameTime}`
    );
    let game;
    try {
      game = await GameModel.findOneAndUpdate(
        {
          homeTeam,
          awayTeam,
          league,
          gameTime
        },
        {
          _id: new Types.ObjectId(),
          homeTeam,
          awayTeam,
          league,
          gameTime
        },
        { upsert: true, returnDocument: "after" }
      );
    } catch {
      game = await GameModel.findOneAndUpdate(
        {
          homeTeam,
          awayTeam,
          league,
          gameTime
        },
        {
          homeTeam,
          awayTeam,
          league,
          gameTime
        },
        { upsert: true, returnDocument: "after" }
      );
    }
    const populated = await game!.populate(["homeTeam", "awayTeam"]);
    return populated.toObject();
  }

  async findById(id: Types.ObjectId) {
    await getConnection();

    const findById: Game | null = await GameModel.findById(id);
    if (findById) {
      return findById;
    }
    throw new Error("Could not find by ID");
  }

  async findByLeague(league: League, after?: Date) {
    await getConnection();

    const findByLeague: Game[] | null = await GameModel.find({
      league,
      ...(after ? { gameTime: { $gte: after } } : {})
    });
    if (findByLeague) {
      return findByLeague;
    }
    throw new Error("Could not find by ID");
  }

  async findByTeamAbbr(abbreviation: string, league: League) {
    await getConnection();
    const teamManager = new TeamManager();
    const team = await teamManager.findByAbbreviation(abbreviation, league);
    const todayWhereHome = await GameModel.find({
      homeTeam: team,
      gameTime: { $gte: new Date() }
    });
    const todayWhereAway = await GameModel.find({
      awayTeam: team,
      gameTime: { $gte: new Date() }
    });
    if (todayWhereHome.length === 1) {
      return todayWhereHome[0];
    }
    if (todayWhereAway.length === 1) {
      return todayWhereAway[0];
    }
    console.log({ abbreviation });
    throw new Error("Could not find single game for that team after now");
  }
}
