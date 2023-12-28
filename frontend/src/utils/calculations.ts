import { Boost } from "../App";
import { Price, PropGroup, GameLineGroup, PricedValue, Market, Period } from "../types";
import { League, Book } from "../types";

type WeightMap = Map<League, Map<Market, Map<Period, Map<Book, number>>>>;

// @ts-ignore
const weightMaps: WeightMap = new Map([
  [
    League.WNBA,
    new Map([
      [
        Market.MONEYLINE,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.SPREAD,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.TEAM_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.GAME_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ]
    ])
  ],
  [
    League.NBA,
    new Map([
      [
        Market.MONEYLINE,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.SPREAD,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.TEAM_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.GAME_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ]
    ])
  ],
  [
    League.NHL,
    new Map([
      [
        Market.MONEYLINE,
        new Map([
          [
            Period.FIRST_PERIOD,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],

          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.SPREAD,
        new Map([
          [
            Period.FIRST_PERIOD,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],

          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.TEAM_TOTAL,
        new Map([
          [
            Period.FIRST_PERIOD,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],

          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ],
      [
        Market.GAME_TOTAL,
        new Map([
          [
            Period.FIRST_PERIOD,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ],

          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ]
    ])
  ],
  [
    League.NCAAF,
    new Map([
      [
        Market.MONEYLINE,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 3],
              [Book.BETRIVERS, 1.5],
              [Book.DRAFTKINGS, 1],
              [Book.FANDUEL, 1],
              [Book.CAESARS, 1],
              [Book.BETMGM, 1]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 4],
              [Book.BETRIVERS, 2],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.BETMGM, 2],
              [Book.CAESARS, 2],
              [Book.POINTSBET, 2],
              [Book.WYNNBET, 1.5]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 6],
              [Book.BETRIVERS, 2],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 2],
              [Book.BETMGM, 1.5],
              [Book.FANDUEL, 1.5],
              [Book.POINTSBET, 1.5],
              [Book.WYNNBET, 1.5]
            ])
          ]
        ])
      ],
      [
        Market.SPREAD,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 3],
              [Book.BETRIVERS, 1],
              [Book.FANDUEL, 1],
              [Book.DRAFTKINGS, 1],
              [Book.BETMGM, 1],
              [Book.CAESARS, 1],
              [Book.POINTSBET, 1],
              [Book.WYNNBET, 0.75]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 5],
              [Book.BETRIVERS, 2],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 1.5],
              [Book.BETMGM, 1.5],
              [Book.POINTSBET, 1.5],
              [Book.FANDUEL, 0.75],
              [Book.WYNNBET, 0.75]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 5],
              [Book.BETRIVERS, 4],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 2],
              [Book.BETMGM, 2],
              [Book.POINTSBET, 2],
              [Book.FANDUEL, 2],
              [Book.WYNNBET, 1.5]
            ])
          ]
        ])
      ],
      [
        Market.TEAM_TOTAL,
        new Map([
          [Period.FIRST_QUARTER, new Map([[Book.PINNACLE, 5]])],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 5],
              [Book.BETRIVERS, 0.5]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 5],
              [Book.POINTSBET, 5],
              [Book.BETRIVERS, 2],
              [Book.DRAFTKINGS, 2]
            ])
          ]
        ])
      ],
      [
        Market.GAME_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 5],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 2],
              [Book.DRAFTKINGS, 2],
              [Book.BETMGM, 2],
              [Book.CAESARS, 2],
              [Book.POINTSBET, 2]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 5],
              [Book.BETRIVERS, 2],
              [Book.DRAFTKINGS, 2],
              [Book.BETMGM, 1],
              [Book.CAESARS, 1],
              [Book.FANDUEL, 1],
              [Book.POINTSBET, 1]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 5],
              [Book.BETRIVERS, 4],
              [Book.DRAFTKINGS, 4],
              [Book.BETMGM, 3],
              [Book.CAESARS, 3],
              [Book.POINTSBET, 3],
              [Book.FANDUEL, 2],
              [Book.WYNNBET, 1.5],
              [Book.TWINSPIRES, 0]
            ])
          ]
        ])
      ]
    ])
  ],
  [
    League.NFL,
    new Map([
      [
        Market.MONEYLINE,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 3],
              [Book.BETMGM, 2],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 2],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 1.5]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 3],
              [Book.BETMGM, 2],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 2],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 2],
              [Book.POINTSBET, 1.5],
              [Book.WYNNBET, 1.0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.BETMGM, 2],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 2],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 2],
              [Book.POINTSBET, 1.5],
              [Book.WYNNBET, 1.0]
            ])
          ]
        ])
      ],
      [
        Market.SPREAD,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 3],
              [Book.BETMGM, 2.5],
              [Book.DRAFTKINGS, 2.5],
              [Book.CAESARS, 2.5],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 2],
              [Book.POINTSBET, 1.5],
              [Book.WYNNBET, 1.0]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 4],
              [Book.BETMGM, 4],
              [Book.DRAFTKINGS, 4],
              [Book.CAESARS, 4],
              [Book.BETRIVERS, 4],
              [Book.FANDUEL, 4],
              [Book.POINTSBET, 2],
              [Book.WYNNBET, 1.0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.BETMGM, 2],
              [Book.DRAFTKINGS, 2],
              [Book.CAESARS, 2],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 2],
              [Book.POINTSBET, 2],
              [Book.WYNNBET, 1.0]
            ])
          ]
        ])
      ],
      [
        Market.TEAM_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.BETMGM, 2],
              [Book.POINTSBET, 1.5]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.BETRIVERS, 2],
              [Book.BETMGM, 2],
              [Book.FANDUEL, 1.5],
              [Book.POINTSBET, 1.0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.CAESARS, 2],
              [Book.BETMGM, 2],
              [Book.DRAFTKINGS, 2],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 2],
              [Book.POINTSBET, 1.5],
              [Book.WYNNBET, 1.0]
            ])
          ]
        ])
      ],
      [
        Market.GAME_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.BETMGM, 2],
              [Book.CAESARS, 2],
              [Book.BETRIVERS, 2],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.POINTSBET, 2]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.BETMGM, 2],
              [Book.CAESARS, 2],
              [Book.BETRIVERS, 2],
              [Book.FANDUEL, 1.5],
              [Book.POINTSBET, 1.0]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 3.5],
              [Book.BETMGM, 3],
              [Book.DRAFTKINGS, 3],
              [Book.CAESARS, 3],
              [Book.BETRIVERS, 2.5],
              [Book.FANDUEL, 2.5],
              [Book.POINTSBET, 2],
              [Book.WYNNBET, 1.0]
            ])
          ]
        ])
      ]
    ])
  ],
  [
    League.MLB,
    new Map([
      [
        Market.MONEYLINE,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ]
        ])
      ],
      [
        Market.SPREAD,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ]
        ])
      ],
      [
        Market.TEAM_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ]
        ])
      ],
      [
        Market.GAME_TOTAL,
        new Map([
          [
            Period.FIRST_QUARTER,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FIRST_HALF,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ],
          [
            Period.FULL_GAME,
            new Map([
              [Book.PINNACLE, 2.5],
              [Book.DRAFTKINGS, 2],
              [Book.FANDUEL, 2],
              [Book.TWINSPIRES, 0],
              [Book.BETRIVERS, 1.5],
              [Book.POINTSBET, 0.2]
            ])
          ]
        ])
      ]
    ])
  ]
]);

