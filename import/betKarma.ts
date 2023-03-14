import axios from "axios";
import { findBook } from "../books";
import { findStat } from "../props";
import { Book, League, Prop, PropsPlatform } from "../types";
import { LineChoice } from "../types/lines";

export const getBetKarma = async (league: League): Promise<Prop[]> => {
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
  let dd = today.getDate().toString().padStart(2, "0");
  const startDate = `${yyyy}-${mm}-${dd}`;
  if (league === League.NFL) {
    today.setDate(today.getDate() + 6);
    yyyy = today.getFullYear();
    mm = (today.getMonth() + 1).toString().padStart(2, "0"); // Months start at 0
    dd = today.getDate().toString().padStart(2, "0");
  }
  const endDate = `${yyyy}-${mm}-${dd}`;
  try {
    const url = `https://api2-dev.betkarma.com/propsComparison?startDate=${startDate}&endDate=${endDate}&league=${league}`;
    console.log(url);
    const { data } = await axios.get(url);
    //   console.log(JSON.parse(data.games[0].teamNames));
    if (data.error) {
      throw new Error(data.error);
    }
    const props: Prop[] = [];

    data.games.forEach((game: any) => {
      //   const gameDataString = game.label;
      //   const [awayTeam, homeTeam] = gameDataString.split(" @ ");
      //   const gameDate = new Date(game.startDate);
      game.offers.forEach((offer: any) => {
        const player = offer.player;
        const playerMetadataString = offer.team;
        const stat = findStat(offer.label);
        if (!stat) {
          return;
        }
        const playerMetadata = JSON.parse(playerMetadataString);
        if (!playerMetadata) {
          return;
        }
        const team = playerMetadata.image;
        offer.outcomes.forEach((outcome: any) => {
          const book = findBook(outcome.source);
          if (
            !book ||
            [
              PropsPlatform.PRIZEPICKS,
              PropsPlatform.MONKEY_KNIFE_FIGHT,
              PropsPlatform.UNDERDOG,
              // we grab pointsbet from ActionLabs
              Book.POINTSBET
            ].includes(book as PropsPlatform)
          ) {
            return;
          }
          let oddsSource = undefined;
          if (!oddsSource) {
            oddsSource = outcome.lastPregame;
          }
          if (!oddsSource) {
            oddsSource = outcome.last;
          }
          if (!oddsSource || !oddsSource.line) {
            return;
          }
          if ([Book.TWINSPIRES, Book.UNIBET].includes(book as Book)) {
            return;
          }
          const prop: Prop = {
            book,
            player,
            team,
            stat,
            value: oddsSource.line,
            price: oddsSource.americanOdds,
            choice:
              outcome.label === "OVER" ? LineChoice.OVER : LineChoice.UNDER,
          };
          props.push(prop);
        });
      });
    });
    return props;
  } catch (e: any) {
    throw e;
  }
};

// getBetKarmaProps("nfl");
