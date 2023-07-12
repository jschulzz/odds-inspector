import { table, TableUserConfig } from "table";
import path from "path";
import colors from "colors";
import { Stats } from "fast-stats";
import { Book, League, Prop, PropsPlatform, PropsStat } from "../types";
import { Odds } from "../odds/odds";
import { getPinnacleProps } from "../import/pinnacle";
import { getUnderdogLines } from "../import/underdog";
import { LineChoice } from "../types/lines";
import { getPrizePicksLines } from "../import/prizepicks";
import { getNoHouse } from "../import/no-house";
import { Group, Price } from "./group";
import { getActionNetworkProps } from "../import/actionNetwork";
import { PlayerManager } from "../database/mongo.player";

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
      samplePlay.player === prop.player &&
      samplePlay.stat === prop.stat &&
      //   samplePlay.team === prop.team &&
      (wantSameValue ? samplePlay.value === prop.value : true)
  );

export const findOutliers = async (league: League) => {
  const playerManager = new PlayerManager();

  const pinnacleProps = await getPinnacleProps(league, playerManager);
  const actionNetworkProps = await getActionNetworkProps(league, playerManager);
  const underdogProps = await getUnderdogLines(league, playerManager);
  const prizepicksProps = await getPrizePicksLines(league, playerManager);
  const noHouseProps = await getNoHouse(league, playerManager);
  const allProps = [
    ...actionNetworkProps,
    ...pinnacleProps,
    ...underdogProps,
    ...prizepicksProps,
    ...noHouseProps,
  ];
  let remainingProps = [...allProps];
  const propGroups: Group[] = [];
  while (remainingProps.length) {
    const prop = remainingProps[0];
    const equalProps = findEquivalentPlays(prop, remainingProps, {
      wantSameValue: true,
      wantSameChoice: true,
    });
    const plays = [prop, ...equalProps];

    // @ts-ignore
    let prices: Price[] = plays
      .map((play) => {
        const otherPlay = allProps.find(
          (otherPlay) =>
            play.book === otherPlay.book &&
            play.stat === otherPlay.stat &&
            play.choice !== otherPlay.choice &&
            otherPlay.player === play.player
        );
        if (!otherPlay || play.price === 0) {
          return undefined;
          return {
            book: play.book,
            price: play.price,
            likelihood: Odds.fromFairLine(play.price).toProbability(),
          };
        }
        const likelihood = Odds.fromVigAmerican(
          play.price,
          otherPlay.price
        ).toProbability();

        return {
          book: play.book,
          price: play.price,
          likelihood,
        };
      })
      .filter(Boolean);
    const group = new Group({
      player: prop.player,
      stat: prop.stat,
      side: prop.choice,
      prices,
      value: prop.value,
      league,
    });

    remainingProps = remainingProps.filter((p) => !plays.includes(p));
    // if (
    //   group.stat === PropsStat.HOME_RUNS &&
    //   group.player.name.includes("Straw")
    // ) {
    //   console.log(group);
    // }
    propGroups.push(group);
  }

  propGroups.forEach((group) => {
    group.findRelatedGroups(propGroups);
    group.findOppositeGroup(propGroups);
  });

  // @ts-ignore
  const groups = propGroups.filter((group) => {
    return (
      group.getLikelihood() > 0.35 &&
      (group.getFullSize() >= 4 ||
        group.prices.some((price) =>
          [
            PropsPlatform.PRIZEPICKS,
            PropsPlatform.UNDERDOG,
            PropsPlatform.NO_HOUSE,
          ].includes(price.book as PropsPlatform)
        ))
    );
  });
  return formatOutliers(groups);
};

