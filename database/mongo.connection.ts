import { connect } from "mongoose";

let connection: any;

export const getConnection = async () => {
  if (!connection) {
    connection = await connect("mongodb://127.0.0.1:27017/odds-inspector", { maxPoolSize: 300 });
    console.log("Acquired connection");
  }
  return connection;
};
