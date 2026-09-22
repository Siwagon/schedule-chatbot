const app = require("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Schedule chatbot backend listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set — /api/chat will fail until you set it in backend/.env");
  }
});
