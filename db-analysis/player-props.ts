import { getConnection } from "../database/mongo.connection";
import { Game } from "../database/mongo.game";
import { Player } from "../database/mongo.player";
import { PlayerProp, PlayerPropManager } from "../database/mongo.player-prop";
import { PropsPriceAggregate, PriceManager, Price } from "../database/mongo.price";
import { Team } from "../database/mongo.team";
import { Odds } from "../odds/odds";
import { Book, League, PropsPlatform } from "../types";

export type MisvaluedPlay = {
  propId: string;
  player: Player;
  team: Team;
  game: Game;
  prices: Price[];
  consensusProp: PlayerProp;
  consensusPrices: Price[];
};

export type Play = {
  propId: string;
  player: Player;
  team: Team;
  game: Game;
  EV: number;
  book: Book | PropsPlatform;
};

const leagueWeights = new Map<League, Map<Book | PropsPlatform, number>>([
  [
    League.WNBA,
    new Map<Book | PropsPlatform, number>([
      [Book.PINNACLE, 2.5],
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
      [Book.PINNACLE, 2.5],
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
      [Book.PINNACLE, 2.5],
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
      [Book.PINNACLE, 2],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      // [Book.CAESARS, 1],
      [PropsPlatform.PRIZEPICKS, 0],
      [PropsPlatform.UNDERDOG, 0],
      [PropsPlatform.NO_HOUSE, 0]
    ])
  ]
]);

const getLikelihood = (playerProp: PropsPriceAggregate, overOrUnder: "over" | "under") => {
  let sum = 0;
  const bookWeights = leagueWeights.get(playerProp.game.league as League);
  if (!bookWeights) {
    throw new Error("Unknown league");
  }
  const total = playerProp.prices.reduce((prev, curr) => {
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

export const findPlayerPropsEdge = async (league?: League) => {
  await getConnection();
  const priceManager = new PriceManager();
  const playerPropGroups = await priceManager.groupByProp(league);

  const plays: Play[] = [];

  playerPropGroups.forEach((playerProp) => {
    const overLikelihood = getLikelihood(playerProp, "over");
    const underLikelihood = 1 - overLikelihood;
    // check for +EV Overs
    for (const options of [
      { likelihood: overLikelihood, price: "overPrice", label: "over" },
      { likelihood: underLikelihood, price: "underPrice", label: "under" }
    ]) {
      playerProp.prices.forEach((price) => {
        const EV =
          options.likelihood *
            // @ts-ignore
            Odds.fromFairLine(price[options.price]).toPayoutMultiplier() -
          (1 - options.likelihood);
        if (EV > 0) {
          console.log(
            `${(EV * 100).toFixed(2)}% EV for ${playerProp.player.name} (${
              playerProp.team.abbreviation
            }) ${options.label} ${playerProp["linked-prop"].value} ${
              playerProp["linked-prop"].propStat
            } on ${price.book}\n\tFair Line: ${new Odds(
              options.likelihood
              // @ts-ignore
            ).toAmericanOdds()}. Line on ${price.book}: ${price[options.price]}`
          );
          console.log(playerProp.prices);

          plays.push({
            player: playerProp.player,
            // @ts-ignore
            propId: playerProp["linked-prop"]._id,
            EV,
            book: price.book,
            team: playerProp.team,
            game: playerProp.game
          });
        }
      });
    }
  });
  return plays;
};

export const findMisvaluedProps = async (league: League, book?: Book | PropsPlatform) => {
  await getConnection();
  const priceManager = new PriceManager();
  const playerPropManager = new PlayerPropManager();
  const consensusGroups = await priceManager.groupByProp(league);

  const plays: MisvaluedPlay[] = [];

  for (const consensusValueProp of consensusGroups) {
    const otherValues = await playerPropManager.findAlternateLines(
      consensusValueProp["linked-prop"]
    );
    for (const value of otherValues) {
      const [alternate] = await priceManager.getPricesByProp(value);
      if (!alternate) {
        continue;
      }

      const alternateDirection =
        alternate["linked-prop"].value < consensusValueProp["linked-prop"].value ? "over" : "under";

      const consensusLikelihood = getLikelihood(consensusValueProp, alternateDirection);
      if (
        consensusLikelihood > 0.495 &&
        (!!book ? alternate.prices.some((price) => price.book === book) : true)
      ) {
        console.log(
          `Alternate for ${consensusValueProp.player.name} (${
            consensusValueProp.team.abbreviation
          }) ${consensusValueProp["linked-prop"].value} ${
            consensusValueProp["linked-prop"].propStat
          } (${consensusValueProp.prices.map((p) => p.book).join(", ")}): ${(
            consensusLikelihood * 100
          ).toFixed(2)}%`
        );
        plays.push({
          // @ts-ignore
          propId: alternate["linked-prop"]._id,
          player: consensusValueProp.player,
          team: consensusValueProp.team,
          game: consensusValueProp.game,
          // @ts-ignore
          prices: alternate.prices,
          consensusProp: consensusValueProp["linked-prop"],
          // @ts-ignore
          consensusPrices: consensusValueProp.prices
        });
        console.log(consensusValueProp.prices);
        alternate.prices.forEach((price) => {
          console.log(
            // @ts-ignore
            `${price[alternateDirection + "Price"]} ${alternateDirection} ${
              alternate["linked-prop"].value
            } @ ${price.book}`
          );
        });
      }
    }
  }
  return plays;
};
