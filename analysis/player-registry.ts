import fs from "fs";
import { Player } from "./player";

export class PlayerRegistry {
  public players: Player[];
  public exceptions: string[][];
  private filePath: string;

  constructor(filePath: string) {
    this.exceptions = [
      ["Alex Ovechkin + Bo Horvat", "Alex Ovechkin"],
      ["Mikko Rantanen + Matt Boldy", "Mikko Rantanen"],
      ["Alex Ovechkin + Nic Dowd", "Alex Ovechkin"],
      ["Jaylin Williams", "Jalen Williams"],
      ["Auston Matthews + Brady Tkachuk", "Auston Matthews + Matthew Tkachuk"],
      ["Clayton Keller", "Clayton Kershaw"],
      ["Ryan Strome", "Dylan Strome"],
      ["Chandler Stephenson", "Tyler Stephenson"],
      ["Taylor Ward", "Taylor Walls"],
      ["Zach Eflin + Spencer Turnbull", "Spencer Turnbull"]
    ];
    this.filePath = filePath;
    this.players = [];

    JSON.parse(fs.readFileSync(filePath).toString()).forEach((player: any) => {
      this.players.push(new Player(player.name, player.team, player.aliases));
    });
  }

  public add(player: Player) {
    this.players.push(player);
  }

  public find(player: Player) {
    const exactMatch = this.players.find(
      (p) => p.name === player.name || p.aliases.includes(player.name)
    );

    if (exactMatch) {
      return { players: [exactMatch], exact: true };
    }

    const closeMatches = this.players
      .filter((p) => p.compare(player.name, player.team) > 0.7)
      .filter((p) => {
        const exception = this.exceptions.find(
          (exception) => exception.includes(p.name) && exception.includes(player.name)
        );
        exception && console.log(`Found exception for ${p.name}: ${exception}`);

        return !exception;
      });
    return { players: closeMatches, exact: false };
  }

  public saveRegistry() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.players, null, 2));
  }
}
