require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRouter = require("./routes/api");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // schedule photos as base64 can exceed the 100kb default

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "schedule-chatbot-backend" });
});

app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

module.exports = app;