export const formatOutliers = (groups: Group[]) => {
  const DFSPlatforms: (Book | PropsPlatform)[] = [
    PropsPlatform.PRIZEPICKS,
    PropsPlatform.UNDERDOG,
    PropsPlatform.THRIVE,
    PropsPlatform.NO_HOUSE,
  ];
  const orderedBooks: (Book | PropsPlatform)[] = [
    Book.PINNACLE,
    Book.FANDUEL,
    Book.DRAFTKINGS,
    Book.CAESARS,
    Book.BETMGM,
    Book.POINTSBET,
    Book.BETRIVERS,
    Book.WYNNBET,
    PropsPlatform.UNDERDOG,
    PropsPlatform.PRIZEPICKS,
    PropsPlatform.NO_HOUSE,
  ];
  const allBooks = new Set(groups.flatMap((g) => g.prices.map((p) => p.book)));
  allBooks.delete(Book.UNIBET);
  allBooks.delete(Book.TWINSPIRES);
  const sortedBooks = [...allBooks];
  sortedBooks.sort((a, b) => {
    if (orderedBooks.indexOf(a) === -1) {
      return 1;
    }
    if (orderedBooks.indexOf(b) === -1) {
      return -1;
    }
    if (orderedBooks.indexOf(a) > orderedBooks.indexOf(b)) {
      return 1;
    }
    return -1;
  });

  const sortedGroups = groups.sort((a, b) => {
    if (a.maxEV() > 0 || b.maxEV() > 0) {
      return a.maxEV() < b.maxEV() ? 1 : -1;
    }
    if (a.relatedGroups.flatMap((x) => x.prices).length >= 4) return 1;
    if (b.relatedGroups.flatMap((x) => x.prices).length >= 4) return -1;
    return -1;
  });

  sortedGroups.forEach((group) => {
    const arbs = group.hasArbs(sortedGroups);
    const totalStake = 100;
    if (arbs.length) {
      let text = `${group.player.name} on ${group.value} ${group.stat}\n`;
      const stakes = arbs.map((arb) => {
        const stake1 =
          totalStake /
          (Odds.fromFairLine(arb[0].price).toDecimal() /
            Odds.fromFairLine(arb[1].price).toDecimal() +
            1);
        const stake2 =
          totalStake /
          (Odds.fromFairLine(arb[1].price).toDecimal() /
            Odds.fromFairLine(arb[0].price).toDecimal() +
            1);
        const profit = `Profit: $${(
          Odds.fromFairLine(arb[0].price).toPayoutMultiplier() * stake1 -
          stake2
        ).toFixed(2)}`;
        return `\t${arb[0].price} @ ${arb[0].book}: ${stake1.toFixed(2)}\n\t${
          arb[1].price
        } @ ${arb[1].book}: ${stake2.toFixed(2)}\n\t${profit}\n`;
      });
      console.log(text + stakes.join("\n"));
    }
  });

  // const sortedGroups = groups.sort((a, b) => {
  //   if (a[0].team === b[0].team) {
  //     return a[0].stat > b[0].stat ? 1 : -1;
  //   }
  //   return a[0].team > b[0].team ? 1 : -1;
  // });

  const tableData = sortedGroups
    .map((group) => {
      let isInteresting = false;
      const buildRateString = (g: Group) =>
        `${g.value} @ ${(g.getLikelihood() * 100).toFixed(2)}%`;

      const ratesOfEachPrice = [group, ...group.relatedGroups].map(
        buildRateString
      );

      const eventString = `${group.player.name} (${group.player.team}): ${group.side} ${group.stat}`;

      const impliedProbability = group.getLikelihood();
      const isHighLikelihood = impliedProbability > 0.56;
      const isPositiveEV = group.maxEV() > 0;
      const allValues = new Stats().push([
        ...Array(group.prices.length).fill(group.value),
        ...group.relatedGroups.flatMap((g) =>
          Array(g.prices.length).fill(g.value)
        ),
      ]);
      const iqr = allValues.percentile(75) - allValues.percentile(25);
      const iqr_scale = 1.5;
      const upperbound = allValues.percentile(75) + iqr * iqr_scale;
      const lowerbound = allValues.percentile(25) - iqr * iqr_scale;

      const isMisvaluedDFS = group.prices.some(
        (x) =>
          DFSPlatforms.includes(x.book) &&
          group.relatedGroups.flatMap((g) => g.prices).length >= 4 &&
          (group.value > upperbound || group.value < lowerbound)
      );

      const coloredLikelihood = ratesOfEachPrice
        .map((rate, idx) => {
          if (idx === 0 && isHighLikelihood) {
            return colors.bgYellow(rate);
          }
          return rate;
        })
        .join("\n");
      const label = `${eventString}\n${coloredLikelihood}`;
      const allProps = [
        group.prices,
        ...group.relatedGroups.flatMap((g) => g.prices),
      ].flat();
      let EVs = group.findEV();
      const decorateProp = (prop: Price, value?: number) => {
        let text = `@${value}\n${prop.price}`;

        if (EVs.map((ev) => ev.book).includes(prop.book)) {
          if (isMisvaluedDFS) {
            const isValueWayOff =
              Math.min(allValues.median(), group.value) /
                Math.max(allValues.median(), group.value) <
                0.9 && Math.abs(allValues.median() - group.value) > 0.5;

            const marketFavorsDiffLine =
              (group.side === LineChoice.OVER &&
                group.value < allValues.median() &&
                group.relatedGroups[0].getLikelihood() > 0.49) ||
              (group.side === LineChoice.UNDER &&
                group.value > allValues.median() &&
                group.relatedGroups[0].getLikelihood() > 0.49);

            if (marketFavorsDiffLine || isValueWayOff) {
              isInteresting = true;
              return colors.green(text);
            }
          }
          // within this group
          return text;
        } else {
          return colors.gray(text);
        }
      };
      const statsPerBook: string[] = sortedBooks.map((book) => {
        let propByBook = allProps.find((g) => g.book === book);
        if (!propByBook) {
          return "";
        }
        let propValue =
          group.relatedGroups.find((g) => g.prices.some((x) => x.book === book))
            ?.value || group.value;
        const EV = EVs.find((ev) => ev.book === book);

        let EVLabel = "";
        if (EV && EV.EV > 0) {
          EVLabel = `${(EV.EV * 100).toFixed(1).toString()}%`;
          if (EV.EV > 0.05) {
            EVLabel = colors.bgGreen(EVLabel);
          } else {
            EVLabel = colors.bgYellow(EVLabel);
          }
        }
        let priceLabel = `${decorateProp(propByBook, propValue)}\n${EVLabel}`;
        return priceLabel;
      });

      if (isPositiveEV || isInteresting) {
        return [label, ...statsPerBook];
      }
      return [];
    })
    .filter((x) => x.length);
  const headers = ["Label", ...sortedBooks];
  const HEADER_GAP = 15;
  for (let i = 0; i + i / HEADER_GAP < tableData.length; i += HEADER_GAP) {
    tableData.splice(i + i / HEADER_GAP, 0, headers);
  }

  const config: TableUserConfig = {
    columns: [{ width: 40, wrapWord: true }],
    columnDefault: { width: 10, wrapWord: true },
  };

  return table(tableData, config);
};
