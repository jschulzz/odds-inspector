import { Schema, model, InferSchemaType, Types } from "mongoose";
import { Book, League, PropsPlatform, PropsStat } from "../types";
import { getConnection } from "./mongo.connection";
import { Player } from "./mongo.player";
import { Game } from "./mongo.game";

export const playerPropSchema = new Schema({
  player: { type: Schema.ObjectId, required: true },
  game: { type: Schema.ObjectId, required: true },
  league: { type: String, required: true },
  propStat: { type: String, required: true },
  value: { type: Number, required: true }
});

export type PlayerProp = InferSchemaType<typeof playerPropSchema>;

const PlayerPropModel = model("player-prop", playerPropSchema);

export class PlayerPropManager {
  constructor() {}

  async upsert(player: Player, game: Game, league: League, propStat: PropsStat, value: number) {
    await getConnection();

    let playerProp;
    try {
      playerProp = await PlayerPropModel.findOneAndUpdate(
        {
          player,
          game,
          league,
          propStat,
          value
        },
        {
          _id: new Types.ObjectId(),
          player,
          game,
          league,
          propStat,
          value
        },
        { upsert: true, returnDocument: "after" }
      );
      console.log(`Adding player prop: ${league} ${player.name}: ${value} ${propStat}`);
    } catch {
      playerProp = await PlayerPropModel.findOneAndUpdate(
        {
          player,
          game,
          league,
          propStat,
          value
        },
        {
          player,
          game,
          league,
          propStat,
          value
        },
        { upsert: true, returnDocument: "after" }
      );
    }
    return playerProp.toObject();
  }

  async deleteMany(ids: Types.ObjectId[]) {
    await getConnection();

    const results = await PlayerPropModel.deleteMany({
      _id: { $in: ids }
    }).exec();
    console.log(`Deleted ${results.deletedCount} player props`);
  }

  async findByLeague(league: League) {
    await getConnection();

    const results = await PlayerPropModel.find({
      league
    });
    return results;
  }

  async findPropsForGame(id: Types.ObjectId) {
    await getConnection();
    const props = await PlayerPropModel.find({
      game: id
    });
    return props;
  }

  async findAlternateLines(prop: PlayerProp) {
    await getConnection();
    const alternateLines = await PlayerPropModel.find({
      league: prop.league,
      player: prop.player,
      game: prop.game,
      propStat: prop.propStat,
      value: { $ne: prop.value }
    })
      .populate("game")
      .exec();
    return alternateLines;
  }
}
