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
import {
  americanOddsToDecimal,
  americanToProbability,
  calculateEV,
} from "../utils/calculations";

export const BookPrice = ({
  overPrice,
  underPrice,
  book,
  value,
  overFairLine,
  bankroll,
  kelly
}: {
  overPrice?: number;
  underPrice?: number;
  value?: number;
  book: string;
  overFairLine: number;
  bankroll?: number;
  kelly?: number;
}) => {
  let initialOver: undefined | number = undefined;
  let initialUnder: undefined | number = undefined;
  // if (book === Book.DRAFTKINGS) {
  //   initialOver = decimalToAmerican(1 + 1.5 * (americanOddsToDecimal(overPrice as number) - 1));
  //   initialUnder = decimalToAmerican(1 + 1.5 * (americanOddsToDecimal(underPrice as number) - 1));
  // }
  const [overOverride, setOverOverride] = useState<number | undefined>(initialOver);
  const [underOverride, setUnderOverride] = useState<number | undefined>(initialUnder);

  const overEV = calculateEV((overOverride || overPrice) as number, overFairLine as number);
  const underEV = calculateEV((underOverride || underPrice) as number, -(overFairLine as number));

  const getStatDisplay = (overPrice?: number | string, underPrice?: number | string) => {
    overPrice = overPrice || "-";
    underPrice = underPrice || "-";

    const sideLabel = ["O", "U"];

    return (
      <Box maxW="8rem">
        <Box
          backgroundColor={overEV > 0 ? "lightgreen" : undefined}
          mb="0.5rem"
          mt="0.5rem"
          display={"flex"}
          alignItems={"center"}
        >
          {sideLabel[0]}
          {initialOver ? `(${Math.round(initialOver)})` : ""}:{"  "}
          <Editable defaultValue={overPrice.toString()} onChange={(v) => setOverOverride(+v)}>
            <EditablePreview />
            <EditableInput />
          </Editable>
        </Box>
        <Divider />
        <Box
          backgroundColor={underEV > 0 ? "lightgreen" : undefined}
          mb="0.5rem"
          mt="0.5rem"
          display={"flex"}
          alignItems={"center"}
        >
          {sideLabel[1]}
          {initialUnder ? `(${Math.round(initialUnder)})` : ""}:{"  "}
          <Editable defaultValue={underPrice.toString()} onChange={(v) => setUnderOverride(+v)}>
            <EditablePreview />
            <EditableInput />
          </Editable>
        </Box>
      </Box>
    );
  };

  let fairLine = overFairLine;
  let priceToUseForKelly = (overOverride || overPrice) as number;
  if (underEV > 0) {
    fairLine = -overFairLine;
    priceToUseForKelly = (underOverride || underPrice) as number;
  }

  let b,
    p,
    q,
    wager = 0;
  if (bankroll && kelly && overPrice && underPrice) {
    const fairLikelihood = americanToProbability(fairLine);
    b = americanOddsToDecimal(priceToUseForKelly) - 1;
    p = fairLikelihood;
    q = 1 - p;
    wager = kelly * bankroll * ((b * p - q) / b);
  }

  let label = "-";
  if (overEV > 0) {
    label = `${(overEV * 100).toFixed(1)}% EV ($${wager.toFixed(2)})`;
  }
  if (underEV > 0) {
    label = `${(underEV * 100).toFixed(1)}% EV ($${wager.toFixed(2)})`;
  }

  if (!overPrice && !underPrice) {
    return <></>;
  }
  return (
    <Stat minW="8rem">
      <StatLabel>
        {book} ({value})
      </StatLabel>
      <StatNumber display="flex" flexDir="column">
        {getStatDisplay(overPrice, underPrice)}
        {/* <Box color={isTarget && side === "over" ? "green" : undefined}>{overPrice || "-"}</Box>
        <Divider />
        <Box color={isTarget && side === "under" ? "green" : undefined}>{underPrice || "-"}</Box> */}
      </StatNumber>
      <StatHelpText>{label}</StatHelpText>
    </Stat>
  );
};
