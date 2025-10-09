// backend/server.js
import express from "express";
import cors from "cors";
import "dotenv/config";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import ridesRouter from "./routes/rides.js";
import healthRouter from "./routes/health.js";

const app = express();

// ✅ Allow your frontend (Vite) and cookies if you ever use them
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Root message
app.get("/", (_req, res) =>
  res.send("RU-Carpool API is running. Try GET /api/health or /api/users")
);

// Routers
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/rides", ridesRouter);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));