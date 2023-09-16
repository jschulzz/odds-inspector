import {
  Divider,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Box,
  Editable,
  EditablePreview,
  EditableInput
} from "@chakra-ui/react";
import { useState } from "react";

const americanToProbability = (odds: number) => {
  if (odds > 0) {
    return 100 / (odds + 100);
  }
  return -odds / (-odds + 100);
};

function americanOddsToDecimal(americanOdds: number) {
  if (americanOdds < 0) {
    return 1 - 100 / americanOdds;
  }
  return americanOdds / 100 + 1;
}

const toLikelihood = (over?: number, under?: number) => {
  if (!under) {
    return americanToProbability(over as number);
  }
  if (!over) {
    return americanToProbability(under as number);
  }
  return americanToProbability(over) / (americanToProbability(over) + americanToProbability(under));
};

export const BookPrice = ({
  overPrice,
  underPrice,
  EV,
  value,
  isTarget,
  type,
  book,
  side,
  fairLine,
  bankroll,
  kelly
}: {
  overPrice?: number;
  underPrice?: number;
  EV?: number;
  value?: number;
  isTarget: boolean;
  type: string;
  book: string;
  side: string;
  fairLine?: number;
  bankroll?: number;
  kelly?: number;
}) => {
  const [overOverride, setOverOverride] = useState<number>();
  const [underOverride, setUnderOverride] = useState<number>();

  const getStatDisplay = (
    type: string,
    isTarget: boolean,
    side: string,
    overPrice?: number | string,
    underPrice?: number | string
  ) => {
    overPrice = overPrice || "-";
    underPrice = underPrice || "-";

    const sideLabels = new Map([
      ["playerprop-edge", ["O", "U"]],
      ["playerprop-misvalue", ["O", "U"]],
      ["game-moneyline", ["H", "A"]],
      ["game-spread", ["H", "A"]],
      ["game-gameTotal", ["O", "U"]],
      ["game-teamTotal", ["O", "U"]]
    ]);

    const sideLabel = sideLabels.get(type);
    if (!sideLabel) {
      console.log(type);
      return;
    }

    return (
      <>
        <Box
          color={isTarget && ["over", "Home", "Over", "home"].includes(side) ? "green" : undefined}
          mb="0.5rem"
          mt="0.5rem"
        >
          {sideLabel[0]}: {overPrice}
        </Box>
        <Divider />
        <Box
          color={
            isTarget && ["under", "Away", "Under", "away"].includes(side) ? "green" : undefined
          }
          mb="0.5rem"
          mt="0.5rem"
          display={"flex"}
          alignItems={"center"}
        >
          {sideLabel[1]}:{" "}
          <Editable defaultValue={underPrice.toString()} onChange={(v) => setUnderOverride(+v)}>
            <EditablePreview />
            <EditableInput />
          </Editable>
        </Box>
      </>
    );
  };

  let b,
    p,
    q,
    wager = 0;
  const likelihoodOfOver = toLikelihood(overPrice, underPrice);
  if (fairLine && bankroll && kelly && overPrice && underPrice) {
    const over = overOverride || overPrice;
    const under = underOverride || underPrice;
    const fairLikelihood = americanToProbability(fairLine);
    let priceToUseForKelly = over;
    if (type === "game-moneyline") {
      priceToUseForKelly = ["Home", "home"].includes(side) ? over : under;
    } else if (type === "game-spread") {
      priceToUseForKelly = over;
    } else if (type === "game-gameTotal") {
      priceToUseForKelly = ["over", "Over"].includes(side) ? over : under;
    } else if (type === "game-teamTotal") {
      priceToUseForKelly = ["over", "Home", "Over", "home"].includes(side) ? over : under;
    } else if (type === "playerprop-edge") {
      priceToUseForKelly = ["over", "Home", "Over", "home"].includes(side) ? over : under;
    } else if (type === "playerprop-misvalue") {
      priceToUseForKelly = 0;
    }
    b = americanOddsToDecimal(priceToUseForKelly) - 1;
    p = fairLikelihood;
    q = 1 - p;
    wager = kelly * bankroll * ((b * p - q) / b);
    if (Math.abs(wager - -119.62) < 0.1)
      console.log({
        b,
        p,
        q,
        wager,
        decimal: americanOddsToDecimal(fairLine),
        overPrice,
        underPrice,
        side,
        fairLine,
        fairLikelihood,
        type
      });
  }

  let label = isTarget
    ? `${((EV as number) * 100).toFixed(1)}% EV ($${wager.toFixed(2)})`
    : `${(likelihoodOfOver * 100).toFixed(1)}%`;
  if (type === "playerprop-misvalue") {
    label = (value as number).toString();
  }
  if (!overPrice && !underPrice) {
    return <></>;
  }
  return (
    <Stat minW="8rem">
      <StatLabel>{book}</StatLabel>
      <StatNumber display="flex" flexDir="column">
        {getStatDisplay(type, isTarget, side, overPrice, underPrice)}
        {/* <Box color={isTarget && side === "over" ? "green" : undefined}>{overPrice || "-"}</Box>
        <Divider />
        <Box color={isTarget && side === "under" ? "green" : undefined}>{underPrice || "-"}</Box> */}
      </StatNumber>
      <StatHelpText color={isTarget ? "green" : undefined}>{label}</StatHelpText>
    </Stat>
  );
};
