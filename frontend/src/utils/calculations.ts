import { Boost } from "../App";
import { Price, PropGroup, GameLineGroup, PricedValue } from "../types";
import { League, Book } from "../types";

const leagueGameLineWeights = new Map<League, Map<Book, number>>([
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

const leaguePlayerPropWeights = new Map<League, Map<Book, number>>([
  [
    League.WNBA,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0.5],
      [Book.UNDERDOG, 0.75],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NBA,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
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
      [Book.PINNACLE, 1.5],
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
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      // [Book.CAESARS, 1],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NFL,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1],
      [Book.CAESARS, 1],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ]
]);

export function getLikelihood(
  priceGroup: Price[],
  league: League,
  overOrUnder: "over" | "under",
  propOrGame: "prop" | "game"
) {
  let sum = 0;
  const bookWeights =
    propOrGame === "game" ? leagueGameLineWeights.get(league) : leaguePlayerPropWeights.get(league);
  if (!bookWeights) {
    return 0.5;
  }
  let total = 0;

  priceGroup.forEach((curr: Price) => {
    let weight = 1;
    if (bookWeights.has(curr.book)) {
      // @ts-ignore
      weight = bookWeights.get(curr.book);
    }
    // of over
    let likelihood = vigAmericanToProbabilityOfOver(curr.overPrice, curr.underPrice);
    if (overOrUnder === "under") {
      likelihood = 1 - likelihood;
    }
    sum += weight;
    total += weight * likelihood;
  });
  if (sum === 0) {
    return 0.5;
  }
  return total / sum;
}

export function boostLine(americanPrice: number, boost: Boost) {
  const decimalOdds = americanOddsToDecimal(americanPrice);
  const boostedDecimalOdds = boost.amount * (decimalOdds - 1) + 1;
  const boostedAmericanOdds = decimalToAmerican(boostedDecimalOdds);
  return boostedAmericanOdds;
}

export function findApplicableBoost(
  group: PropGroup | GameLineGroup,
  price: Price,
  boosts: Boost[]
) {
  if (!price) {
    return;
  }
  return boosts.find(
    (boost) =>
      boost.book === price.book &&
      ((boost.league && boost.league === group.metadata.league) ||
        (boost.teamAbbreviation &&
          [
            ...group.metadata.game.awayTeam.abbreviation,
            ...group.metadata.game.homeTeam.abbreviation
          ].includes(boost.teamAbbreviation)))
  );
}

export function hasEV(
  group: PropGroup | GameLineGroup,
  propOrGame: "prop" | "game",
  booksToCheck: Book[] = [],
  boosts: Boost[] = []
): { hasPositiveEv: boolean; positiveEvBooks: Book[] } {
  let positiveEvBooks: Book[] = [];
  group.values.forEach((pricedValue: PricedValue) => {
    const overLikelihood = getLikelihood(
      pricedValue.prices,
      group.metadata.league,
      "over",
      propOrGame
    );
    const overFairLine = probabilityToAmerican(overLikelihood);
    const underFairLine = -overFairLine;
    positiveEvBooks.push(
      ...pricedValue.prices
        .filter((price: Price) => {
          let overPrice = price.overPrice;
          const applicableBoost = findApplicableBoost(group, price, boosts);
          if (applicableBoost) {
            overPrice = boostLine(overPrice, applicableBoost);
          }
          return overPrice > overFairLine && booksToCheck.includes(price.book);
        })
        .map((x) => x.book)
    );
    positiveEvBooks.push(
      ...pricedValue.prices
        .filter((price: Price) => {
          let underPrice = price.underPrice;
          const applicableBoost = findApplicableBoost(group, price, boosts);
          if (applicableBoost) {
            underPrice = boostLine(underPrice, applicableBoost);
          }
          return underPrice > underFairLine && booksToCheck.includes(price.book);
        })
        .map((x) => x.book)
    );
  });
  return {
    hasPositiveEv: !!positiveEvBooks.length,
    positiveEvBooks: [...new Set(positiveEvBooks)]
  };
}

export function probabilityToAmerican(probability: number) {
  if (probability < 0.5) {
    return 100 / probability - 100;
  }
  return -((100 * probability) / (1 - probability));
}

export function americanToProbability(american: number) {
  if (american >= 100) {
    return 100 / (american + 100);
  }
  return -american / (-american + 100);
}

export function vigAmericanToProbabilityOfOver(over: number, under: number) {
  const probOfOver = americanToProbability(over);
  const probOfUnder = americanToProbability(under);
  return probOfOver / (probOfOver + probOfUnder);
}

export function americanOddsToDecimal(americanOdds: number) {
  if (americanOdds < 0) {
    return 1 - 100 / americanOdds;
  }
  return americanOdds / 100 + 1;
}

export const priceToLikelihood = (over?: number, under?: number) => {
  const overProb = americanToProbability(over as number);
  const underProb = americanToProbability(under as number);
  if (!under) {
    return overProb;
  }
  if (!over) {
    return underProb;
  }
  return overProb / (overProb + underProb);
};

export function calculateEV(americanPrice: number, americanFairLine: number) {
  let payoutMultiplier = -100 / americanPrice;
  if (americanPrice > 0) {
    payoutMultiplier = americanPrice / 100;
  }
  const likelihood = americanToProbability(americanFairLine);
  const EV = likelihood * payoutMultiplier - (1 - likelihood);
  return EV;
}

export function decimalToAmerican(decimal: number) {
  if (decimal > 2) {
    return (decimal - 1) * 100;
  }
  return -100 / (decimal - 1);
}
