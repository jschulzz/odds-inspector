export const calculateKelly = (
  winProbability: number,
  payoutMultiplier: number,
  bankroll = 200
) => {
  return bankroll * (winProbability - (1 - winProbability) / payoutMultiplier);
};
