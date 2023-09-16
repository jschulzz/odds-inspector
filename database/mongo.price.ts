import { Schema, model, InferSchemaType, Types } from "mongoose";
import { Book, League, PropsPlatform } from "../types";
import { getConnection } from "./mongo.connection";
import { PlayerProp, PlayerPropManager } from "./mongo.player-prop";
import { Game } from "./mongo.game";
import { Player } from "./mongo.player";
import { Team } from "./mongo.team";
import { GameLine } from "./mongo.game-line";
import { WithId } from "./types";

export const priceSchema = new Schema({
  prop: { type: Schema.ObjectId, required: true },
  book: { type: String, required: true },
  overPrice: { type: Number, required: true },
  underPrice: { type: Number, required: true }
});

export type Price = InferSchemaType<typeof priceSchema>;

export type PropsPriceAggregate = {
  count: number;
  prices: WithId<{
    prop: Types.ObjectId;
    book: Book | PropsPlatform;
    overPrice: number;
    underPrice: number;
  }>[];
  "linked-prop": WithId<PlayerProp>;
  game: WithId<Game>;
  team: WithId<Team>;
  homeTeam: WithId<Team>;
  awayTeam: WithId<Team>;
  player: WithId<Player>;
  alternates: WithId<PlayerProp & { prices: WithId<Price>[] }>[];
};

export type GameLinePriceAggregate = {
  count: number;
  prices: {
    book: Book;
    overPrice: number;
    underPrice: number;
  }[];
  "linked-line": WithId<GameLine>;
  game: WithId<Game>;
  homeTeam: WithId<Team>;
  awayTeam: WithId<Team>;
};

export const PriceModel = model("price", priceSchema);

export class PriceManager {
  constructor() {}

  async deletePropPricesForLeague(league: League, book?: Book | PropsPlatform) {
    await getConnection();
    const playerPropManager = new PlayerPropManager();

    const priceAgg = await PriceModel.aggregate([
      {
        $lookup: {
          from: "player-props",
          localField: "prop",
          foreignField: "_id",
          as: "linked-prop"
        }
      },
      {
        $unwind: {
          path: "$linked-prop"
        }
      },
      {
        $match: {
          "linked-prop.league": league,
          ...(book ? { book } : {})
        }
      }
    ]);
    const pricesToDelete = priceAgg.map((x) => x._id);
    console.log(`Attempting to delete ${pricesToDelete.length} prices`);
    const propIds = [...new Set(priceAgg.map((x) => x["linked-prop"]._id))];

    await playerPropManager.deleteMany(propIds);

    const results = await PriceModel.deleteMany({
      _id: { $in: pricesToDelete }
    }).exec();
    console.log(`Deleted ${results.deletedCount} prop prices`);
  }

  async deleteGamePricesForLeagueOnBook(league: League, book: Book | PropsPlatform) {
    await getConnection();

    const priceAgg = await PriceModel.aggregate([
      {
        $lookup: {
          from: "game-lines",
          localField: "prop",
          foreignField: "_id",
          as: "linked-line"
        }
      },
      {
        $unwind: {
          path: "$linked-line"
        }
      },
      {
        $lookup: {
          from: "games",
          localField: "linked-line.game",
          foreignField: "_id",
          as: "game"
        }
      },
      {
        $unwind: {
          path: "$game"
        }
      },
      {
        $match: {
          "game.gameTime": {
            $gte: new Date()
          },
          "game.league": league,
          book
        }
      }
    ]);
    const pricesToDelete = priceAgg.map((x) => x._id);

    const results = await PriceModel.deleteMany({
      _id: { $in: pricesToDelete }
    }).exec();
    console.log(`Deleted ${results.deletedCount} game prices on ${book}`);
  }

