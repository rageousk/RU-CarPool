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

  // --- Enforce one request per rider per calendar day ---
  // Parse the provided departure_time and compute the UTC day range [start, nextDay)
  const depDate = new Date(departure_time);
  if (isNaN(depDate.getTime())) {
    return res.status(400).json({ error: "Invalid departure_time format" });
  }
  const startOfDay = new Date(Date.UTC(depDate.getUTCFullYear(), depDate.getUTCMonth(), depDate.getUTCDate(), 0, 0, 0)).toISOString();
  const nextDay = new Date(Date.UTC(depDate.getUTCFullYear(), depDate.getUTCMonth(), depDate.getUTCDate() + 1, 0, 0, 0)).toISOString();

  // Fetch all existing demands for this rider and do a UTC-day comparison on the server
  const { data: allDemands, error: allErr } = await supabaseAdmin
    .from("ride_demands")
    .select("id, status, departure_time")
    .eq("rider_id", user.id);

  if (allErr) return res.status(500).json({ error: allErr.message });

  // Compare by UTC calendar day to avoid timezone string comparison issues
  const depY = depDate.getUTCFullYear();
  const depM = depDate.getUTCMonth();
  const depD = depDate.getUTCDate();

  const hasActive = (allDemands || []).some((r) => {
    if (!r.departure_time) return false;
    const existingDep = new Date(r.departure_time);
    if (isNaN(existingDep.getTime())) return false;
    const sameDay = existingDep.getUTCFullYear() === depY && existingDep.getUTCMonth() === depM && existingDep.getUTCDate() === depD;
    return sameDay && r.status !== "cancelled" && r.status !== "completed";
  });
  if (hasActive) {
    return res.status(400).json({ error: "You already have a ride scheduled for that day. Only one active request per day is allowed." });
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

  const { data: demands, error } = await supabaseAdmin
    .from("ride_demands")
    .select("*")
    .eq("rider_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // If no demands, return early
  const demandList = (demands || []);
  if (demandList.length === 0) return res.json({ demands: [] });

  // Fetch any claims that reference these demands (batch to avoid N+1)
  const demandIds = demandList.map((d) => d.id);
  const { data: claimsData, error: claimsErr } = await supabaseAdmin
    .from("ride_claims")
    .select("id, status, driver_id, demand_id")
    .in("demand_id", demandIds);

  if (claimsErr) return res.status(500).json({ error: claimsErr.message });

  const claims = claimsData || [];

  // Gather unique driver_ids and fetch related user + profile rows in bulk
  const driverIds = [...new Set(claims.map((c) => c.driver_id).filter(Boolean))];
  let usersById = {};
  let profilesByUserId = {};
  if (driverIds.length > 0) {
    const [{ data: usersData }, { data: profilesData }] = await Promise.all([
      supabaseAdmin.from("users").select("id, first_name, last_name, phone").in("id", driverIds),
      supabaseAdmin.from("driver").select("id, plate_number, car_make, license, phone_number, car_insurance, user_id").in("user_id", driverIds),
    ]);

    (usersData || []).forEach((u) => (usersById[u.id] = u));
    (profilesData || []).forEach((p) => (profilesByUserId[p.user_id] = p));
  }

  // Attach driver_user and driver_profile to each claim
  claims.forEach((c) => {
    c.driver_user = usersById[c.driver_id] || null;
    c.driver_profile = profilesByUserId[c.driver_id] || null;
  });

  // Group claims by demand_id and attach to demands
  const claimsByDemand = claims.reduce((acc, c) => {
    acc[c.demand_id] = acc[c.demand_id] || [];
    acc[c.demand_id].push(c);
    return acc;
  }, {});

  const demandsWithClaims = demandList.map((d) => ({
    ...d,
    ride_claims: claimsByDemand[d.id] || [],
  }));

  return res.json({ demands: demandsWithClaims });
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