const getWeight = (league: League, market: Market, period: Period, book: Book) => {
  return weightMaps.get(league)?.get(market)?.get(period)?.get(book) || 1;
};

export const leaguePlayerPropWeights = new Map<League, Map<Book, number>>([
  [
    League.WNBA,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0.5],
      [Book.UNDERDOG, 0.75],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NBA,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0.1],
      [Book.UNDERDOG, 0.1],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NHL,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 2],
      [Book.TWINSPIRES, 0],
      [Book.PRIZEPICKS, 0.1],
      [Book.UNDERDOG, 0.1],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.MLB,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1.5],
      // [Book.CAESARS, 1],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ],
  [
    League.NFL,
    new Map<Book, number>([
      [Book.PINNACLE, 1.5],
      [Book.DRAFTKINGS, 2],
      [Book.FANDUEL, 1],
      [Book.TWINSPIRES, 0],
      [Book.BETRIVERS, 1],
      [Book.CAESARS, 1],
      [Book.PRIZEPICKS, 0],
      [Book.UNDERDOG, 0],
      [Book.NO_HOUSE, 0]
    ])
  ]
]);

export function getLikelihood(
  priceGroup: Price[],
  group: GameLineGroup | PropGroup,
  overOrUnder: "over" | "under",
  propOrGame: "prop" | "game"
) {
  let sum = 0;
  let total = 0;

  priceGroup.forEach((curr: Price) => {
    const weight =
      propOrGame === "game"
        ? getWeight(
            group.metadata.league,
            (group as GameLineGroup).metadata.type,
            (group as GameLineGroup).metadata.period,
            curr.book
          )
        : leaguePlayerPropWeights.has((group as PropGroup).metadata.league) &&
          // @ts-ignore
          leaguePlayerPropWeights.get((group as PropGroup).metadata.league).has(curr.book)
        ? // @ts-ignore
          (leaguePlayerPropWeights
            .get((group as PropGroup).metadata.league)
            .get(curr.book) as number)
        : 1;
    // of over
    let likelihood = vigAmericanToProbabilityOfOver(curr.overPrice, curr.underPrice);
    if (overOrUnder === "under") {
      likelihood = 1 - likelihood;
    }
    sum += weight;
    total += weight * likelihood;
  });
  if (sum === 0) {
    return 0.5;
  }
  return total / sum;
}

