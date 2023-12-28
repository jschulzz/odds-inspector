import { Schema, model, InferSchemaType, Types, SchemaType, SchemaTypes } from "mongoose";
import { GameLineGroup, League, Market, Period, PropGroup, PropsStat } from "../frontend/src/types";
import { getConnection } from "./mongo.connection";
import { PlayerManager } from "./mongo.player";

export const groupSchema = new Schema({
  metadata: {
    type: {
      game: {
        homeTeam: {
          type: {
            name: { type: String },
            league: { type: String },
            abbreviation: { type: [String] }
          }
        },
        awayTeam: {
          type: {
            name: { type: String },
            league: { type: String },
            abbreviation: { type: [String] }
          }
        },
        league: { type: String },
        gameTime: { type: Date }
      },
      league: String,
      // PropsGroup
      player: {
        name: { type: String },
        team: {
          type: {
            name: { type: String },
            league: { type: String },
            abbreviation: { type: [String] }
          }
        },
        league: { type: String }
      },
      propStat: String,
      // GameLineGroup
      period: String,
      side: String,
      value: Number,
      market: String
    }
  },
  values: {
    type: [
      {
        value: { type: Number },
        prices: [
          {
            overPrice: Number,
            underPrice: Number,
            book: String
          }
        ]
      }
    ]
  }
});

export type Group = InferSchemaType<typeof groupSchema>;

export const GroupModel = model("group", groupSchema);

export type GroupSearchQuery = {
  type: "prop" | "game";
  date?: Date;
  league: League;
  homeTeamName?: string;
  awayTeamName?: string;
  market?: Market;
  period?: Period;
  playerName?: string;
  propStat?: PropsStat;
};

export class GroupManager {
  constructor() {}

  async tryToInsert(group: GameLineGroup | PropGroup) {
    await getConnection();

    const query = {
      ...((group as GameLineGroup).metadata.game.gameTime
        ? { "metadata.game.gameTime": (group as GameLineGroup).metadata.game.gameTime }
        : {}),
      ...((group as GameLineGroup).metadata.game.awayTeam.name
        ? { "metadata.game.awayTeam.name": (group as GameLineGroup).metadata.game.awayTeam.name }
        : {}),
      ...((group as GameLineGroup).metadata.game.homeTeam.name
        ? { "metadata.game.homeTeam.name": (group as GameLineGroup).metadata.game.homeTeam.name }
        : {}),
      ...((group as GameLineGroup).metadata.league
        ? { "metadata.league": (group as GameLineGroup).metadata.league }
        : {}),
      ...((group as GameLineGroup).metadata.period
        ? { "metadata.period": (group as GameLineGroup).metadata.period }
        : {}),
      ...((group as GameLineGroup).metadata.side
        ? { "metadata.side": (group as GameLineGroup).metadata.side }
        : {}),
      ...((group as GameLineGroup).metadata.type
        ? { "metadata.market": (group as GameLineGroup).metadata.type }
        : {}),
      ...((group as GameLineGroup).metadata.value
        ? { "metadata.value": (group as GameLineGroup).metadata.value }
        : {}),
      ...((group as PropGroup).metadata.player?.league
        ? { "metadata.player.league": (group as PropGroup).metadata.player.league }
        : {}),
      ...((group as PropGroup).metadata.player?.name
        ? { "metadata.player.name": (group as PropGroup).metadata.player.name }
        : {}),
      ...((group as PropGroup).metadata.player?.team.name
        ? { "metadata.player.team.name": (group as PropGroup).metadata.player.team.name }
        : {}),
      ...((group as PropGroup).metadata.propStat
        ? { "metadata.propStat": (group as PropGroup).metadata.propStat }
        : {})
    };
    const insertion = {
      ...group,
      metadata: {
        ...group.metadata,
        game: {
          awayTeam: {
            name: group.metadata.game.awayTeam.name,
            abbreviation: group.metadata.game.awayTeam.abbreviation,
            league: group.metadata.game.awayTeam.league
          },
          homeTeam: {
            name: group.metadata.game.homeTeam.name,
            abbreviation: group.metadata.game.homeTeam.abbreviation,
            league: group.metadata.game.homeTeam.league
          },
          gameTime: group.metadata.game.gameTime,
          league: group.metadata.game.league
        },
        ...((group as GameLineGroup).metadata.type
          ? { market: (group as GameLineGroup).metadata.type }
          : {}),
        ...((group as PropGroup).metadata.player
          ? {
              player: {
                name: (group as PropGroup).metadata.player.name,
                league: (group as PropGroup).metadata.player.league,
                team: {
                  name: (group as PropGroup).metadata.player.team.name,
                  abbreviation: (group as PropGroup).metadata.player.team.abbreviation,
                  league: (group as PropGroup).metadata.player.team.league
                }
              }
            }
          : {})
      },
      values: group.values.map((v) => ({
        ...v,
        value: v.value || undefined
      }))
    };
    const dbGroup = await GroupModel.findOneAndUpdate(query, insertion, {
      upsert: true,
      returnDocument: "after"
    });

    return dbGroup;
  }

  async findGroupsByMetadata(searchQuery: GroupSearchQuery) {
    const playerManager = new PlayerManager();
    let player;
    if (searchQuery.playerName) {
      player = await playerManager.findByName(searchQuery.playerName, searchQuery.league);
    }
    const typeClause =
      searchQuery.type === "game"
        ? { "metadata.market": { $exists: true } }
        : { "metadata.player": { $exists: true } };
    const query = {
      ...typeClause,
      ...(searchQuery.market ? { "metadata.market": searchQuery.market } : {}),
      ...(searchQuery.period ? { "metadata.period": searchQuery.period } : {}),
      ...(player ? { "metadata.player": player } : {}),
      "metadata.game.homeTeam.name": searchQuery.homeTeamName,
      "metadata.game.awayTeam.name": searchQuery.awayTeamName
    };

    console.log("Searching for", query);

    await getConnection();

    const dbGroups = await GroupModel.find(query);
    return dbGroups;
  }
}
