// backend/routes/health.js
import { Router } from "express";
import { supabaseAdmin as supabase } from "../lib/supabase.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "ru-carpool-backend",
    time: new Date().toISOString(),
  });
});

export default router;