import express from "express";
import cors from "cors";
import cron from "node-cron";

import { router } from "./api";
import { getActionNetworkLines, getActionNetworkProps } from "../import/actionNetwork";
import { getNoHouse } from "../import/no-house";
import { getPinnacle, getPinnacleProps } from "../import/pinnacle";
import { getPrizePicksLines } from "../import/prizepicks";
import { getUnderdogLines } from "../import/underdog";
import { League } from "../frontend/src/types";
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api", router);

// cron.schedule("0 */30 * * * *", async () => {
//   const leagues = [League.MLB];
//   for (const league of leagues) {
//     await getPinnacle(league);
//     await getActionNetworkLines(league);
//     await getPinnacleProps(league);
//     await getUnderdogLines(league);
//     await getPrizePicksLines(league);
//     await getNoHouse(league);
//     await getActionNetworkProps(league);
//   }
//   console.log("Completed import");
// });

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Listening on port ${port}`));
