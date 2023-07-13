import { Router } from "express";
import * as joi from "joi";
import { League } from "../types";
import { getPinnacle, getPinnacleProps } from "../import/pinnacle";
import { getActionNetworkLines, getActionNetworkProps } from "../import/actionNetwork";
import { getNoHouse } from "../import/no-house";
import { getPrizePicksLines } from "../import/prizepicks";
import { getUnderdogLines } from "../import/underdog";
import { findMisvaluedProps, findPlayerPropsEdge } from "../db-analysis/player-props";
export const router = Router();

router.post("/import", async (req, res, next) => {
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
    await getPinnacle(league);
    await getActionNetworkLines(league);
    await getPinnacleProps(league);
    await getActionNetworkProps(league);
    await getUnderdogLines(league);
    await getPrizePicksLines(league);
    await getNoHouse(league);
  }
});

router.get("/player-props/edge", async (req, res) => {
  const playerProps = await findPlayerPropsEdge(League.WNBA);
  res.send(playerProps);
});

router.get("/player-props/misvalue", async (req, res) => {
  const playerProps = await findMisvaluedProps(League.WNBA);
  res.send(playerProps);
});
