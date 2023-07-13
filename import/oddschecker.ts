import axios from "axios";
import fs from "fs";
import path from "path";
import { findBook } from "../books";
import { findMarket } from "../markets";
import { Odds } from "../odds/odds";
import { League, Period, Moneyline, Spread, Market } from "../types";
import { GameTotal, LineChoice, SourcedOdds } from "../types/lines";
import puppeteer from "puppeteer";
import request_client from "request-promise-native";

export const getOddschecker = async (league: League) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://www.oddschecker.com/us/basketball/nba/");

  //   await page.waitForSelector('ul > div > ul > li')
  const gametimeGroups = await page.$$("div > ul > div");
  const gameLinks = [];
  for (const gametimeGroup of gametimeGroups) {
    const gameDateElement = await gametimeGroup.$('div[data-testid="bet-date"]');
    const gameDate = await gameDateElement?.evaluate((el) => el.textContent);
    if (gameDate !== "Today") {
      continue;
    }
    const linkElements = await gametimeGroup.$$('ul > li[data-testid="match"] > a');
    for (const linkElement of linkElements) {
      const link = await linkElement?.evaluate((el) => el.getAttribute("to"));
      gameLinks.push(link);
    }
  }
  console.log(gameLinks);

  for (const gameLink of gameLinks) {
    // const markets = ['Points']
    await page.goto(`https://www.oddschecker.com/us/${gameLink}`);
    const marketOptions = await page.$$('div[data-testid="markets-container"] > button');
    for (const marketOption of marketOptions) {
      const text = await marketOption?.evaluate((el) => el.textContent);
      console.log(text);
      await marketOption.click();
      const showAllButton = await page.$('button[data-testid="all-button"]');
      await showAllButton?.click();
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  await browser.close();
};

// getOdds("nfl");
