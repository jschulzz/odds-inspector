import { Schema, model, InferSchemaType, Types } from "mongoose";
import { League } from "../frontend/src/types";
import { getConnection } from "./mongo.connection";
import { Team, TeamManager } from "./mongo.team";
import { WithId } from "./types";

export const gameSchema = new Schema({
  homeTeam: { type: Schema.ObjectId, required: true, ref: "Team" },
  awayTeam: { type: Schema.ObjectId, required: true, ref: "Team" },
  league: { type: String, required: true },
  gameTime: { type: Date, required: true }
});

export type Game = InferSchemaType<typeof gameSchema>;

const GameModel = model("Game", gameSchema);

export class GameManager {
  constructor() {}

  async upsert(homeTeam: Team, awayTeam: Team, gameTime: Date, league: League) {
    await getConnection();
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
      console.log(
        `Added game: ${awayTeam.abbreviation} @ ${homeTeam.abbreviation} ${league} ${gameTime}`
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

  async deleteByLeague(league: League) {
    await getConnection();

    const results = await GameModel.deleteMany({
      league
    }).exec();

    console.log(`Deleted ${results.deletedCount} games`);
  }
  async deleteMany(ids: Types.ObjectId[]) {
    await getConnection();

    const results = await GameModel.deleteMany({
      _id: { $in: ids }
    }).exec();
    console.log(`Deleted ${results.deletedCount} games`);
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

    const findByLeague: WithId<Game>[] | null = await GameModel.find({
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
