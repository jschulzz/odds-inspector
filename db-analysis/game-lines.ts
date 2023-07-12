import { getConnection } from "../database/mongo.connection";
import { GameLinePriceAggregate, PriceManager } from "../database/mongo.price";
import { Odds } from "../odds/odds";
import { Book, League } from "../types";
import { Play } from "./player-props";

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

const getLikelihood = (
  gameLine: GameLinePriceAggregate,
  overOrUnder: "over" | "under"
) => {
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

export const findGameLineEdge = async (league: League) => {
  await getConnection();
  const priceManager = new PriceManager();
  const gameLineGroups = await priceManager.groupByGameLine(league);

  gameLineGroups.forEach((gameLine) => {
    const overLikelihood = getLikelihood(gameLine, "over");
    const underLikelihood = 1 - overLikelihood;
    for (const options of [
      { likelihood: overLikelihood, price: "overPrice", label: "over" },
      { likelihood: underLikelihood, price: "underPrice", label: "under" },
    ]) {
      gameLine.prices.forEach((price) => {
        // @ts-ignore
        if (!price[options.price]) {
          console.log(options, price);
        }
        const EV =
          options.likelihood *
            // @ts-ignore
            Odds.fromFairLine(price[options.price]).toPayoutMultiplier() -
          (1 - options.likelihood);
        if (EV > -0.01) {
          console.log(
            `${(EV * 100).toFixed(2)}% EV for ${
              gameLine.awayTeam.abbreviation
            } @ ${gameLine.homeTeam.abbreviation} ${options.label} ${
              gameLine["linked-line"].value
            } ${gameLine["linked-line"].period} ${
              gameLine["linked-line"].type
            } on ${price.book}\n\tFair Line: ${new Odds(
              options.likelihood
              // @ts-ignore
            ).toAmericanOdds()}. Line on ${price.book}: ${price[options.price]}`
          );
          console.log(gameLine.prices);
        }
      });
    }
  });
};
