import fs from "fs";
import path from "path";

export const evaluatePrizePicks = () => {
  const datafile = path.join(__dirname, "../backups/results/prizepicks.json");

  const data = JSON.parse(fs.readFileSync(datafile).toString());
  const results: any[] = [];

  const players = new Map();
  const predictions = new Map();
  const projections = new Map();
  const scores = new Map();

  data.included.forEach((entry: any) => {
    if (entry.type === "prediction") {
      predictions.set(entry.id, entry);
    }
    if (entry.type === "score") {
      scores.set(entry.id, entry);
    }
    if (entry.type === "new_player") {
      players.set(entry.id, entry);
    }
    if (entry.type === "projection") {
      projections.set(entry.id, entry);
    }
  });

  const cards: any[] = data.data;
  const firstCard = [cards[2]];

  cards.forEach((entry: any) => {
    const legs = entry.relationships.predictions.data;
    const createdAt = entry.attributes.created_at;
    if (new Date(createdAt) <= new Date("2023-01-20T12:28:07-05:00")) {
      return;
    }
    let correct = 0,
      wrong = 0;
    legs.forEach((leg: any) => {
      const prediction = predictions.get(leg.id);
      const pick = prediction.attributes.wager_type;
      const scoreData = scores.get(prediction.relationships.score.data.id);
      const projectionData = projections.get(
        prediction.relationships.projection.data.id
      );

      const score = scoreData.attributes.score;
      const projection = prediction.attributes.line_score;
      const wasCorrect =
        pick === "under" ? score < projection : score > projection;
      // console.log({score, projection, pick, wasCorrect, prediction})
      if (wasCorrect) {
        correct++;
      } else {
        wrong++;
      }
    });
    // console.log({ correct, wrong })
    results.push({ correct, wrong });
  });
  const fivePicks = results.filter((x) => x.correct + x.wrong === 5);
  // console.log(fivePicks)
  const totalCorrect = results.reduce((prev, curr) => prev + curr.correct, 0);
  const totalWrong = results.reduce((prev, curr) => prev + curr.wrong, 0);
  const successRate = totalCorrect / (totalCorrect + totalWrong);
  console.log(`Success Rate: ${(successRate * 100).toFixed(2)}% over ${totalCorrect + totalWrong} picks`);

  const possibleResults = [
    { correctCount: 0, possibleWays: 1, payout: -5 },
    { correctCount: 1, possibleWays: 5, payout: -5 },
    { correctCount: 2, possibleWays: 10, payout: -5 },
    { correctCount: 3, possibleWays: 10, payout: -3 },
    { correctCount: 4, possibleWays: 5, payout: 5 },
    { correctCount: 5, possibleWays: 1, payout: 45 },
  ];
  const frequency = possibleResults.map(
    ({
      correctCount,
      possibleWays,
      payout,
    }: {
      correctCount: number;
      possibleWays: number;
      payout: number;
    }) => {
      const f =
        successRate ** correctCount *
        possibleWays *
        (1 - successRate) ** (5 - correctCount);
      const actual = fivePicks.filter(
        (pick) => pick.correct === correctCount
      ).length;
      return {
        correctCount,
        expected: (f * 100).toFixed(2) + "%",
        actual: ((actual / fivePicks.length) * 100).toFixed(2) + "%",
        actualPayout: actual * payout,
        expectedPayout: f * fivePicks.length * payout,
      };
    }
  );
  console.log(frequency);
  console.log(frequency.reduce((prev, curr) => prev+ curr.expectedPayout, 0))
  console.log(frequency.reduce((prev, curr) => prev+ curr.actualPayout, 0))
};
