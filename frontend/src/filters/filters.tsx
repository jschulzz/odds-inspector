import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Checkbox,
  CheckboxGroup,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { AppliedFilters, DEFAULT_FAIRLINE, FilterOptions } from "../App";
import { debounce, groupBy } from "lodash";

type GroupedSelection = Record<string, Record<string, boolean>>;

interface GameGroup {
  league: string;
  games: {
    id: string;
    display: string;
  }[];
}

export const Filters = ({
  originalOptions,
  onChange
}: {
  originalOptions: FilterOptions;
  onChange: (x: AppliedFilters) => any;
}) => {
  const [filters, setFilters] = useState<AppliedFilters>({
    book: { excluded: [] },
    game: { excluded: [] },
    type: { excluded: [] },
    dates: {},
    fairLine: {}
  });
  const [maxFairLine, setMaxFairLine] = useState<number>(DEFAULT_FAIRLINE);
  const [selectedGames, setSelectedGames] = useState<GroupedSelection>({});
  const [gameGroups, setGameGroups] = useState<GameGroup[]>([]);

  useEffect(() => {
    const gameGroups = Object.entries(groupBy(originalOptions.game, "league")).map(
      ([league, games]: [string, { id: string; display: string }[]]) => {
        return {
          league,
          games
        };
      }
    );

    gameGroups.forEach((group) =>
      group.games.forEach((game) => {
        setSelectedGames((s) => ({
          ...s,
          [group.league]: { ...s[group.league], [game.id]: true }
        }));
      })
    );
    setGameGroups(gameGroups);
  }, [originalOptions]);

  const isIndeterminate = (league: string) => {
    const gamesForLeague = (gameGroups.find((x) => x.league === league) as GameGroup).games;
    if (
      gamesForLeague.some((game) => selectedGames[league]?.[game.id]) &&
      !gamesForLeague.every((game) => selectedGames[league]?.[game.id])
    ) {
      return true;
    }
    return false;
  };

  const isAllChecked = (league: string) => {
    const gamesForLeague = (gameGroups.find((x) => x.league === league) as GameGroup).games;
    if (gamesForLeague.every((game) => selectedGames[league]?.[game.id])) {
      return true;
    }
    return false;
  };

  const handleCheckboxChange = (
    values: (string | number)[],
    filterType: "book" | "game" | "type"
  ) => {
    const newFilters: AppliedFilters = {
      ...filters,
      [filterType]: {
        excluded: originalOptions[filterType]
          .filter((option) => !values.includes(option.id))
          .map((option) => option.id)
      }
    };
    debounce(() => {
      setFilters(newFilters);
      onChange(newFilters);
    }, 500)();
  };

  const handleSliderChange = (
    value: number,
    filterType: "fairLine" | "date",
    type: "min" | "max"
  ) => {
    const newFilters: AppliedFilters = {
      ...filters,
      [filterType]: {
        // @ts-ignore
        ...filters[filterType],
        ...(type === "min" ? { gte: value } : {}),
        ...(type === "max" ? { lte: value } : {})
      }
    };
    setFilters(newFilters);
    onChange(newFilters);
  };

  return (
    <Accordion
      allowMultiple
      defaultIndex={[]}
      zIndex={3}
      backgroundColor={"white"}
      minW="15rem"
      maxH="20rem"
    >
      {originalOptions.book.length ? (
        <AccordionItem backgroundColor="inherit" overflowY="scroll">
          <AccordionButton>Book</AccordionButton>
          <AccordionPanel>
            <CheckboxGroup
              onChange={(value) => handleCheckboxChange(value, "book")}
              defaultValue={originalOptions.book
                .filter((bookOption) => !filters.book.excluded.includes(bookOption.id))
                .map((bookOption) => {
                  console.log("gettingDefault");
                  return bookOption.id;
                })}
            >
              <Stack direction="column" spacing={[1, 5]}>
                {originalOptions.book.map((bookOption) => {
                  return (
                    <Checkbox
                      value={bookOption.id}
                      key={bookOption.id}
                      isChecked={!filters.book.excluded.includes(bookOption.id)}
                    >
                      {bookOption.display}
                    </Checkbox>
                  );
                })}
              </Stack>
            </CheckboxGroup>
          </AccordionPanel>
        </AccordionItem>
      ) : (
        <></>
      )}
      {originalOptions.fairLine.max ? (
        <AccordionItem backgroundColor="inherit" overflowY="scroll">
          <AccordionButton>Fair Line</AccordionButton>
          <AccordionPanel padding="2rem">
            <Slider
              aria-label="slider-ex-6"
              max={originalOptions.fairLine.max}
              min={originalOptions.fairLine.min}
              onChange={setMaxFairLine}
              onChangeEnd={(value) => handleSliderChange(value, "fairLine", "max")}
            >
              <SliderMark
                value={maxFairLine}
                textAlign="center"
                bg="blue.500"
                color="white"
                mt="-10"
                ml="-10"
                w="20"
              >
                Max: {maxFairLine}
              </SliderMark>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb defaultValue={maxFairLine} />
            </Slider>
          </AccordionPanel>
        </AccordionItem>
      ) : (
        <></>
      )}
      {originalOptions.game.length ? (
        <AccordionItem backgroundColor="inherit" overflowY="scroll">
          <AccordionButton>Games</AccordionButton>
          <AccordionPanel padding="2rem" overflowY="scroll" zIndex={4} maxH="20rem">
            {gameGroups.map((group) => (
              <>
                <Checkbox
                  isChecked={isAllChecked(group.league)}
                  isIndeterminate={isIndeterminate(group.league)}
                  onChange={(e) => {
                    const allTrue: Record<string, boolean> = {};
                    (gameGroups.find((x) => x.league === group.league) as GameGroup).games.forEach(
                      (game) => (allTrue[game.id] = e.target.checked)
                    );
                    const s = {
                      ...selectedGames,
                      [group.league]: allTrue
                    };
                    const allUnselectedGames = Object.values(s)
                      .map((x) =>
                        Object.entries(x)
                          .filter(([_key, value]: [string, boolean]) => !value)
                          .map(([key, _value]: [string, boolean]) => key)
                      )
                      .flat();
                    console.log({ allUnselectedGames });
                    setSelectedGames(s);
                    onChange({ ...filters, game: { excluded: allUnselectedGames } });
                    setFilters({ ...filters, game: { excluded: allUnselectedGames } });
                  }}
                >
                  {group.league}
                </Checkbox>
                <Stack pl={6} mt={1} spacing={1}>
                  {group.games.map((game) => (
                    <Checkbox
                      isChecked={selectedGames[group.league]?.[game.id]}
                      onChange={(e) => {
                        const s = {
                          ...selectedGames,
                          [group.league]: {
                            ...selectedGames[group.league],
                            [game.id]: e.target.checked
                          }
                        };
                        const allUnselectedGames = Object.values(s)
                          .map((x) =>
                            Object.entries(x)
                              .filter(([_key, value]: [string, boolean]) => !value)
                              .map(([key, _value]: [string, boolean]) => key)
                          )
                          .flat();
                        setSelectedGames(s);
                        console.log({ allUnselectedGames });

                        onChange({ ...filters, game: { excluded: allUnselectedGames } });
                        setFilters({ ...filters, game: { excluded: allUnselectedGames } });
                      }}
                    >
                      {game.display}
                    </Checkbox>
                  ))}
                </Stack>
              </>
            ))}
          </AccordionPanel>
        </AccordionItem>
      ) : (
        <></>
      )}
      {/* <AccordionItem
        backgroundColor="inherit"
        boxShadow="2px 2px 5px rgba(0,0,0,0.2)"
        overflowY="scroll"
      >
        <AccordionButton>Date</AccordionButton>
        <AccordionPanel pt="2rem">
          <Slider aria-label="slider-ex-6" onChange={(val) => setDateSlider(val)}>
            <SliderMark
              value={dateSlider}
              textAlign="center"
              bg="blue.500"
              color="white"
              mt="-10"
              ml="-5"
              w="12"
            >
              {dateSlider}%
            </SliderMark>
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </AccordionPanel>
      </AccordionItem> */}
    </Accordion>
  );
};
