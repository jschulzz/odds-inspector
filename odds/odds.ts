export class Odds {
  constructor(probability: number, americanOdds?: number) {
    this.probability = probability;
    this.americanOdds = americanOdds;
  }

  static fractionalToProbability(fractionalOdds: number) {
    return 1 / (fractionalOdds + 1);
  }
  static decimalToProbability(decimalOdds: number) {
    return 1 / decimalOdds;
  }
  private static americanOddsToProbability(americanOdds: number) {
    if (americanOdds < 0) {
      return -americanOdds / (-1 * americanOdds + 100);
    } else {
      return 100 / (americanOdds + 100);
    }
  }
  static probabilityToAmericanOdds(probability: number) {
    if (probability < 0.5) {
      return Math.round((100 * (1 - probability)) / probability);
    } else {
      return Math.round(-100 * (probability / (1 - probability)));
    }
  }

  static fromVigAmerican(desiredOption: number, undesiredOption: number) {
    return new Odds(
      Odds.americanOddsToProbability(desiredOption) /
        (Odds.americanOddsToProbability(desiredOption) +
          Odds.americanOddsToProbability(undesiredOption))
    );
  }

  static fromVigDecimal(desiredOption: number, undesiredOption: number) {
    return new Odds(
      Odds.decimalToProbability(desiredOption) /
        (Odds.decimalToProbability(desiredOption) +
          Odds.decimalToProbability(undesiredOption))
    );
  }
  static fromVigFractional(desiredOption: number, undesiredOption: number) {
    return new Odds(
      Odds.fractionalToProbability(desiredOption) /
        (Odds.fractionalToProbability(desiredOption) +
          Odds.fractionalToProbability(undesiredOption))
    );
  }
  static fromFairLine(desiredOption: number) {
    return new Odds(
      Odds.americanOddsToProbability(desiredOption),
      desiredOption
    );
  }
  static fromDecimal(decimalOdds: number) {
    return new Odds(Odds.decimalToProbability(decimalOdds));
  }

  toProbability() {
    return this.probability;
  }
  toAmericanOdds() {
    return Odds.probabilityToAmericanOdds(this.probability);
  }
  toPayoutMultiplier() {
    if (!this.americanOdds) {
      throw new Error("No true price known");
    }
    if (this.americanOdds < 0) {
      return -100 / this.americanOdds;
    } else {
      return this.americanOdds / 100;
    }
  }

  private probability!: number;
  private americanOdds?: number;
}
