import { Player } from "../database/mongo.player";
import { Odds } from "../odds/odds";
import { Book, League, PropsStat } from "../frontend/src/types";
import { LineChoice } from "../frontend/src/types/lines";

const leagueWeights = new Map<League, Map<Book, number>>([
  [
    League.WNBA,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NBA,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NHL,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.MLB,
    new Map<Book, number>([
      [Book.PINNACLE, 2],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      // [Book.CAESARS, 1],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ]
]);

export interface Price {
  book: Book;
  price: number;
  likelihood: number;
}

export interface GroupArgs {
  player: Player;
  stat: PropsStat;
  value: number;
  prices: Price[];
  side: LineChoice;
  league: League;
}

export class Group {
  public stat: PropsStat;
  public prices: Price[];
  public value: number;
  public side: string;
  public relatedGroups: Group[];
  public oppositeGroup?: Group;
  public player: Player;
  public league: League;

  constructor(args: GroupArgs) {
    this.player = args.player;
    this.stat = args.stat;
    this.prices = args.prices;
    this.side = args.side;
    this.value = args.value;
    this.league = args.league;
    this.relatedGroups = [];
  }

  findEV = () => {
    const averageLikelihood = this.getLikelihood();
    return this.prices.map((price) => {
      return {
        book: price.book,
        EV:
          averageLikelihood * Odds.fromFairLine(price.price).toPayoutMultiplier() -
          (1 - averageLikelihood)
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
    const bookWeights = leagueWeights.get(this.league);
    if (!bookWeights) {
      throw new Error("Unknown league");
    }
    const total = this.prices.reduce((prev, curr) => {
      let weight = 1;
      if (bookWeights.has(curr.book)) {
        // @ts-ignore
        weight = bookWeights.get(curr.book);
      }
      sum += weight;
      return prev + weight * curr.likelihood;
    }, 0);
    if (sum === 0) {
      return 0.5;
    }
    return total / sum;
  };
  findRelatedGroups = (groups: Group[]) => {
    this.relatedGroups = groups.filter((group) => {
      return (
        group.stat === this.stat &&
        group.side === this.side &&
        group.player === this.player &&
        group.value !== this.value
      );
    });
  };
  findOppositeGroup = (groups: Group[]) => {
    this.oppositeGroup = groups.find(
      (group) =>
        group.stat === this.stat &&
        group.side !== this.side &&
        group.player === this.player &&
        group.value === this.value
    );
  };
  getFullSize = () => {
    return this.prices.length + this.relatedGroups.flatMap((x) => x.prices).length;
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
    if (this.side === LineChoice.OVER) {
      return [];
    }
    if (!this.oppositeGroup) {
      return [];
    }
    this.prices.forEach((price1) => {
      this.oppositeGroup?.prices.forEach((price2) => {
        if (price1 !== price2 && ![price1.book, price2.book].includes(Book.PINNACLE)) {
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
