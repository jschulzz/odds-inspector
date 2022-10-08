import { Odds } from "./odds/odds";
import { getOddspedia } from "./import/oddspedia";
import { League } from "./types";
import { getPinnacle } from "./import/pinnacle";
import { findPositiveEv, formatResults } from "./analysis/positive-ev";
import { getCircaLines } from "./import/circa";

formatResults(League.NFL).then(console.log);
