import { Schema, model, InferSchemaType, Types } from "mongoose";
import { Book, League, PropsPlatform } from "../types";
import { getConnection } from "./mongo.connection";
import { PlayerProp, PlayerPropManager } from "./mongo.player-prop";
import { Game, GameManager } from "./mongo.game";
import { Player, PlayerManager } from "./mongo.player";
import { Team, TeamManager } from "./mongo.team";
import { GameLine, GameLineManager } from "./mongo.game-line";

export const priceSchema = new Schema({
  prop: { type: Schema.ObjectId, required: true },
  book: { type: String, required: true },
  overPrice: { type: Number, required: true },
  underPrice: { type: Number, required: true }
});

export type Price = InferSchemaType<typeof priceSchema>;

export type PropsPriceAggregate = {
  count: number;
  prices: {
    book: Book | PropsPlatform;
    overPrice: number;
    underPrice: number;
  }[];
  "linked-prop": PlayerProp;
  game: Game;
  team: Team;
  player: Player;
};

export type GameLinePriceAggregate = {
  count: number;
  prices: {
    book: Book;
    overPrice: number;
    underPrice: number;
  }[];
  "linked-line": GameLine;
  game: Game;
  homeTeam: Team;
  awayTeam: Team;
};

const PriceModel = model("price", priceSchema);

export class PriceManager {
  constructor() {}

  async deletePricesForLeagueOnBook(league: League, book: Book) {
    await getConnection();
    const gameLineManager = new GameLineManager();
    const gameManager = new GameManager();
    const futureGamesForLeague = await gameManager.findByLeague(league, new Date());
    const linesForFutureGames: Types.ObjectId[] = (
      await gameLineManager
        // @ts-ignore
        .findLinesForGames(futureGamesForLeague)
    )
      // @ts-ignore
      .map((x) => x._id);
    const stalePrices = await PriceModel.find({
      prop: { $in: linesForFutureGames },
      book
    });
    console.log(`Deleting prices on ${book}`);
    await PriceModel.deleteMany({
      _id: { $in: stalePrices.map((s) => s._id) }
    });

    // for (const stalePrice of stalePrices) {
    //   await PriceModel.deleteOne({ _id: stalePrice._id });
    // }
  }

  async upsertGameLinePrice(
    line: GameLine,
    book: Book | PropsPlatform,
    prices?: { overPrice?: number; underPrice?: number }
  ) {
    await getConnection();
    console.log(`Adding pricing on ${book}`);
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
    const playerPropManager = new PlayerPropManager();
    const playerManager = new PlayerManager();
    console.log(`Adding pricing on ${book}`);
    const alternateProps = await playerPropManager.findAlternateLines(prop);
    const stalePrices = await PriceModel.find({
      prop: { $in: alternateProps.map((prop) => prop._id) },
      book
    });

    for (const stalePrice of stalePrices) {
      const player = await playerManager.findById(prop.player);
      console.log(
        `Found stale price for ${player.name} ${prop.value} ${prop.propStat} on ${book}. Deleting now.`
      );
      await PriceModel.deleteOne({ _id: stalePrice._id });
    }
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

    const populated = await price!.populate(["prop"]);
    return populated.toObject();
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
          "game.league": league ? league : undefined,
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
    const aggs = await PriceModel.aggregate<PropsPriceAggregate>([
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
            $gte: 3
          },
          "linked-prop.league": league ? league : undefined,
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

  async getPricesByProp(prop: PlayerProp) {
    const aggs = await PriceModel.aggregate<PropsPriceAggregate>([
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
          // @ts-ignore
          "linked-prop._id": new Types.ObjectId(prop._id),
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
}
