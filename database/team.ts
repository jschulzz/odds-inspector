import { League } from "../types";

export interface TeamArgs {
  name: string;
  aliases?: string[];
  league: League;
  abbreviation?: string;
}

export class Team {
  public name: string;
  public league: League;
  public aliases: string[];
  public abbreviation: string;

  constructor(args: TeamArgs) {
    this.name = args.name;
    this.league = args.league;
    this.aliases = args.aliases || [];
    this.abbreviation = args.abbreviation || "";
  }
}
