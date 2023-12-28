import { Types } from "mongoose";
import { groupBy, isElement, isEqual, over, uniqWith } from "lodash";
import { getConnection } from "../database/mongo.connection";
import { PlayerProp } from "../database/mongo.player-prop";
import { PriceModel } from "../database/mongo.price";
import { WithId } from "../database/types";
import { Book, League, Market, Period, PropsStat } from "../frontend/src/types";
import { Game, PropGroup, Team } from "../frontend/src/types";

export type MisvaluedPlay = {
  propId: Types.ObjectId;
  player: {
    _id: Types.ObjectId;
    league: League;
    name: string;
    team: Team;
  };
  homeTeam: Team;
  awayTeam: Team;
  playerTeam: Team;
  game: Game;
  prices: {
    book: Book;
    overPrice: number;
    underPrice: number;
  }[];
  offValue: number;
  side: "over" | "under";
  consensusLikelihood: number;
  consensusProp: WithId<PlayerProp>;
  consensusPrices: {
    book: Book;
    overPrice: number;
    underPrice: number;
  }[];
};

export type Play = {
  player: {
    _id: Types.ObjectId;
    league: League;
    name: string;
    team: Team;
  };
  playerTeam: Team;
  homeTeam: Team;
  awayTeam: Team;
  game: Game;
  EV: number;
  side: string;
  book: Book;
  fairLine: number;
  prices: {
    book: Book;
    overPrice: number;
    underPrice: number;
  }[];
  prop: WithId<PlayerProp>;
};

export type ResolvedProp = {
  _id: Types.ObjectId;
  book: Book;
  prop: {
    _id: Types.ObjectId;
    game: Game;
    period: Period;
    type: Market;
    player: {
      _id: Types.ObjectId;
      league: League;
      name: string;
      team: Team;
    };
    propStat: PropsStat;
    value: number;
  };
  overPrice: number;
  underPrice: number;
};

export async function getProps(league?: League, since?: Date): Promise<PropGroup[]> {
  await getConnection();

  // @ts-ignore
  const lines: ResolvedProp[] = await PriceModel.find({
    overPrice: { $ne: null },
    underPrice: { $ne: null }
  })
    .populate({
      path: "prop",
      model: "player-prop",
      populate: [
        { path: "game", populate: [{ path: "homeTeam" }, { path: "awayTeam" }] },
        {
          path: "player",
          populate: { path: "team" }
        }
      ]
    })
    .exec();
  const gameLines = lines.filter((l) => l.prop && l.prop.game);
  const groupedProps = groupBy(gameLines, "prop._id");
  const now = new Date();
  const filteredGroups = Object.values(groupedProps).filter(
    (lines) =>
      // lines.length >= limit &&
      (league ? lines[0].prop.game.league === league : true) &&
      lines[0].prop.game.gameTime >= (since || now)
  );

  const groups = filteredGroups.map((group) => {
    const allValues = filteredGroups.filter((g) => {
      const matchSample = g[0].prop;
      return (
        matchSample.player._id === group[0].prop.player._id &&
        matchSample.game._id === group[0].prop.game._id &&
        matchSample.propStat === group[0].prop.propStat
      );
    });
    const groupedValues = groupBy(allValues, "[0].prop.value");
    if (group[0].prop.player.name.includes("Ridder") && group[0].prop.propStat === "passingYards") {
      console.log(groupedValues);
    }
    const propLine: PropGroup = {
      metadata: {
        game: group[0].prop.game,
        propStat: group[0].prop.propStat,
        player: group[0].prop.player,
        league: group[0].prop.game.league
      },
      values: Object.entries(groupedValues).map(([value, [prices]]: [string, ResolvedProp[][]]) => {
        const pricedValue = {
          value: +value,
          prices: prices.map((price) => ({
            overPrice: price.overPrice,
            underPrice: price.underPrice,
            book: price.book
          }))
        };
        return pricedValue;
      })
    };
    return propLine;
  });
  const uniqueGroups = uniqWith(groups, (a, b) => isEqual(a.metadata, b.metadata));
  return uniqueGroups;
}
