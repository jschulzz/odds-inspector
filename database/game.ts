import { League } from "../types";
import { Team } from "./team";

export interface GameArgs {
  awayTeam: Team;
  homeTeam: Team;
  gameTime?: Date;
  league: League;
}

export class Game {
  public awayTeam: Team;
  public homeTeam: Team;
  public gameTime?: Date;
  public league: League;

  constructor(gameArgs: GameArgs) {
    this.awayTeam = gameArgs.awayTeam;
    this.homeTeam = gameArgs.homeTeam;
    this.gameTime = gameArgs.gameTime;
    this.league = gameArgs.league;
  }
}
