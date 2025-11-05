// backend/routes/rideRequests.js
import { Router } from "express";
import { supabaseAnon, supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/** Auth helper: read Bearer token and return supabase user */
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
  return data.user; // { id, email, ... }
}

/** GET /api/ride-requests/mine  (rider) */
router.get("/ride-requests/mine", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data, error } = await supabaseAdmin
    .from("ride_requests")
    .select(
      `
      id, status, created_at,
      ride:rides(id, origin, destination, departure_time, seats_left),
      driver:rides!inner(driver_id)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ requests: data });
});

/** GET /api/rides/:rideId/requests  (driver only) */
router.get("/rides/:rideId/requests", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const rideId = req.params.rideId;

  // check driver owns this ride
  const { data: ride, error: rideErr } = await supabaseAdmin
    .from("rides")
    .select("id, driver_id")
    .eq("id", rideId)
    .maybeSingle();

  if (rideErr) return res.status(500).json({ error: rideErr.message });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.driver_id !== user.id) return res.status(403).json({ error: "Not your ride" });

  const { data, error } = await supabaseAdmin
    .from("ride_requests")
    .select(
      `
      id, user_id, status, created_at,
      rider:users(id, first_name, last_name, email)
    `
    )
    .eq("ride_id", rideId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ requests: data });
});

/** POST /api/rides/:rideId/requests  (rider creates 'pending') */
router.post("/rides/:rideId/requests", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const rideId = req.params.rideId;

  // Cannot request your own ride
  const { data: ride, error: rideErr } = await supabaseAdmin
    .from("rides")
    .select("id, driver_id, seats_left")
    .eq("id", rideId)
    .maybeSingle();

  if (rideErr) return res.status(500).json({ error: rideErr.message });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.driver_id === user.id) return res.status(400).json({ error: "Cannot request your own ride" });

  // Unique (ride_id, user_id)
  const { data: existing, error: existErr } = await supabaseAdmin
    .from("ride_requests")
    .select("id, status")
    .eq("ride_id", rideId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existErr) return res.status(500).json({ error: existErr.message });
  if (existing) return res.status(409).json({ error: `Request already exists (status=${existing.status})` });

  const { data: ins, error: insErr } = await supabaseAdmin
    .from("ride_requests")
    .insert({ ride_id: rideId, user_id: user.id, status: "pending" })
    .select()
    .maybeSingle();

  if (insErr) return res.status(400).json({ error: insErr.message });
  return res.status(201).json({ request: ins });
});

/**
 * PATCH /api/ride-requests/:id
 * body: { action: 'accept' | 'reject' | 'cancel' }
 * - driver can 'accept'/'reject' (for their rides)
 * - rider can 'cancel' (only their own; from pending)
 */
router.patch("/ride-requests/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.params;
  const { action } = req.body || {};

  const { data: rr, error: getErr } = await supabaseAdmin
    .from("ride_requests")
    .select("id, ride_id, user_id, status, rides!inner(driver_id)")
    .eq("id", id)
    .maybeSingle();

  if (getErr) return res.status(500).json({ error: getErr.message });
  if (!rr) return res.status(404).json({ error: "Request not found" });

  // Driver actions
  if (action === "accept" || action === "reject") {
    if (rr.rides.driver_id !== user.id) {
      return res.status(403).json({ error: "Only the driver can accept/reject" });
    }
    const next = action === "accept" ? "accepted" : "rejected";
    const { data, error } = await supabaseAdmin
      .from("ride_requests")
      .update({ status: next })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ request: data });
  }

  // Rider action: cancel (only own request, from pending)
  if (action === "cancel") {
    if (rr.user_id !== user.id) return res.status(403).json({ error: "Only the rider can cancel" });
    if (rr.status !== "pending") {
      return res.status(400).json({ error: "Only pending requests can be cancelled by rider" });
    }
    const { data, error } = await supabaseAdmin
      .from("ride_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ request: data });
  }

  return res.status(400).json({ error: "Invalid action" });
});

export default router;