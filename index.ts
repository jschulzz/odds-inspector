import { League } from "./types";
import { findPositiveEv } from "./analysis/positive-ev";
import { findOutliers } from "./analysis/props-outliers";

findOutliers(League.MLB).then(console.log);
