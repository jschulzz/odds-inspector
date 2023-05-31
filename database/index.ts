import Datastore from "nedb";

export const games = new Datastore({ filename: "./games", autoload: true });
