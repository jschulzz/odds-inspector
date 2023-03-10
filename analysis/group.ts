import { compareTwoStrings } from "string-similarity";
import { Odds } from "../odds/odds";
import { Book, PropsPlatform, PropsStat } from "../types";
import { LineChoice } from "../types/lines";

const bookWeights = new Map<Book | PropsPlatform, number>([
  [Book.PINNACLE, 4],
  [Book.DRAFTKINGS, 2],
  [Book.FANDUEL, 2],
  [Book.TWINSPIRES, 0],
  [Book.BETRIVERS, 0],
  [Book.CAESARS, 0.5],
  [PropsPlatform.PRIZEPICKS, 0],
  [PropsPlatform.UNDERDOG, 0],
]);

export interface Price {
  book: Book | PropsPlatform;
  price: number;
  likelihood: number;
}

export interface GroupArgs {
  name: string;
  stat: PropsStat;
  value: number;
  prices: Price[];
  side: LineChoice;
}

export class Group {
  public name: string;
  public stat: PropsStat;
  public prices: Price[];
  public value: number;
  public side: string;

  constructor(args: GroupArgs) {
    this.name = args.name;
    this.stat = args.stat;
    this.prices = args.prices;
    this.side = args.side;
    this.value = args.value;
  }

  findEV = () => {
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
  };
  getAveragePrice = () => {
    const averageLikelihood = this.getLikelihood();
    const averagePrice = Odds.probabilityToAmericanOdds(averageLikelihood);
    return averagePrice;
  };
  getLikelihood = () => {
    let sum = 0;
    return (
      this.prices.reduce((prev, curr) => {
        const weight = bookWeights.get(curr.book) || 1;
        sum += weight;
        return prev + weight * curr.likelihood;
      }, 0) / sum
    );
  };
  findRelatedGroups = (groups: Group[]) => {
    return groups.filter(
      (group) =>
        group.stat === this.stat &&
        group.side === this.side &&
        compareTwoStrings(group.name, this.name) > 0.85 &&
        group.value !== this.value
    );
  };
  maxEV = () => {
    const EVs = this.findEV();
    // if (this.name === "Bradley Beal (WAS)" && this.stat === PropsStat.ASSISTS) {
    //   console.log(this, EVs, this.getLikelihood());
    // }
    return Math.max(...EVs.map((ev) => ev.EV));
  };
}
