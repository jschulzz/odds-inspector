import express from "express";

import { router } from "./api";
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use("/api", router);

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Listening on port ${port}`));
