// @ts-nocheck
import axios from "axios";
import { League, Prop, Book } from "../frontend/src/types";
import { THRIVE_KEY } from "../secrets";
import { findStat } from "../props";
import { LineChoice } from "../frontend/src/types/lines";

const leagueMap = new Map([
  [League.NFL, "NFL"],
  [League.NHL, "HOCKEY"],
  [League.NBA, "NBA"],
  [League.MLB, "MLB"]
]);

export const getThrive = async (league: League): Promise<Prop[]> => {
  const { data } = await axios.post(
    "https://api.thrivefantasy.com/houseProp/upcomingHouseProps",
    {
      Latitude: "40.830998",
      Longitude: "-73.946292",
      currentPage: 1,
      currentSize: 100,
      half: 0
    },
    {
      headers: {
        token: THRIVE_KEY
      }
    }
  );

  const props: Prop[] = [];
  const leagueName = leagueMap.get(league);
  if (!leagueName) {
    throw new Error("Unsupported league");
  }

  const responseProps = data.response.data;

  responseProps.forEach((responseProp: any) => {
    if (responseProp.contestProp.adminEvent.leagueType !== leagueName) {
      return;
    }
    const playerObj = responseProp.contestProp.player1;
    const playerName = playerObj.firstName + " " + playerObj.lastName;
    const team = playerObj.teamAbbr;

    const value = responseProp.contestProp.propValue;

    const stat = findStat(responseProp.contestProp.player1.propParameters.join(", "));
    if (!stat) {
      return;
    }

    const standard = {
      player: playerName,
      team,
      value,
      book: Book.THRIVE,
      stat,
      price: 0
    };

    const overProp: Prop = {
      ...standard,
      choice: LineChoice.OVER
    };
    const underProp: Prop = {
      ...standard,
      choice: LineChoice.UNDER
    };
    props.push(overProp, underProp);
  });

  return props;
};
