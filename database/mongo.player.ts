import { Schema, model, InferSchemaType, Types } from "mongoose";
import stringSimilarity from "string-similarity";

import { League } from "../types";
import { getConnection } from "./mongo.connection";
// @ts-ignore
import mongoose_fuzzy_searching from "mongoose-fuzzy-searching";
import { TeamManager } from "./mongo.team";

export const playerSchema = new Schema({
  name: { type: String, required: true },
  team: { type: Schema.ObjectId, required: true },
  league: { type: String, required: true }
});

playerSchema.plugin(mongoose_fuzzy_searching, { fields: ["name"] });
playerSchema.index({ name: "text" });

export type Player = InferSchemaType<typeof playerSchema>;

const PlayerModel = model("Player", playerSchema);

export class PlayerManager {
  constructor() {}

  async findByName(name: string, league: League) {
    await getConnection();

    const findByExactName: Player | null = await PlayerModel.findOne({ name });
    if (findByExactName) {
      return findByExactName;
    }
    // @ts-ignore
    const players = await PlayerModel.fuzzySearch(name, { league });
    const filteredPlayers: Player[] = players.filter((p: any) => {
      // return t.toObject().confidenceScore > 15;
      return stringSimilarity.compareTwoStrings(p.toObject().name, name) > 0.8;
    });
    if (!filteredPlayers.length) {
      console.error("Could not find player", { name, league });
      throw new Error("Could not find player");
    }
    if (filteredPlayers.length > 1) {
      // @ts-ignore
      if (filteredPlayers[0].toObject().name === name) {
        return filteredPlayers[0];
      }
      throw new Error("Too many player matches");
    }
    return filteredPlayers[0];
  }

  async findById(id: Types.ObjectId) {
    await getConnection();

    const findByExactName: Player | null = await PlayerModel.findById(id);
    if (findByExactName) {
      return findByExactName;
    }
    throw new Error("Could not find by ID");
  }

  async add(name: string, abbreviation: string, league: League) {
    await getConnection();
    console.log("Adding player", { name, league });
    const teamManager = new TeamManager();
    try {
      const team = await teamManager.findByAbbreviation(abbreviation, league);
      let player;
      try {
        player = await PlayerModel.findOneAndUpdate(
          { name, league, team },
          { _id: new Types.ObjectId(), name, league, team },
          { upsert: true, returnDocument: "after" }
        );
      } catch {
        player = await PlayerModel.findOneAndUpdate(
          { name, league, team },
          { name, league, team },
          { upsert: true, returnDocument: "after" }
        );
      }
      console.log("Added player");
      return player?.toObject();
    } catch (error) {
      console.error(error);
      throw new Error("Could not add Player");
    }
  }

  async findOrAdd(name: string, abbreviation: string, league: League) {
    await getConnection();
    if (name.includes("+")) {
      throw new Error("Does not handle combos");
    }
    let player;
    try {
      player = await this.findByName(name, league);
    } catch {
      console.log("Could not find player, now attempting to add");
      try {
        player = await this.add(name, abbreviation, league);
      } catch {
        console.error("Could not add player");
      }
    }

    return player;
  }
}
