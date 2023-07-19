import { Divider, Stat, StatHelpText, StatLabel, StatNumber, Box } from "@chakra-ui/react";

const americanToProbability = (odds: number) => {
  if (odds > 0) {
    return 100 / (odds + 100);
  }
  return -odds / (-odds + 100);
};

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
  side
}: {
  overPrice?: number;
  underPrice?: number;
  EV?: number;
  value?: number;
  isTarget: boolean;
  type: string;
  book: string;
  side: string;
}) => {
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
        <Box color={isTarget && ["over", "Home"].includes(side) ? "green" : undefined} mb="0.5rem" mt="0.5rem">
          {sideLabel[0]}: {overPrice}
        </Box>
        <Divider />
        <Box color={isTarget && ["under", "Away"].includes(side) ? "green" : undefined} mb="0.5rem" mt="0.5rem">
          {sideLabel[1]}: {underPrice}
        </Box>
      </>
    );
  };

  let label = isTarget
    ? `${((EV as number) * 100).toFixed(1)}% EV`
    : `${(toLikelihood(overPrice, underPrice) * 100).toFixed(1)}%`;
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
