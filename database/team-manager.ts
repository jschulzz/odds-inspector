import AsyncDatastore from "nedb-async";
import { Team, TeamArgs } from "./team";
import { League } from "../types";

export class TeamManager {
  private teamsDB;
  constructor() {
    this.teamsDB = new AsyncDatastore({
      filename: "./teams.datastore",
      autoload: true
    });
  }

  async find(name: string, league: League) {
    let team = await this.teamsDB.asyncFindOne({ name, league });
    if (!team) {
      team = await this.teamsDB.asyncFindOne({ league, aliases: name });
    }
    if (!team) {
      return undefined;
    }

    return new Team(team as TeamArgs);
  }

  async add(team: Team) {
    await this.teamsDB.asyncInsert(team);
  }

  async addAlias(team: Team, alias: string) {
    team.aliases.push(alias);
    await this.teamsDB.asyncUpdate({ name: team.name }, { aliases: team.aliases });
  }
}
