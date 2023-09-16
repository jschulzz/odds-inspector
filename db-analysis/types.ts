import { Schema } from "mongoose";
import { League } from "../types";

export type Team = {
  _id: Schema.Types.ObjectId;
  name: string;
  league: League;
  abbreviation: string;
};

export type Game = {
  _id: Schema.Types.ObjectId;
  awayTeam: Team;
  homeTeam: Team;
  gameTime: Date;
  league: League;
};
