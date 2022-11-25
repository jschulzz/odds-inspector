import NormalDistribution from "normal-distribution";

export interface Input {
  value: number;
  likelihood: number;
}

export const findNormalDistro = (inputs: Input[]) => {
  const lowestValue = Math.min(...inputs.map((x) => x.value));
  const highestValue = Math.max(...inputs.map((x) => x.value));
  const attempts = [];
  for (let mean = lowestValue - 2; mean < highestValue + 2; mean += 0.01) {
    for (let sd = 0.1; sd < 80; sd += 0.01) {
      let totalError = 0;
      let outcomes: any[] = [];
      const nd = new NormalDistribution(mean, sd);
      inputs.forEach((input) => {
        const actualLikelihood = nd.cdf(input.value);
        const error = actualLikelihood - input.likelihood;
        outcomes.push({ value: input.value, error, actualLikelihood });
        totalError += Math.abs(error);
        // console.log({ mean, input, error });
      });
      attempts.push({
        outcomes,
        mean,
        sd,
        error: totalError,
      });
    }
  }
  console.log(
    attempts.sort((a, b) => (a.error > b.error ? 1 : -1))[0]
  );
};
