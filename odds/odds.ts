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
  private static americanOddsToDecimal(americanOdds: number) {
    if (americanOdds < 0) {
      return -100 / americanOdds + 1;
    } else {
      return americanOdds / 100 + 1;
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
  static getWidth(americanOdds1: number, americanOdds2: number) {
    if (Math.sign(americanOdds1) === Math.sign(americanOdds2)) {
      return Math.abs(100 + americanOdds1 + (100 + americanOdds2));
    }
    return Math.abs(americanOdds1 + americanOdds2);
  }

  toProbability() {
    return this.probability;
  }
  toAmericanOdds() {
    return Odds.probabilityToAmericanOdds(this.probability);
  }
  toDecimal() {
    if (!this.americanOdds) {
      throw new Error("No true price known");
    }
    return Odds.americanOddsToDecimal(this.americanOdds);
  }
  toPayoutMultiplier() {
    if (this.americanOdds === undefined) {
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
