import { groupBy } from "lodash";
import { getConnection } from "../database/mongo.connection";
import { Price, PriceModel } from "../database/mongo.price";
import { WithId } from "../database/types";
import { Odds } from "../odds/odds";
import { Book, League, Market, Period } from "../types";
import { Types } from "mongoose";
import { Game } from "./types";
import { getLikelihood } from "./utils";

export type ResolvedGameLine = {
  _id: Types.ObjectId;
  book: Book;
  prop: {
    _id: Types.ObjectId;
    game: Game;
    period: Period;
    side?: string;
    value?: number;
    type: Market;
  };
  overPrice: number;
  underPrice: number;
};

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

const excludedBooks = new Set([Book.PINNACLE]);

export const findGameLineEdge = async (league?: League) => {
  await getConnection();
  // @ts-ignore
  const lines: ResolvedGameLine[] = await PriceModel.find({
    overPrice: { $ne: null },
    underPrice: { $ne: null }
  })
    .populate({
      path: "prop",
      model: "game-line",
      populate: {
        path: "game",
        model: "Game",
        populate: [{ path: "homeTeam" }, { path: "awayTeam" }]
      }
    })
    .exec();
  const gameLines = lines.filter((l) => l.prop && l.prop.game);
  const groupedGameLines = groupBy(gameLines, "prop._id");
  const now = new Date().toISOString();
  const filteredGroups = Object.values(groupedGameLines).filter(
    (lines) =>
      lines.length >= 3 &&
      (league ? lines[0].prop.game.league === league : true) &&
      lines[0].prop.game.gameTime.toString() >= now
  );
  const plays: GameLinePlay[] = [];

  filteredGroups.forEach((group) => {
    const overLikelihood = getLikelihood(group, "over", "game");
    const underLikelihood = 1 - overLikelihood;
    for (const options of [
      { likelihood: overLikelihood, price: "overPrice", label: "over" },
      { likelihood: underLikelihood, price: "underPrice", label: "under" }
    ]) {
      const prop = group[0].prop;
      const game = prop.game;
      group.forEach((price) => {
        const awayTeamName =
          game.awayTeam.abbreviation === "-" ? game.awayTeam.name : game.awayTeam.abbreviation;
        const homeTeamName =
          game.homeTeam.abbreviation === "-" ? game.homeTeam.name : game.homeTeam.abbreviation;

        // @ts-ignore
        if (!price[options.price]) {
          console.log(options, price);
        }
        const EV =
          options.likelihood *
            // @ts-ignore
            Odds.fromFairLine(price[options.price]).toPayoutMultiplier() -
          (1 - options.likelihood);
        if (
          EV > -0.01 &&
          options.likelihood > 0.35 &&
          options.likelihood < 0.65 &&
          !excludedBooks.has(price.book)
        ) {
          // console.log(
          //   `${(EV * 100).toFixed(2)}% EV for ${awayTeamName} @ ${homeTeamName} ${options.label} ${
          //     gameLine["linked-line"].value
          //   } ${gameLine["linked-line"].period} ${gameLine["linked-line"].type} on ${
          //     price.book
          //   }\n\tFair Line: ${new Odds(
          //     options.likelihood
          //     // @ts-ignore
          //   ).toAmericanOdds()}. Line on ${price.book}: ${price[options.price]}`
          // );
          plays.push({
            EV,
            gameLabel: `${awayTeamName} @ ${homeTeamName} (${game.league})`,
            type: prop.type,
            period: prop.period,
            metadata: {
              side: prop.side || options.label,
              value: prop.value
            },
            fairLine: new Odds(options.likelihood).toAmericanOdds(),
            book: price.book,
            prices: group.map((price) => ({
              _id: price._id,
              overPrice: price.overPrice,
              underPrice: price.underPrice,
              book: price.book as string,
              prop: price.prop._id
            }))
          });
        }
      });
    }
  });
  return plays;
};
