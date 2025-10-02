const express = require("express");
const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ru-carpool-backend", time: new Date().toISOString() });
});

module.exports = router;