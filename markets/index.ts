import { Market } from "../types";

const marketNames = [
  { names: ["Moneyline", "Home/Away", "moneyline"], market: Market.MONEYLINE },
  { names: ["Spread", "spread"], market: Market.SPREAD },
  { names: ["Total", "total"], market: Market.GAME_TOTAL },
  { names: ["team_total"], market: Market.TEAM_TOTAL },
];

export const findMarket = (marketID: string) => {
  for (const { names, market } of marketNames) {
    if (names.includes(marketID)) {
      return market;
    }
  }
  console.log(`No known market ${marketID}`);
};
