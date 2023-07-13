import { Book, PropsPlatform } from "../types";

const bookMaps = [
  { names: ["Caesars", "William Hill", "CAESARS"], book: Book.CAESARS },
  {
    names: ["BetRivers", "Sugarhouse", "SUGARHOUSE", "BETRIVERS"],
    book: Book.BETRIVERS
  },
  { names: ["FanDuel", "Fanduel", "FANDUEL"], book: Book.FANDUEL },
  { names: ["Draftkings", "DRAFTKINGS"], book: Book.DRAFTKINGS },
  { names: ["PointsBet", "POINTSBET"], book: Book.POINTSBET },
  { names: ["BetMGM", "betMGM", "BETMGM"], book: Book.BETMGM },
  { names: ["WynnBet", "Wynnbet", "WYNNBET"], book: Book.WYNNBET },
  { names: ["Bet365 NJ"], book: Book.BET365 },
  { names: ["Unibet", "UNIBET"], book: Book.UNIBET },
  { names: ["Pinnacle"], book: Book.PINNACLE },
  { names: ["Borgata"], book: Book.BORGATA },
  { names: ["TWINSPIRES"], book: Book.TWINSPIRES },
  { names: ["PrizePicks"], book: PropsPlatform.PRIZEPICKS },
  { names: ["Underdog"], book: PropsPlatform.UNDERDOG },
  { names: ["MKF"], book: PropsPlatform.MONKEY_KNIFE_FIGHT }
];

export const findBook = (book: string) => {
  for (const bookNames of bookMaps) {
    if (bookNames.names.includes(book)) {
      return bookNames.book;
    }
  }
  console.log(`No known book ${book}`);
};
