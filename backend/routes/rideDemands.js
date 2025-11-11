// backend/routes/rideDemands.js
import { Router } from "express";
import { supabaseAnon, supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/** helper: read Bearer token -> supabase user */
async function requireUser(req, res) {
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization Bearer token" });
    return null;
  }
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
  return data.user;
}

/** POST /api/demands  (rider creates a demand) */
router.post("/demands", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const {
    origin,
    origin_coords = null,      // (lng, lat) from Supabase "point"
    destination,
    destination_coords = null, // (lng, lat)
    departure_time,            // ISO string
    seats_needed,
    notes = null,
    estimated_cost = null,
  } = req.body || {};

  if (!origin || !destination || !departure_time || !seats_needed) {
    return res.status(400).json({
      error: "origin, destination, departure_time, seats_needed are required",
    });
  }

  const insert = {
    rider_id: user.id,
    origin,
    origin_coords,
    destination,
    destination_coords,
    departure_time,
    seats_needed,
    notes,
    estimated_cost,
    status: "open",
  };

  const { data, error } = await supabaseAdmin
    .from("ride_demands")
    .insert(insert)
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ demand: data });
});

/** GET /api/demands/mine  (rider sees own with driver info if claimed) */
router.get("/demands/mine", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data, error } = await supabaseAdmin
    .from("ride_demands")
    .select(
      `
      *,
      ride_claims(id, status, driver_id)
    `
    )
    .eq("rider_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Fetch driver information for each claim
  const demandsWithDrivers = await Promise.all(
    (data || []).map(async (demand) => {
      if (demand.ride_claims && demand.ride_claims.length > 0) {
        const claim = demand.ride_claims[0];
        const { data: driverData, error: driverError } = await supabaseAdmin
          .from("users")
          .select("id, first_name, last_name, phone")
          .eq("id", claim.driver_id)
          .maybeSingle();
        
        if (driverData) {
          claim.driver_user = driverData;
        }
      }
      return demand;
    })
  );

  return res.json({ demands: demandsWithDrivers });
});

/** GET /api/demands/open  (drivers browse open demands) */
router.get("/demands/open", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("ride_demands")
    .select("*")
    .eq("status", "open")
    .order("departure_time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ demands: data });
});

/** PATCH /api/demands/:id/cancel  (rider cancels; must be >=24h before departure) */
router.patch("/demands/:id/cancel", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.params;

  // load demand
  const { data: dem, error: demErr } = await supabaseAdmin
    .from("ride_demands")
    .select("id, rider_id, status, departure_time")
    .eq("id", id)
    .maybeSingle();

  if (demErr) return res.status(500).json({ error: demErr.message });
  if (!dem) return res.status(404).json({ error: "Demand not found" });
  if (dem.rider_id !== user.id)
    return res.status(403).json({ error: "Forbidden" });
  if (dem.status !== "open")
    return res.status(400).json({ error: "Only open demands can be cancelled" });

  // 24h rule
  const now = new Date();
  const dep = new Date(dem.departure_time);
  const diffHours = (dep - now) / (1000 * 60 * 60);
  if (diffHours < 24) {
    return res
      .status(400)
      .json({ error: "Can only cancel at least 24 hours before departure" });
  }

  const { data, error } = await supabaseAdmin
    .from("ride_demands")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ demand: data });
});

export default router;