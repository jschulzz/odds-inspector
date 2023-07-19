import { GameManager } from "../database/mongo.game";
import { PlayerPropManager, playerPropSchema } from "../database/mongo.player-prop";
import { PriceManager } from "../database/mongo.price";
import { League } from "../types";

export const flattenLines = async (league: League) => {
  const gameManager = new GameManager();
  const playerPropManager = new PlayerPropManager();
  const priceManager = new PriceManager();
  const events: any[] = [];
  const propsForLeague = await playerPropManager.findByLeague(league);
//   console.log(propsForLeague, propsForLeague.length);
  const groups = new Map();
  for (const [propIdx, prop] of propsForLeague.entries()) {
    const key = `${prop.player._id.toString()}-${prop.propStat}`;
    const prices = await priceManager.getPricesByProp(prop);
    const propWithPrices = { ...prop, prices };
    const group = groups.get(key) || [];
    group.push(propWithPrices);
    groups.set(key, group);
    console.log(`${propIdx}/${propsForLeague.length}`);
  }
  console.log(groups);
};

flattenLines(League.MLB);
