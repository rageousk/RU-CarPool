import { Router } from "express";
import { supabaseAdmin as supabase } from "../lib/supabase.js";

const router = Router();

/** GET /api/rides?from=&to=&limit= */
router.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  let query = supabase
    .from("rides")
    .select("*")
    .order("departure_time", { ascending: true })
    .limit(limit);

  if (req.query.from) query = query.ilike("origin", `%${req.query.from}%`);
  if (req.query.to) query = query.ilike("destination", `%${req.query.to}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

/** POST /api/rides */
router.post("/", async (req, res) => {
  const {
    driver_id,
    origin,
    origin_coords,
    destination,
    destination_coords,
    departure_time,
    seats_total,
    seats_left,
    notes,
  } = req.body || {};

  if (!driver_id || !origin || !destination || !departure_time || !seats_total) {
    return res
      .status(400)
      .json({ error: "driver_id, origin, destination, departure_time, seats_total are required" });
  }

  const insertBody = {
    driver_id,
    origin,
    origin_coords: origin_coords || null,
    destination,
    destination_coords: destination_coords || null,
    departure_time,
    seats_total,
    seats_left: typeof seats_left === "number" ? seats_left : seats_total,
    notes: notes || null,
  };

  const { data, error } = await supabase
    .from("rides")
    .insert([insertBody])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
});

export default router;