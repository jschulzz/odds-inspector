import { Odds } from "../odds/odds";
import { League, Book, PropsPlatform } from "../types";
import { ResolvedGameLine } from "./game-lines";
import { ResolvedProp } from "./player-props";

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

const leaguePlayerPropWeights = new Map<League, Map<Book | PropsPlatform, number>>([
  [
    League.WNBA,
    new Map<Book | PropsPlatform, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [PropsPlatform.PRIZEPICKS, 0],
      [PropsPlatform.UNDERDOG, 0],
      [PropsPlatform.NO_HOUSE, 0]
    ])
  ],
  [
    League.NBA,
    new Map<Book | PropsPlatform, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [PropsPlatform.PRIZEPICKS, 0],
      [PropsPlatform.UNDERDOG, 0],
      [PropsPlatform.NO_HOUSE, 0]
    ])
  ],
  [
    League.NHL,
    new Map<Book | PropsPlatform, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [PropsPlatform.PRIZEPICKS, 0],
      [PropsPlatform.UNDERDOG, 0],
      [PropsPlatform.NO_HOUSE, 0]
    ])
  ],
  [
    League.MLB,
    new Map<Book | PropsPlatform, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      // [Book.CAESARS, 1],
      [PropsPlatform.PRIZEPICKS, 0],
      [PropsPlatform.UNDERDOG, 0],
      [PropsPlatform.NO_HOUSE, 0]
    ])
  ],
  [
    League.NFL,
    new Map<Book | PropsPlatform, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1],
      [Book.CAESARS, 1],
      [PropsPlatform.PRIZEPICKS, 0],
      [PropsPlatform.UNDERDOG, 0],
      [PropsPlatform.NO_HOUSE, 0]
    ])
  ]
]);

export const getLikelihood = (
  gameLineGroup: ResolvedGameLine[] | ResolvedProp[],
  overOrUnder: "over" | "under",
  propOrGame: "prop" | "game"
) => {
  let sum = 0;
  const league = gameLineGroup[0].prop.game.league;
  const bookWeights =
    propOrGame === "game" ? leagueGameLineWeights.get(league) : leaguePlayerPropWeights.get(league);
  if (!bookWeights) {
    throw new Error("Unknown league");
  }
  let total = 0;

  gameLineGroup.forEach((curr: ResolvedGameLine | ResolvedProp) => {
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
    total += weight * currentLikelihood;
  });
  if (sum === 0) {
    return 0.5;
  }
  return total / sum;
};
