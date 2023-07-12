import { Schema, model, InferSchemaType, Types } from "mongoose";
import { League } from "../types";
import { getConnection } from "./mongo.connection";
// @ts-ignore
import mongoose_fuzzy_searching from "mongoose-fuzzy-searching";
import stringSimilarity from "string-similarity";

export const teamSchema = new Schema({
  name: { type: String, required: true },
  league: { type: String, required: true },
  abbreviation: { type: String, required: true },
});

teamSchema.plugin(mongoose_fuzzy_searching, { fields: ["name"] });
teamSchema.index({ name: "text" });

export type Team = InferSchemaType<typeof teamSchema>;

const TeamModel = model("Team", teamSchema);

export class TeamManager {
  constructor() {}

  async findByName(name: string, league: League) {
    await getConnection();

    const findByExactName: Team | null = await TeamModel.findOne({ name });
    if (findByExactName) {
      return findByExactName;
    }
    // @ts-ignore
    const teams = await TeamModel.fuzzySearch(name, { league });
    const filteredTeams: Team[] = teams.filter((t: any) => {
      // return t.toObject().confidenceScore > 15;
      return stringSimilarity.compareTwoStrings(t.toObject().name, name) > 0.8;
    });
    if (!filteredTeams.length) {
      console.error("Could not find team", { name, league });
      throw new Error("Could not find team");
    }
    if (filteredTeams.length > 1) {
      console.log(`Found several matching teams for ${name}`, {
        filteredTeams,
      });
    }
    return filteredTeams[0];
  }

  async findById(id: Types.ObjectId) {
    await getConnection();

    const findById: Team | null = await TeamModel.findById(id);
    if (findById) {
      return findById;
    }
    throw new Error("Could not find by ID");
  }

  async findByAbbreviation(abbreviation: string, league: League) {
    await getConnection();
    const team: Team | null = await TeamModel.findOne({ abbreviation, league });
    if (!team) {
      console.error({ abbreviation, league });
      throw new Error("Couldn't find team by abbreviation");
    }
    return team;
  }

  async add(teamInput: Team) {
    await getConnection();
    console.log("Adding team:", teamInput.name);
    let team;
    try {
      team = await TeamModel.findOneAndUpdate(
        {
          name: teamInput.name,
          league: teamInput.league,
        },
        { _id: new Types.ObjectId(), ...teamInput },
        { upsert: true, returnDocument: "after" }
      );
    } catch {
      team = await TeamModel.findOneAndUpdate(
        {
          name: teamInput.name,
          league: teamInput.league,
        },
        { ...teamInput },
        { upsert: true, returnDocument: "after" }
      );
    }
    return team?.toObject();
  }
}
