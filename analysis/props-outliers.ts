import { table, TableUserConfig } from "table";
import { getBetKarma } from "../import/betKarma";
import { compareTwoStrings } from "string-similarity";
import { Book, League, Prop, PropsPlatform } from "../types";
import colors from "colors";
import { Odds } from "../odds/odds";
import { getPinnacleProps } from "../import/pinnacle";
import { getUnderdogLines } from "../import/underdog";
import { LineChoice } from "../types/lines";
import { getPrizePicksLines } from "../import/prizepicks";
import { getThrive } from "../import/thrive";
import { getActionLabsProps } from "../import/action-labs";

const bookWeights = new Map([
  [Book.PINNACLE, 2],
  [Book.DRAFTKINGS, 1.5],
  [Book.FANDUEL, 1.5],
  [Book.TWINSPIRES, 0],
  [Book.BETRIVERS, 0],
]);

const findEquivalentPlays = (
  prop: Prop,
  corpus: Prop[],
  {
    wantSameValue = false,
    wantSameChoice = true,
    wantSameBook = false,
  }: {
    wantSameValue?: boolean;
    wantSameChoice?: boolean;
    wantSameBook?: boolean;
  }
) =>
  corpus.filter(
    (samplePlay) =>
      (wantSameBook
        ? samplePlay.book === prop.book
        : samplePlay.book !== prop.book) &&
      (wantSameChoice
        ? samplePlay.choice === prop.choice
        : samplePlay.choice !== prop.choice) &&
      compareTwoStrings(samplePlay.player, prop.player) > 0.85 &&
      samplePlay.stat === prop.stat &&
      //   samplePlay.team === prop.team &&
      (wantSameValue ? samplePlay.value === prop.value : true)
  );

export const findOutliers = async (league: League) => {
  const betKarmaProps = await getBetKarma(league);
  const actionLabsProps = await getActionLabsProps(league);
  const pinnacleProps = await getPinnacleProps(league);
  const underdogProps = await getUnderdogLines(league);
  const prizepicksProps = await getPrizePicksLines(league);
  const thriveProps = await getThrive(league);
  //   console.log(underdogProps)
  const allProps = [
    ...betKarmaProps,
    ...actionLabsProps,
    ...pinnacleProps,
    ...underdogProps,
    ...prizepicksProps,
    ...thriveProps,
  ];
  let remainingProps = [...allProps];
  const propGroups: Prop[][] = [];
  while (remainingProps.length) {
    const prop = remainingProps[0];
    const equalProps = findEquivalentPlays(prop, remainingProps, {
      wantSameValue: false,
      wantSameChoice: true,
    });
    const group = [prop, ...equalProps];

    remainingProps = remainingProps.filter((p) => !group.includes(p));
    propGroups.push(group);
  }
  const groups = propGroups.filter((g) => g.length >= 3);
  return formatOutliers(groups, allProps);
};

