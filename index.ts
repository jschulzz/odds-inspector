import { League } from "./types";
import { findPositiveEv } from "./analysis/positive-ev";
import { findOutliers } from "./analysis/props-outliers";

findOutliers(League.NBA).then(console.log);
