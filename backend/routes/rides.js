const express = require("express");
const router = express.Router();

// TEMP in-memory store (we'll swap to Supabase later)
let RIDES = [
  { id: "r1", origin: "Glassboro", destination: "Camden", seats_left: 2 },
];

router.get("/rides", (_req, res) => {
  res.json(RIDES);
});

router.post("/rides", (req, res) => {
  const { origin, destination, seats_left = 1 } = req.body || {};
  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination are required" });
  }
  const ride = { id: `r${Date.now()}`, origin, destination, seats_left };
  RIDES.unshift(ride);
  res.status(201).json(ride);
});

module.exports = router;