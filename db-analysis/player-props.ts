import { getConnection } from "../database/mongo.connection";
import { Game } from "../database/mongo.game";
import { Player } from "../database/mongo.player";
import { PlayerProp } from "../database/mongo.player-prop";
import { PropsPriceAggregate, PriceManager, Price } from "../database/mongo.price";
import { Team } from "../database/mongo.team";
import { WithId } from "../database/types";
import { Odds } from "../odds/odds";
import { Book, League, PropsPlatform } from "../types";

export type MisvaluedPlay = {
  propId: string;
  player: WithId<Player>;
  homeTeam: WithId<Team>;
  awayTeam: WithId<Team>;
  playerTeam: WithId<Team>;
  game: WithId<Game>;
  prices: WithId<Price>[];
  offValue: number;
  side: "over" | "under";
  consensusLikelihood: number;
  consensusProp: WithId<PlayerProp>;
  consensusPrices: WithId<Price>[];
};

export type Play = {
  player: WithId<Player>;
  playerTeam: WithId<Team>;
  homeTeam: WithId<Team>;
  awayTeam: WithId<Team>;
  game: WithId<Game>;
  EV: number;
  side: string;
  book: Book | PropsPlatform;
  prices: WithId<Price>[];
  prop: WithId<PlayerProp>;
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
  console.log(playerPropGroups.length);

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
        // @ts-ignore
        if (!price[options.price]) {
          return;
        }
        const EV =
          options.likelihood *
            // @ts-ignore
            Odds.fromFairLine(price[options.price]).toPayoutMultiplier() -
          (1 - options.likelihood);
        if (EV > 0) {
          // console.log(
          //   `${(EV * 100).toFixed(2)}% EV for ${playerProp.player.name} (${
          //     playerProp.team.abbreviation
          //   }) ${options.label} ${playerProp["linked-prop"].value} ${
          //     playerProp["linked-prop"].propStat
          //   } on ${price.book}\n\tFair Line: ${new Odds(
          //     options.likelihood
          //     // @ts-ignore
          //   ).toAmericanOdds()}. Line on ${price.book}: ${price[options.price]}`
          // );
          // console.log(playerProp.prices);

          plays.push({
            player: playerProp.player,
            prop: playerProp["linked-prop"],
            prices: playerProp.prices,
            EV,
            side: options.label,
            book: price.book,
            playerTeam: playerProp.team,
            homeTeam: playerProp.homeTeam,
            awayTeam: playerProp.awayTeam,
            game: playerProp.game
          });
        }
      });
    }
  });
  return plays;
};

export const findMisvaluedProps = async (league?: League, book?: Book | PropsPlatform) => {
  await getConnection();
  const priceManager = new PriceManager();
  console.log("Acquiring groups");
  console.time("getGroups");
  const consensusGroups = await priceManager.groupByProp(league);
  console.log(consensusGroups.length, "Total unique prop/values");

  const groupsWithAlternates = consensusGroups.filter(
    (group) =>
      group.alternates.length && group.alternates.some((alternate) => alternate.prices.length)
  );
  console.timeEnd("getGroups");
  console.log(groupsWithAlternates.length, "Have alternate values");

  const plays: MisvaluedPlay[] = [];

  for (const consensusValueProp of groupsWithAlternates) {
    const { alternates } = consensusValueProp;
    for (const alternate of alternates) {
      const alternateDirection =
        alternate.value < consensusValueProp["linked-prop"].value ? "over" : "under";

      const consensusLikelihood = getLikelihood(consensusValueProp, alternateDirection);
      if (
        consensusLikelihood > 0.495 &&
        (!!book ? alternate.prices.some((price) => price.book === book) : true) &&
        // @ts-ignore
        alternate.prices.some((price) => !!price[alternateDirection + "Price"])
      ) {
        // console.log(
        //   `Alternate for ${consensusValueProp.player.name} (${
        //     consensusValueProp.team.abbreviation
        //   }) ${consensusValueProp["linked-prop"].value} ${
        //     consensusValueProp["linked-prop"].propStat
        //   } (${consensusValueProp.prices.map((p) => p.book).join(", ")}): ${(
        //     consensusLikelihood * 100
        //   ).toFixed(2)}%`
        // );
        plays.push({
          propId: alternate._id.toString(),
          player: consensusValueProp.player,
          playerTeam: consensusValueProp.team,
          homeTeam: consensusValueProp.homeTeam,
          awayTeam: consensusValueProp.awayTeam,
          game: consensusValueProp.game,
          prices: alternate.prices,
          offValue: alternate.value,
          side: alternateDirection,
          consensusProp: consensusValueProp["linked-prop"],
          consensusPrices: consensusValueProp.prices,
          consensusLikelihood
        });
        // console.log(consensusValueProp.prices);
        alternate.prices.forEach((price) => {
          // console.log(price);
          // console.log(
          //   // @ts-ignore
          //   `${price[alternateDirection + "Price"]} ${alternateDirection} ${alternate.value} @ ${
          //     price.book
          //   }`
          // );
        });
      }
    }
  }
  return plays;
};
