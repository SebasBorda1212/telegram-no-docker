import express from "express";
import { bot } from "./bot.js";

const app = express();

app.get("/", (req, res) => res.send("Bot funcionando sin Docker"));

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
  bot.launch();
});
