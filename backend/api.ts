import { Router } from "express";
import joi from "joi";
import { Book, League } from "../frontend/src/types";
import { getPinnacle, getPinnacleProps } from "../import/pinnacle";
import { getActionNetworkLines, getActionNetworkProps } from "../import/actionNetwork";
import { getPrizePicksLines } from "../import/prizepicks";
import { getUnderdogLines } from "../import/underdog";
import { getProps } from "../db-analysis/player-props";
import { findGameLines } from "../db-analysis/game-lines";
import { sortedDFSbooks, sortedSportsbooks } from "../books";
import { PriceManager } from "../database/mongo.price";
import { GameManager } from "../database/mongo.game";
export const router = Router();

router.post("/import", async (req, res, next) => {
  const priceManager = new PriceManager();
  const gameManager = new GameManager();
  const importSchema = joi.object().keys({
    leagues: joi.array().items(joi.string().valid(...Object.values(League)))
  });
  const validation = importSchema.validate(req.body);
  if (validation.error) {
    res.status(400).send({ message: "Could not process request", error: validation.error });
    next(new Error("Could not process request"));
  }
  const leagues: League[] = req.body.leagues;
  res.status(201).send({ message: "Completing request" }).end();
  for (const league of leagues) {
    await priceManager.deletePropPricesForLeague(league);
    await gameManager.deleteByLeague(league);
    await getPinnacle(league);
    await getActionNetworkLines(league);
    if (![League.NCAAB, League.NCAAF].includes(league)) {
      console.log("Tracking Action Network Props");
      await getActionNetworkProps(league);
      console.log("Tracking Pinnacle Props");
      await getPinnacleProps(league);
      console.log("Tracking Underdog Props");
      await getUnderdogLines(league);
      console.log("Tracking PrizePicks Props");
      await getPrizePicksLines(league);
      // await getNoHouse(league);
    }
  }
  console.log("Completed import");
});

router.post("/import/dfs", async (req, res, next) => {
  const priceManager = new PriceManager();
  console.log(req.body);
  const importSchema = joi.object().keys({
    leagues: joi.array().items(joi.string().valid(...Object.values(League)))
  });
  const validation = importSchema.validate(req.body);
  if (validation.error) {
    res.status(400).send({ message: "Could not process request", error: validation.error });
    next(new Error("Could not process request"));
  }
  const leagues: League[] = req.body.leagues;
  for (const league of leagues) {
    await priceManager.deletePropPricesForLeague(league, Book.PRIZEPICKS);
    await priceManager.deletePropPricesForLeague(league, Book.UNDERDOG);
    if (![League.NCAAB, League.NCAAF].includes(league)) {
      console.log("Tracking Underdog Props");
      await getUnderdogLines(league);
      console.log("Tracking PrizePicks Props");
      await getPrizePicksLines(league);
    }
  }
  res.status(201).send({ message: "Completed request" }).end();
  console.log("Completed import");
});

router.get("/books", async (req, res) => {
  res.send({ dfsBooks: sortedDFSbooks, sportsbooks: sortedSportsbooks });
});

router.get("/player-props", async (req, res) => {
  console.log("Getting player props edge");
  const playerProps = await getProps();
  res.send(playerProps);
});

router.get("/game-lines", async (req, res) => {
  const gameProps = await findGameLines();
  res.send(gameProps);
});