  async upsertGameLinePrice(
    line: GameLine,
    book: Book | PropsPlatform,
    prices?: { overPrice?: number; underPrice?: number }
  ) {
    await getConnection();
    let price;
    try {
      price = await PriceModel.findOneAndUpdate(
        {
          prop: line,
          book
        },
        {
          _id: new Types.ObjectId(),
          prop: line,
          book,
          overPrice: prices?.overPrice,
          underPrice: prices?.underPrice
        },
        { upsert: true, returnDocument: "after" }
      );
      console.log(`Added pricing on ${book}`);
    } catch {
      price = await PriceModel.findOneAndUpdate(
        {
          prop: line,
          book
        },
        {
          prop: line,
          book,
          overPrice: prices?.overPrice,
          underPrice: prices?.underPrice
        },
        { upsert: true, returnDocument: "after" }
      );
    }

    const populated = await price!.populate(["prop"]);
    return populated.toObject();
  }
  async upsertPlayerPropPrice(
    prop: PlayerProp,
    book: Book | PropsPlatform,
    prices?: { overPrice?: number; underPrice?: number }
  ) {
    await getConnection();

    let price;
    try {
      price = await PriceModel.findOneAndUpdate(
        {
          prop,
          book
        },
        {
          _id: new Types.ObjectId(),
          prop,
          book,
          overPrice: prices?.overPrice,
          underPrice: prices?.underPrice
        },
        { upsert: true, returnDocument: "after" }
      );
    } catch {
      price = await PriceModel.findOneAndUpdate(
        {
          prop,
          book
        },
        {
          prop,
          book,
          overPrice: prices?.overPrice,
          underPrice: prices?.underPrice
        },
        { upsert: true, returnDocument: "after" }
      );
    }
    return price.toObject();
  }

