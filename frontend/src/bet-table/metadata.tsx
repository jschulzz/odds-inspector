import { Box } from "@chakra-ui/react";
import { GameLineGroup, PropGroup } from "../types";

export const Metadata = ({ group }: { group: GameLineGroup | PropGroup }) => {
  let children: JSX.Element[] = [];

  const gameBox = (
    <Box>
      <Box as="span" fontWeight="bold">
        Game:{" "}
      </Box>
      {group.metadata.game.awayTeam.abbreviation[0]} @{" "}
      {group.metadata.game.homeTeam.abbreviation[0]} ({group.metadata.league})
    </Box>
  );
  if ((group as GameLineGroup).metadata.type) {
    // is gameline
    const { metadata } = group as GameLineGroup;
    const teamBox = (
      <Box>
        <Box as="span" fontWeight="bold">
          Team:{" "}
        </Box>
        {metadata.side}
      </Box>
    );
    const marketBox = (
      <Box>
        <Box as="span" fontWeight="bold">
          Market:{" "}
        </Box>
        {metadata.type}
      </Box>
    );
    const peroidBox = (
      <Box>
        <Box as="span" fontWeight="bold">
          Period:{" "}
        </Box>
        {metadata.period}
      </Box>
    );
    let children = [];
    const metadataViews = new Map([
      ["moneyline", [gameBox, marketBox, peroidBox]],
      ["spread", [gameBox, teamBox, marketBox, peroidBox]],
      ["gameTotal", [gameBox, marketBox, peroidBox]],
      ["teamTotal", [gameBox, marketBox, teamBox, peroidBox]]
    ]);
    children = metadataViews.get(metadata.type) || [];
    return <Box onClick={() => console.log(group)}>{children}</Box>;
    // return metadataViews.get(metadata.type) || <></>;
  } else if ((group as PropGroup).metadata.player) {
    const { metadata } = group as PropGroup;
    return (
      <Box onClick={() => console.log(group)}>
        {gameBox}
        <Box>
          <Box as="span" fontWeight="bold">
            {" "}
            Player:{" "}
          </Box>
          {metadata.player.name} ({metadata.player.team.abbreviation[0]})
        </Box>
        <Box>
          <Box as="span" fontWeight="bold">
            Prop:
          </Box>{" "}
          {metadata.propStat}
        </Box>
      </Box>
    );
  }
  return <></>;
};
