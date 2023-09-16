import { groupBy, over } from "lodash";
import { getConnection } from "../database/mongo.connection";
import { PlayerProp } from "../database/mongo.player-prop";
import { PriceModel } from "../database/mongo.price";
import { WithId } from "../database/types";
import { Odds } from "../odds/odds";
import { Book, League, Market, Period, PropsPlatform, PropsStat } from "../types";
import { Types } from "mongoose";
import { Game, Team } from "./types";
import { getLikelihood } from "./utils";

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
    book: Book | PropsPlatform;
    overPrice: number;
    underPrice: number;
  }[];
  offValue: number;
  side: "over" | "under";
  consensusLikelihood: number;
  consensusProp: WithId<PlayerProp>;
  consensusPrices: {
    book: Book | PropsPlatform;
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
  book: Book | PropsPlatform;
  fairLine: number;
  prices: {
    book: Book | PropsPlatform;
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

export async function getProps(league?: League, limit = 3) {
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
  const gameLines = lines.filter((l) => l.prop);
  const groupedGameLines = groupBy(gameLines, "prop._id");
  const now = new Date().toISOString();
  const filteredGroups = Object.values(groupedGameLines).filter(
    (lines) =>
      lines.length >= limit &&
      (league ? lines[0].prop.game.league === league : true) &&
      lines[0].prop.game.gameTime.toString() >= now.toString()
  );

  return filteredGroups;
}

export const findPlayerPropsEdge = async (league?: League) => {
  console.time("player-edge");
  const groups = await getProps(league);

  const plays: Play[] = [];

  groups.forEach((group) => {
    const prop = group[0].prop;
    const overLikelihood = getLikelihood(group, "over", "prop");
    const underLikelihood = 1 - overLikelihood;
    // check for +EV Overs
    for (const options of [
      { likelihood: overLikelihood, price: "overPrice", label: "over" },
      { likelihood: underLikelihood, price: "underPrice", label: "under" }
    ]) {
      group.forEach((price) => {
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
          plays.push({
            player: prop.player,
            // @ts-ignore
            prop: {
              value: prop.value,
              propStat: prop.propStat,
              league: prop.game.league
            },
            prices: group.map((g) => ({
              overPrice: g.overPrice,
              underPrice: g.underPrice,
              book: g.book
            })),
            EV,
            fairLine:
              options.label === "over"
                ? new Odds(overLikelihood).toAmericanOdds()
                : new Odds(underLikelihood).toAmericanOdds(),
            side: options.label,
            book: price.book,
            playerTeam: prop.player.team,
            homeTeam: prop.game.homeTeam,
            awayTeam: prop.game.awayTeam,
            game: prop.game
          });
        }
      });
    }
  });
  console.timeEnd("player-edge");
  return plays;
};

export const findMisvaluedProps = async (league?: League, book?: Book | PropsPlatform) => {
  console.time("player-misvalue");
  console.time("player-misvalue-retrieve");
  const groups = await getProps(league, 2);
  console.timeEnd("player-misvalue-retrieve");
  console.time("player-misvalue-alternates");
  const groupsWithAlternates = groups
    .map((group) => {
      const targetSample = group[0].prop;
      return {
        coreGroup: group,
        alternates: groups.filter((g) => {
          const matchSample = g[0].prop;
          return (
            matchSample.player._id === targetSample.player._id &&
            matchSample.game._id === targetSample.game._id &&
            matchSample.propStat === targetSample.propStat &&
            matchSample.value !== targetSample.value
          );
        })
      };
    })
    .filter((group) => group.alternates.some((alternateGroup) => alternateGroup.length));

  console.timeEnd("player-misvalue-alternates");
  console.log(groupsWithAlternates.length, "Have alternate values");

  const plays: MisvaluedPlay[] = [];

  console.time("player-misvalue-plays");
  for (const consensusValueProp of groupsWithAlternates) {
    const { alternates } = consensusValueProp;
    for (const alternate of alternates) {
      const alternateDirection =
        alternate[0].prop.value < consensusValueProp.coreGroup[0].prop.value ? "over" : "under";

      const consensusLikelihood = getLikelihood(
        consensusValueProp.coreGroup,
        alternateDirection,
        "prop"
      );
      if (
        consensusLikelihood > 0.495 &&
        (!!book ? alternate.some((price) => price.book === book) : true) &&
        // @ts-expect-error
        alternate.some((price) => !!price[alternateDirection + "Price"])
      ) {
        plays.push({
          propId: alternate[0].prop._id,
          player: consensusValueProp.coreGroup[0].prop.player,
          playerTeam: consensusValueProp.coreGroup[0].prop.player.team,
          homeTeam: consensusValueProp.coreGroup[0].prop.game.homeTeam,
          awayTeam: consensusValueProp.coreGroup[0].prop.game.awayTeam,
          game: consensusValueProp.coreGroup[0].prop.game,
          prices: alternate.map((a) => ({
            overPrice: a.overPrice,
            underPrice: a.underPrice,
            book: a.book
          })),
          offValue: alternate[0].prop.value,
          side: alternateDirection,
          // @ts-ignore
          consensusProp: {
            value: consensusValueProp.coreGroup[0].prop.value,
            propStat: consensusValueProp.coreGroup[0].prop.propStat
          },
          consensusPrices: consensusValueProp.coreGroup,
          consensusLikelihood
        });
      }
    }
  }
  console.timeEnd("player-misvalue-plays");
  console.timeEnd("player-misvalue");
  return plays.sort((a, b) =>
    Math.abs(a.offValue - a.consensusProp.value) / a.consensusProp.value <
    Math.abs(b.offValue - b.consensusProp.value) / b.consensusProp.value
      ? 1
      : -1
  );
};
