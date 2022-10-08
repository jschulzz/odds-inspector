import { Book } from "./books";
import { Market } from "./markets";
import { Period } from "./sportData";

export enum LineChoice {
  HOME = "home",
  AWAY = "away",
  OVER = "over",
  UNDER = "under",
}

export interface Line {
  type: Market;
  book: Book;
  team: string;
  period: Period;
  price: number;
  otherOutcomePrice: number;
  value: number;
}

export interface LineConstructor {
  homeTeam: string;
  awayTeam: string;
  gameTime: Date;
  book: Book;
  period: Period;
  price: number;
  otherOutcomePrice: number;
  choice: LineChoice;
}

export class Line {
  constructor(args: LineConstructor, type: Market) {
    this.homeTeam = args.homeTeam;
    this.awayTeam = args.awayTeam;
    this.gameTime = args.gameTime;
    this.type = type;
    this.period = args.period;
    this.book = args.book;
    this.price = args.price;
    this.choice = args.choice;
    this.otherOutcomePrice = args.otherOutcomePrice;
  }

  homeTeam!: string;
  awayTeam!: string;
  gameTime: Date;
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

export interface SourcedOdds {
  moneylines: Moneyline[];
  spreads: Spread[];
  gameTotals: Total[];
  teamTotals: Total[];
}
