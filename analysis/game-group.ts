import { Odds } from "../odds/odds";
import { Book, League, Market, Period } from "../types";
import { LineChoice } from "../types/lines";
import { Game } from "../database/game";
import { Price } from "./group";

const leagueWeights = new Map<League, Map<Book, number>>([
  [
    League.WNBA,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
    ]),
  ],
  [
    League.NBA,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
    ]),
  ],
  [
    League.NHL,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
    ]),
  ],
  [
    League.MLB,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      [Book.POINTSBET, 0.2],
    ]),
  ],
]);

export interface GameGroupArgs {
  game: Game;
  lineType: Market;
  value?: number;
  prices: Price[];
  side: LineChoice;
  league: League;
  period: Period;
}

export class GameGroup {
  public game: Game;
  public lineType: Market;
  public prices: Price[];
  public value?: number;
  public side: LineChoice;
  public relatedGroups: GameGroup[];
  public oppositeGroup?: GameGroup;
  public league: League;
  public period: Period;

  constructor(args: GameGroupArgs) {
    this.game = args.game;
    this.prices = args.prices;
    this.side = args.side;
    this.value = args.value;
    this.league = args.league;
    this.relatedGroups = [];
    this.lineType = args.lineType;
    this.period = args.period;
  }

  findEV() {
    const averageLikelihood = this.getLikelihood();
    return this.prices.map((price) => {
      return {
        book: price.book,
        EV:
          averageLikelihood *
            Odds.fromFairLine(price.price).toPayoutMultiplier() -
          (1 - averageLikelihood),
      };
    });
  }
  maxEV() {
    const EVs = this.findEV();
    return Math.max(...EVs.map((ev) => ev.EV));
  }
  getAveragePrice() {
    const averageLikelihood = this.getLikelihood();
    const averagePrice = Odds.probabilityToAmericanOdds(averageLikelihood);
    return averagePrice;
  }
  getFairLine() {
    return Odds.probabilityToAmericanOdds(this.getLikelihood());
  }
  getLikelihood() {
    let sum = 0;
    const bookWeights = leagueWeights.get(this.league);
    if (!bookWeights) {
      throw new Error("Unknown league");
    }
    const total = this.prices.reduce((prev, curr) => {
      let weight = 1;
      if (bookWeights.has(curr.book as Book)) {
        // @ts-ignore
        weight = bookWeights.get(curr.book);
      }
      sum += weight;
      return prev + weight * curr.likelihood;
    }, 0);
    return total / sum;
  }
  findRelatedGroups(groups: GameGroup[]) {
    this.relatedGroups = groups.filter((group) => {
      return (
        group.game === this.game &&
        group.lineType === this.lineType &&
        group.period === this.period &&
        group.side === this.side &&
        group.value !== this.value
      );
    });
  }
  findOppositeGroup(groups: GameGroup[]) {
    let wantSameSide = false;
    let wantSameValue = true;
    if (this.lineType === Market.SPREAD) {
      wantSameSide = false;
      wantSameValue = false;
    }
    if (this.lineType === Market.MONEYLINE) {
      wantSameSide = false;
      wantSameValue = true;
    }
    if (this.lineType === Market.GAME_TOTAL) {
      wantSameSide = false;
      wantSameValue = true;
    }
    if (this.lineType === Market.TEAM_TOTAL) {
      wantSameSide = false;
      wantSameValue = true;
    }
    this.oppositeGroup = groups.find(
      (group) =>
        group.game === this.game &&
        group.lineType == this.lineType &&
        group.period === this.period &&
        (wantSameSide ? group.side === this.side : group.side !== this.side) &&
        (wantSameValue
          ? group.value === this.value
          : group.value !== this.value)
    );
  }
  getFullSize() {
    return (
      this.prices.length + this.relatedGroups.flatMap((x) => x.prices).length
    );
  }
}
