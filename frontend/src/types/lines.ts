import { Game } from "../../../database/game";
import { Book } from "./books";
import { Market } from "./markets";
import { Period } from "./sportData";

export enum LineChoice {
  HOME = "home",
  AWAY = "away",
  OVER = "over",
  UNDER = "under"
}

export interface LineConstructor {
  game: Game;
  book: Book;
  period: Period;
  price: number;
  otherOutcomePrice: number;
  choice: LineChoice;
}

export class Line {
  constructor(args: LineConstructor, type: Market) {
    this.game = args.game;
    this.type = type;
    this.period = args.period;
    this.book = args.book;
    this.price = args.price;
    this.choice = args.choice;
    this.otherOutcomePrice = args.otherOutcomePrice;
  }

  game!: Game;
  type!: Market;
  book: Book;
  period: Period;
  choice: LineChoice;
  price: number;
  otherOutcomePrice: number;
}

interface MoneylineConstructor extends LineConstructor {}

export class Moneyline extends Line {
  constructor(args: MoneylineConstructor) {
    super(args, Market.MONEYLINE);
  }
}

interface SpreadConstructor extends LineConstructor {
  value: number;
}

export class Spread extends Line {
  constructor(args: SpreadConstructor) {
    super(args, Market.SPREAD);
    this.value = args.value;
  }
  value: number;
}

interface TotalConstructor extends LineConstructor {
  value: number;
}

interface TeamTotalConstructor extends TotalConstructor {
  side: "home" | "away";
}

export class Total extends Line {
  constructor(args: TotalConstructor, market: Market) {
    super(args, market);
    this.value = args.value;
  }
  value: number;
}

export class GameTotal extends Total {
  constructor(args: TotalConstructor) {
    super(args, Market.GAME_TOTAL);
    this.value = args.value;
  }
  value: number;
}

export class TeamTotal extends Total {
  constructor(args: TeamTotalConstructor) {
    super(args, Market.TEAM_TOTAL);
    this.value = args.value;
    this.side = args.side;
  }
  value: number;
  side: "home" | "away";
}

export type SourcedOdds = {
  moneylines: Moneyline[];
  spreads: Spread[];
  gameTotals: Total[];
  teamTotals: Total[];
}