export function boostLine(americanPrice: number, boost: Boost) {
  const decimalOdds = americanOddsToDecimal(americanPrice);
  const boostedDecimalOdds = boost.amount * (decimalOdds - 1) + 1;
  const boostedAmericanOdds = decimalToAmerican(boostedDecimalOdds);
  return boostedAmericanOdds;
}

export function findApplicableBoost(
  group: PropGroup | GameLineGroup,
  price: Price,
  boosts: Boost[]
) {
  if (!price) {
    return;
  }
  return boosts.find(
    (boost) =>
      boost.book === price.book &&
      ((boost.league && boost.league === group.metadata.league) ||
        (boost.teamAbbreviation &&
          [
            ...group.metadata.game.awayTeam.abbreviation,
            ...group.metadata.game.homeTeam.abbreviation
          ].includes(boost.teamAbbreviation)))
  );
}

export function hasEV(
  group: PropGroup | GameLineGroup,
  propOrGame: "prop" | "game",
  booksToCheck: Book[] = [],
  boosts: Boost[] = []
): { hasPositiveEv: boolean; positiveEvBooks: Book[] } {
  let positiveEvBooks: Book[] = [];
  group.values.forEach((pricedValue: PricedValue) => {
    const overLikelihood = getLikelihood(pricedValue.prices, group, "over", propOrGame);
    const overFairLine = probabilityToAmerican(overLikelihood);
    const valueWithDFS = pricedValue.prices.some((b) =>
      [Book.PRIZEPICKS, Book.UNDERDOG].includes(b.book)
    );

    const underFairLine = -overFairLine;
    positiveEvBooks.push(
      ...pricedValue.prices
        .filter((price: Price) => {
          let overPrice = price.overPrice;
          const applicableBoost = findApplicableBoost(group, price, boosts);
          if (applicableBoost) {
            overPrice = boostLine(overPrice, applicableBoost);
          }
          return overPrice > overFairLine && booksToCheck.includes(price.book);
        })
        .map((x) => x.book)
    );
    positiveEvBooks.push(
      ...pricedValue.prices
        .filter((price: Price) => {
          let underPrice = price.underPrice;
          const applicableBoost = findApplicableBoost(group, price, boosts);
          if (applicableBoost) {
            underPrice = boostLine(underPrice, applicableBoost);
          }
          if (underPrice > underFairLine) {
            console.log("THIS", price.book);
          }
          return underPrice > underFairLine && booksToCheck.includes(price.book);
        })
        .map((x) => x.book)
    );
    if (
      propOrGame === "prop" &&
      valueWithDFS &&
      pricedValue.prices.length > 3 &&
      (overFairLine < -119 || underFairLine < -119)
    ) {
      console.log(group, valueWithDFS, { overFairLine, underFairLine }, positiveEvBooks);
    }
  });
  return {
    hasPositiveEv: !!positiveEvBooks.length,
    positiveEvBooks: [...new Set(positiveEvBooks)]
  };
}

export function probabilityToAmerican(probability: number) {
  if (probability < 0.5) {
    return 100 / probability - 100;
  }
  return -((100 * probability) / (1 - probability));
}

export function americanToProbability(american: number) {
  if (american >= 100) {
    return 100 / (american + 100);
  }
  return -american / (-american + 100);
}

export function vigAmericanToProbabilityOfOver(over: number, under: number) {
  const probOfOver = americanToProbability(over);
  const probOfUnder = americanToProbability(under);
  return probOfOver / (probOfOver + probOfUnder);
}

export function americanOddsToDecimal(americanOdds: number) {
  if (americanOdds < 0) {
    return 1 - 100 / americanOdds;
  }
  return americanOdds / 100 + 1;
}

export const priceToLikelihood = (over?: number, under?: number) => {
  const overProb = americanToProbability(over as number);
  const underProb = americanToProbability(under as number);
  if (!under) {
    return overProb;
  }
  if (!over) {
    return underProb;
  }
  return overProb / (overProb + underProb);
};

export function calculateEV(americanPrice: number, americanFairLine: number) {
  let payoutMultiplier = -100 / americanPrice;
  if (americanPrice > 0) {
    payoutMultiplier = americanPrice / 100;
  }
  const likelihood = americanToProbability(americanFairLine);
  const EV = likelihood * payoutMultiplier - (1 - likelihood);
  return EV;
}

export function decimalToAmerican(decimal: number) {
  if (decimal > 2) {
    return (decimal - 1) * 100;
  }
  return -100 / (decimal - 1);
}
