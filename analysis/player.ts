import { compareTwoStrings } from "string-similarity";

export class Player {
  public team?: string;
  public name: string;
  public aliases: string[];

  constructor(name: string, team?: string) {
    this.team = team;
    this.name = name;
    this.aliases = [];
  }

  public compare(name: string, team?: string) {
    return compareTwoStrings(name, this.name);
  }

  public addAlias(name: string, team?: string) {
    if (!this.team) {
      this.team === team;
    }
    this.aliases.push(name);
  }
}
