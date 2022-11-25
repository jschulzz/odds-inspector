export const calculateKelly = (
  winProbability: number,
  payoutMultiplier: number,
  bankroll = 100
) => {
  return bankroll * (winProbability - (1 - winProbability) / payoutMultiplier);
};
