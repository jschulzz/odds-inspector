import { Schema } from "mongoose";
import { Book, League, Market, Period, PropsStat } from ".";

export type Team = {
  _id: Schema.Types.ObjectId;
  name: string;
  league: League;
  abbreviation: string[];
};

export type Game = {
  _id: Schema.Types.ObjectId;
  awayTeam: Team;
  homeTeam: Team;
  gameTime: Date;
  league: League;
};

export type PricedValue = {
  value: number;
  prices: Price[];
};

export type Price = {
  overPrice: number;
  underPrice: number;
  book: Book;
};

export type GameLineGroup = {
  metadata: {
    game: Game;
    league: League;
    period: Period;
    side?: string;
    value?: number;
    type: Market;
  };
  values: PricedValue[];
};

export type PropGroup = {
  metadata: {
    league: League;
    game: Game;
    propStat: PropsStat;
    player: {
      league: League;
      name: string;
      team: Team;
    };
  };
  values: PricedValue[];
};