import fs from "fs";
import path from "path";
import { Period } from "../frontend/src/types";
import { LineChoice } from "../frontend/src/types/lines";

const findLines = () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../backups/oddspedia/nfl.json")).toString()
  );
  console.log(new Set(data.teamTotals.map((x: any) => x.awayTeam)));
  console.log(
    data.teamTotals.filter((line: any) => {
      return (
        line.awayTeam.includes("Bronco") &&
        line.period === Period.FULL_GAME &&
        line.choice === LineChoice.UNDER
        // line.type === Market.TEAM_TOTAL
        // line.side === "home"
      );
      // line.period === Period.FULL_GAME &&
      // line.choice === LineChoice.AWAY
    }).length
  );
};

findLines();
