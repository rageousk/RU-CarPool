// backend/server.js
import express from "express";
import cors from "cors";
import "dotenv/config";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import healthRouter from "./routes/health.js";
import adminRouter from "./routes/admin.js";
import rideDemandsRouter from "./routes/rideDemands.js";
import rideClaimsRouter from "./routes/rideClaims.js";

const app = express();

app.use(
  cors({
    origin: [process.env.FRONTEND_ORIGIN || "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  })
);

app.use(express.json());

app.get("/", (_req, res) =>
  res.send("RU-Carpool API running. Try GET /api/health")
);

// core routers
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/admin", adminRouter);

// new flow
app.use("/api", rideDemandsRouter); // /api/demands, /api/demands/mine, /api/demands/open, /api/demands/:id/cancel
app.use("/api", rideClaimsRouter);  // /api/demands/:id/claims, /api/claims/mine, /api/claims/:id/withdraw

// fallbacks
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});