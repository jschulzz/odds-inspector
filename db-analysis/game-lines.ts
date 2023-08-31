import { getConnection } from "../database/mongo.connection";
import { GameLinePriceAggregate, Price, PriceManager } from "../database/mongo.price";
import { WithId } from "../database/types";
import { Odds } from "../odds/odds";
import { Book, League } from "../types";

const leagueWeights = new Map<League, Map<Book, number>>([
  [
    League.WNBA,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0]
    ])
  ],
  [
    League.NBA,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0]
    ])
  ],
  [
    League.NHL,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0]
    ])
  ],
  [
    League.NCAAF,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.BETRIVERS, 0.5],
      [Book.CAESARS, 0.75],
      [Book.TWINSPIRES, 0]
    ])
  ],
  [
    League.NFL,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.BETRIVERS, 0.5],
      [Book.CAESARS, 0.75],
      [Book.TWINSPIRES, 0]
    ])
  ],
  [
    League.MLB,
    new Map<Book, number>([
      [Book.PINNACLE, 2.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      [Book.POINTSBET, 0.2]
    ])
  ]
]);

export interface GameLinePlay {
  EV: number;
  gameLabel: string;
  type: string;
  period: string;
  metadata: {
    side?: string;
    value?: number;
  };
  fairLine: number;
  book: string;
  prices: WithId<Price>[];
}

const excludedBooks = new Set([Book.PINNACLE])

const getLikelihood = (gameLine: GameLinePriceAggregate, overOrUnder: "over" | "under") => {
  let sum = 0;
  const bookWeights = leagueWeights.get(gameLine.game.league as League);
  if (!bookWeights) {
    throw new Error("Unknown league");
  }
  const total = gameLine.prices.reduce((prev, curr) => {
    let weight = 1;
    if (bookWeights.has(curr.book)) {
      // @ts-ignore
      weight = bookWeights.get(curr.book);
    }
    const currentLikelihood = Odds.fromVigAmerican(
      overOrUnder === "over" ? curr.overPrice : curr.underPrice,
      overOrUnder === "under" ? curr.overPrice : curr.underPrice
    ).toProbability();
    sum += weight;
    return prev + weight * currentLikelihood;
  }, 0);
  if (sum === 0) {
    return 0.5;
  }
  return total / sum;
};

export const findGameLineEdge = async (league?: League) => {
  await getConnection();
  const priceManager = new PriceManager();
  const gameLineGroups = await priceManager.groupByGameLine(league);
  const plays: GameLinePlay[] = [];

  gameLineGroups.forEach((gameLine) => {
    const overLikelihood = getLikelihood(gameLine, "over");
    const underLikelihood = 1 - overLikelihood;
    for (const options of [
      { likelihood: overLikelihood, price: "overPrice", label: "over" },
      { likelihood: underLikelihood, price: "underPrice", label: "under" }
    ]) {
      gameLine.prices.forEach((price) => {
        const awayTeamName =
          gameLine.awayTeam.abbreviation === "-"
            ? gameLine.awayTeam.name
            : gameLine.awayTeam.abbreviation;
        const homeTeamName =
          gameLine.homeTeam.abbreviation === "-"
            ? gameLine.homeTeam.name
            : gameLine.homeTeam.abbreviation;

        // @ts-ignore
        if (!price[options.price]) {
          console.log(options, price);
        }
        const EV =
          options.likelihood *
            // @ts-ignore
            Odds.fromFairLine(price[options.price]).toPayoutMultiplier() -
          (1 - options.likelihood);
        if (EV > -0 && options.likelihood > 0.35 && options.likelihood < 0.65 && !excludedBooks.has(price.book)) {
          console.log(
            `${(EV * 100).toFixed(2)}% EV for ${awayTeamName} @ ${homeTeamName} ${options.label} ${
              gameLine["linked-line"].value
            } ${gameLine["linked-line"].period} ${gameLine["linked-line"].type} on ${
              price.book
            }\n\tFair Line: ${new Odds(
              options.likelihood
              // @ts-ignore
            ).toAmericanOdds()}. Line on ${price.book}: ${price[options.price]}`
          );
          plays.push({
            EV,
            gameLabel: `${awayTeamName} @ ${homeTeamName} (${gameLine.game.league})`,
            type: gameLine["linked-line"].type,
            period: gameLine["linked-line"].period,
            metadata: {
              side: gameLine["linked-line"].side,
              value: gameLine["linked-line"].value
            },
            fairLine: new Odds(options.likelihood).toAmericanOdds(),
            book: price.book,
            // @ts-ignore
            prices: gameLine.prices
          });
        }
      });
    }
  });
  return plays;
};