export const formatOutliers = (groups: Prop[][], allProps: Prop[]) => {
  const goodDFSPlays: Prop[] = [];
  const DFSPlatforms = [
    PropsPlatform.PRIZEPICKS,
    PropsPlatform.UNDERDOG,
    PropsPlatform.THRIVE,
  ];
  const allBooks = [...new Set(groups.flatMap((g) => g.map((p) => p.book)))];
  const sortedGroups = groups.sort((a, b) => (a[0].stat > b[0].stat ? 1 : -1));
  const tableData = sortedGroups
    .map((group) => {
      let isInteresting = false;
      const allValues = group.map((p) => p.value);
      const lowestLine = Math.min(...allValues);
      const highestLine = Math.max(...allValues);
      let shouldHighlight = false;
      if (lowestLine / highestLine < 0.8 && highestLine > 4) {
        shouldHighlight = true;
      }

      const linePopularity = new Map(
        allValues.map((x) => [x, allValues.filter((y) => y == x).length])
      );
      const mostPopularLine = [...linePopularity.entries()].sort((a, b) =>
        a[1] > b[1] ? -1 : 1
      )[0][0];

      // console.log(linePopularity, mostPopularLine);

      const matchingProps = group.filter(
        (p) => p.value === Number(mostPopularLine)
      );
      let likelihood = 0;
      let matches = 0;

      matchingProps.forEach((prop) => {
        const [otherOption] = findEquivalentPlays(prop, allProps, {
          wantSameBook: true,
          wantSameChoice: false,
          wantSameValue: true,
        });
        if (!otherOption || DFSPlatforms.includes(prop.book as PropsPlatform)) {
          return;
        }
        // @ts-ignore - weight will be defined
        const weight: number = bookWeights.has(prop.book as Book)
          ? bookWeights.get(prop.book as Book)
          : 1;
        const impliedProbability = Odds.fromVigAmerican(
          prop.price,
          otherOption.price
        ).toProbability();
        likelihood += weight * impliedProbability;
        matches += weight;
      });

      const impliedProbability = likelihood / matches;
      const isHighLikelihood = impliedProbability > 0.56;

      if (isHighLikelihood || shouldHighlight) {
        isInteresting = true;
      }

      const eventString = `${group[0].player} (${group[0].team}): ${group[0].choice} ${group[0].stat}`;
      const coloredEvent = shouldHighlight
        ? colors.bgYellow(eventString)
        : eventString;
      const fairLine = new Odds(impliedProbability).toAmericanOdds();
      const likelihoodString = `${mostPopularLine} @ ${(
        100 * impliedProbability
      ).toFixed(1)}%, ${fairLine.toFixed(0)}`;
      const coloredLikelihood = isHighLikelihood
        ? colors.bgYellow(likelihoodString)
        : likelihoodString;
      const label = `${coloredEvent} | ${coloredLikelihood}`;
      const statsPerBook = allBooks.map((book) => {
        const propByBook = group.find((g) => g.book === book);
        if (!propByBook) {
          return "N/A";
        }
        const isPriceWayOff =
          (propByBook.value > mostPopularLine &&
            propByBook.choice === LineChoice.UNDER &&
            propByBook.price >= -110 &&
            propByBook.price !== 0) ||
          (propByBook.value < mostPopularLine &&
            propByBook.choice === LineChoice.OVER &&
            propByBook.price >= -110 &&
            propByBook.price !== 0);

        const isValueWayOff =
          Math.min(propByBook.value, mostPopularLine) /
            Math.max(propByBook.value, mostPopularLine) <
            0.9 &&
          mostPopularLine > 10 &&
          (propByBook.value > mostPopularLine
            ? propByBook.choice === LineChoice.UNDER
            : propByBook.choice === LineChoice.OVER);

        const isGoodDFSPlay =
          DFSPlatforms.includes(propByBook.book as PropsPlatform) &&
          (isValueWayOff ||
            (propByBook.value === mostPopularLine && isHighLikelihood));

        const beatsAvgValue =
          !DFSPlatforms.includes(propByBook.book as PropsPlatform) &&
          propByBook.value === mostPopularLine &&
          propByBook.price > fairLine;

        const shouldHighlightPrice =
          isPriceWayOff || beatsAvgValue || isValueWayOff;

        if (shouldHighlightPrice || isGoodDFSPlay) {
          isInteresting = true;
        }

        const priceLabel = shouldHighlightPrice
          ? colors.bgYellow(propByBook.price.toString())
          : propByBook.price.toString();

        let valueLabel = propByBook.value.toString();
        if (isGoodDFSPlay) {
          goodDFSPlays.push(propByBook);
          valueLabel = colors.bgCyan(valueLabel);
        }

        if (propByBook.value === highestLine && highestLine !== lowestLine) {
          return `${colors.green(valueLabel)}\n(${priceLabel})`;
        } else if (
          propByBook.value === lowestLine &&
          highestLine !== lowestLine
        ) {
          return `${colors.red(valueLabel)}\n(${priceLabel})`;
        }
        return `${colors.gray(valueLabel)}\n(${priceLabel})`;
      });
      if (isInteresting) {
        return [label, ...statsPerBook];
      }
      return [];
    })
    .filter((x) => x.length);
  const headers = ["Label", ...allBooks];
  const HEADER_GAP = 15;
  for (let i = 0; i + i / HEADER_GAP < tableData.length; i += HEADER_GAP) {
    tableData.splice(i + i / HEADER_GAP, 0, headers);
  }

  const config: TableUserConfig = {
    columns: [{ width: 40, wrapWord: true }],
    columnDefault: { width: 10, wrapWord: true },
  };

  console.log(goodDFSPlays);
  return table(tableData, config);
};
