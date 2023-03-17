import { compareTwoStrings } from "string-similarity";
import { Odds } from "../odds/odds";
import { Book, PropsPlatform, PropsStat } from "../types";
import { LineChoice } from "../types/lines";

const bookWeights = new Map<Book | PropsPlatform, number>([
  [Book.PINNACLE, 2.5],
  [Book.DRAFTKINGS, 2],
  [Book.FANDUEL, 2],
  [Book.TWINSPIRES, 0],
  [Book.BETRIVERS, 1],
  [Book.CAESARS, 1],
  [PropsPlatform.PRIZEPICKS, 0],
  [PropsPlatform.UNDERDOG, 0],
  [PropsPlatform.NO_HOUSE, 0],
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
        let weight = 1;
        if (bookWeights.has(curr.book)) {
          // @ts-ignore
          weight = bookWeights.get(curr.book);
        }
        // if (
        //   this.name.includes("Anderson") &&
        //   this.stat === PropsStat.REBOUNDS_PLUS_ASSISTS &&
        //   this.side === LineChoice.OVER
        // ) {
        //   console.log(weight, curr.book, curr.likelihood);
        // }
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
  findOppositeGroup = (groups: Group[]) => {
    return groups.find(
      (group) =>
        group.stat === this.stat &&
        group.side !== this.side &&
        compareTwoStrings(group.name, this.name) > 0.85 &&
        group.value === this.value
    );
  };
  maxEV = () => {
    const EVs = this.findEV();
    // if (this.name === "Bradley Beal (WAS)" && this.stat === PropsStat.ASSISTS) {
    //   console.log(this, EVs, this.getLikelihood());
    // }
    return Math.max(...EVs.map((ev) => ev.EV));
  };
  hasArbs = (groups: Group[]) => {
    let arbs: Price[][] = [];
    // don't need to do it twice, just ignore the overs
    if(this.side === LineChoice.OVER){
      return []
    }
    let oppositeOutcomeGroup = this.findOppositeGroup(groups);
    if (!oppositeOutcomeGroup) {
      return [];
    }
    this.prices.forEach((price1) => {
      oppositeOutcomeGroup?.prices.forEach((price2) => {
        if (
          price1 !== price2 &&
          ![price1.book, price2.book].includes(Book.PINNACLE)
        ) {
          const sum =
            Odds.fromFairLine(price1.price).toProbability() +
            Odds.fromFairLine(price2.price).toProbability();
          // if (
          //   this.name.includes("Jalen Green") &&
          //   this.stat === PropsStat.THREE_POINTERS_MADE
          // ) {
          //   console.log(price1, price2, sum);
          // }
          if (sum < 1) {
            arbs.push([price1, price2]);
          }
        }
      });
    });
    return arbs;
  };
}
