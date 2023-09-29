import { groupBy, isEqual, uniqWith } from "lodash";
import { getConnection } from "../database/mongo.connection";
import { Price, PriceModel } from "../database/mongo.price";
import { WithId } from "../database/types";
import { Odds } from "../odds/odds";
import {
  Book,
  League,
  Market,
  Period,
  Game,
  GameLineGroup,
  PricedValue
} from "../frontend/src/types";
import { Types } from "mongoose";
import { getLikelihood } from "./utils";

export type ResolvedGameLine = {
  _id: Types.ObjectId;
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
  book: Book;
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

export const findGameLines = async (league?: League): Promise<GameLineGroup[]> => {
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
        populate: [
          { path: "homeTeam", model: "Team" },
          { path: "awayTeam", model: "Team" }
        ]
      }
    })
    .exec();
  const gameLines = lines.filter((l) => l.prop && l.prop.game);
  const groupedGameLines = groupBy(gameLines, "prop._id");
  const now = new Date();
  const filteredGroups = Object.values(groupedGameLines).filter(
    (lines) =>
      lines.length >= 3 &&
      (league ? lines[0].prop.game.league === league : true) &&
      lines[0].prop.game.gameTime >= now
  );

  const groups = filteredGroups.map((group) => {
    const allValues = filteredGroups.filter((g) => {
      const matchSample = g[0];
      return (
        matchSample.prop.game._id === group[0].prop.game._id &&
        matchSample.prop.period === group[0].prop.period &&
        matchSample.prop.side === group[0].prop.side &&
        matchSample.prop.type === group[0].prop.type
      );
    });

    const groupedValues = groupBy(allValues, "[0].prop.value");
    return {
      metadata: {
        game: group[0].prop.game,
        period: group[0].prop.period,
        league: group[0].prop.game.league,
        type: group[0].prop.type,
        side: group[0].prop.side
        // value: group[0].prop.value
      },
      values: Object.entries(groupedValues).map(
        ([value, [prices]]: [string, ResolvedGameLine[][]]) => {
          const pricedValue = {
            value: +value,
            prices: prices.map((price) => ({
              overPrice: price.overPrice,
              underPrice: price.underPrice,
              book: price.book
            }))
          };
          // console.log(pricedValue);
          return pricedValue;
        }
      )
    };
  });
  const uniqueGroups = uniqWith(groups, (a, b) => isEqual(a.metadata, b.metadata));
  return uniqueGroups;
};
