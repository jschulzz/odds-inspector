export class Bankroll {

    public bankroll = 100

    public calculateKelly = (winProbability: number, payoutMultiplier: number, kellyMultiplier = 0.5) => {
        return kellyMultiplier * this.bankroll * (winProbability - (1 - winProbability) / payoutMultiplier);
    }
}
