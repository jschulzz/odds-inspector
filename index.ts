import { League } from "./types";
import { findPositiveEv } from "./analysis/positive-ev";
import { findArbs } from "./analysis/arbs";
import { findOutliers } from "./analysis/props-outliers";
import { Odds } from "./odds/odds";

findOutliers(League.NFL).then(console.log);