  async groupByGameLine(league?: League) {
    const aggs = await PriceModel.aggregate<GameLinePriceAggregate>([
      {
        $match: {
          overPrice: { $ne: null },
          underPrice: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            prop: "$prop"
          },
          count: {
            $sum: 1
          },
          prices: {
            $push: {
              book: "$book",
              overPrice: "$overPrice",
              underPrice: "$underPrice"
            }
          }
        }
      },
      {
        $lookup: {
          from: "game-lines",
          localField: "_id.prop",
          foreignField: "_id",
          as: "linked-line"
        }
      },
      {
        $unwind: {
          path: "$linked-line"
        }
      },
      {
        $lookup: {
          from: "games",
          localField: "linked-line.game",
          foreignField: "_id",
          as: "game"
        }
      },
      {
        $unwind: {
          path: "$game"
        }
      },
      {
        $lookup: {
          from: "teams",
          localField: "game.homeTeam",
          foreignField: "_id",
          as: "homeTeam"
        }
      },
      {
        $unwind: {
          path: "$homeTeam"
        }
      },
      {
        $lookup: {
          from: "teams",
          localField: "game.awayTeam",
          foreignField: "_id",
          as: "awayTeam"
        }
      },
      {
        $unwind: {
          path: "$awayTeam"
        }
      },
      {
        $match: {
          count: {
            $gte: 3
          },
          ...(league ? { "game.league": league } : {}),
          "game.gameTime": {
            $gte: new Date()
          }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);
    //@ts-ignore
    return aggs;
  }

  async groupByProp(league?: League) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    console.log({ today: now.toLocaleDateString(), yesterday: yesterday.toLocaleDateString() });
    const aggs = await PriceModel.aggregate<PropsPriceAggregate>(
      [
        {
          $group: {
            _id: {
              prop: "$prop"
            },
            count: {
              $sum: 1
            },
            prices: {
              $push: {
                book: "$book",
                overPrice: "$overPrice",
                underPrice: "$underPrice"
              }
            }
          }
        },
        {
          $lookup: {
            from: "player-props",
            localField: "_id.prop",
            foreignField: "_id",
            as: "linked-prop"
          }
        },
        {
          $unwind: {
            path: "$linked-prop"
          }
        },
        ...(league
          ? [
              {
                $match: {
                  "linked-prop.league": league
                }
              }
            ]
          : []),
        {
          $lookup: {
            from: "games",
            localField: "linked-prop.game",
            foreignField: "_id",
            as: "game"
          }
        },
        {
          $unwind: {
            path: "$game"
          }
        },
        {
          $match: {
            count: {
              $gte: 2
            },
            "game.gameTime": {
              $gte: now
            }
          }
        },
        {
          $lookup: {
            from: "player-props",
            let: {
              pricePlayer: "$linked-prop.player",
              priceGame: "$linked-prop.game",
              priceValue: "$linked-prop.value",
              pricePropStat: "$linked-prop.propStat"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$player", "$$pricePlayer"]
                      },
                      {
                        $eq: ["$game", "$$priceGame"]
                      },
                      {
                        $eq: ["$propStat", "$$pricePropStat"]
                      },
                      {
                        $ne: ["$value", "$$priceValue"]
                      }
                    ]
                  }
                }
              },
              {
                $lookup: {
                  from: "prices",
                  localField: "_id",
                  foreignField: "prop",
                  as: "prices"
                }
              }
            ],
            as: "alternates"
          }
        },

        {
          $lookup: {
            from: "teams",
            localField: "game.homeTeam",
            foreignField: "_id",
            as: "homeTeam"
          }
        },
        {
          $unwind: {
            path: "$homeTeam"
          }
        },
        {
          $lookup: {
            from: "teams",
            localField: "game.awayTeam",
            foreignField: "_id",
            as: "awayTeam"
          }
        },
        {
          $unwind: {
            path: "$awayTeam"
          }
        },
        {
          $lookup: {
            from: "players",
            localField: "linked-prop.player",
            foreignField: "_id",
            as: "player"
          }
        },
        {
          $unwind: {
            path: "$player"
          }
        },
        {
          $lookup: {
            from: "teams",
            localField: "player.team",
            foreignField: "_id",
            as: "team"
          }
        },
        {
          $unwind: {
            path: "$team"
          }
        }

        // {
        //   $sort: {
        //     count: -1
        //   }
        // }
      ],
      { maxTimeMS: 60000 }
    );
    //@ts-ignore
    return aggs;
  }

  async getPricesByProp(prop: WithId<PlayerProp>) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const aggs = await PriceModel.aggregate<PropsPriceAggregate>(
      [
        {
          $group: {
            _id: {
              prop: "$prop"
            },
            count: {
              $sum: 1
            },
            prices: {
              $push: {
                book: "$book",
                overPrice: "$overPrice",
                underPrice: "$underPrice"
              }
            }
          }
        },
        {
          $lookup: {
            from: "player-props",
            localField: "_id.prop",
            foreignField: "_id",
            as: "linked-prop"
          }
        },
        {
          $unwind: {
            path: "$linked-prop"
          }
        },
        {
          $lookup: {
            from: "games",
            localField: "linked-prop.game",
            foreignField: "_id",
            as: "game"
          }
        },
        {
          $unwind: {
            path: "$game"
          }
        },
        {
          $lookup: {
            from: "teams",
            localField: "game.homeTeam",
            foreignField: "_id",
            as: "homeTeam"
          }
        },
        {
          $unwind: {
            path: "$homeTeam"
          }
        },
        {
          $lookup: {
            from: "teams",
            localField: "game.awayTeam",
            foreignField: "_id",
            as: "awayTeam"
          }
        },
        {
          $unwind: {
            path: "$awayTeam"
          }
        },
        {
          $lookup: {
            from: "players",
            localField: "linked-prop.player",
            foreignField: "_id",
            as: "player"
          }
        },
        {
          $unwind: {
            path: "$player"
          }
        },
        {
          $lookup: {
            from: "teams",
            localField: "player.team",
            foreignField: "_id",
            as: "team"
          }
        },
        {
          $unwind: {
            path: "$team"
          }
        },
        {
          $match: {
            count: {
              $lte: 3,
              $gt: 0
            },
            "linked-prop._id": new Types.ObjectId(prop._id),
            "game.gameTime": {
              $gte: today
            }
          }
        }
        // {
        //   $sort: {
        //     count: -1
        //   }
        // }
      ],
      { maxTimeMS: 60000 }
    );
    //@ts-ignore
    return aggs;
  }
}
