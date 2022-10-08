import { Book } from "../types";

const bookMaps = [
  { names: ["Caesars", "William Hill"], book: Book.CAESARS },
  { names: ["BetRivers", "Sugarhouse"], book: Book.BETRIVERS },
  { names: ["FanDuel", "Fanduel"], book: Book.FANDUEL },
  { names: ["Draftkings"], book: Book.DRAFTKINGS },
  { names: ["PointsBet"], book: Book.POINTSBET },
  { names: ["BetMGM", "betMGM"], book: Book.BETMGM },
  { names: ["WynnBet", 'Wynnbet'], book: Book.WYNNBET },
  { names: ["Bet365 NJ"], book: Book.BET365 },
  { names: ["Unibet"], book: Book.UNIBET },
  { names: ["Pinnacle"], book: Book.PINNACLE },
  { names: ["Borgata"], book: Book.BORGATA },
];

export const findBook = (book: string) => {
  for (const bookNames of bookMaps) {
    if (bookNames.names.includes(book)) {
      return bookNames.book;
    }
  }
  console.log(`No known book ${book}`);
};
