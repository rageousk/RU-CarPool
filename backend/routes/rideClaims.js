// backend/routes/rideClaims.js
import { Router } from "express";
import { supabaseAnon, supabaseAdmin } from "../lib/supabase.js";

const router = Router();

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

async function userIsDriver(userId) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_driver")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data?.is_driver;
}

/**
 * POST /api/demands/:id/claims  (driver claims first-come)
 * Behavior:
 *  - demand must be 'open'
 *  - driver != rider
 *  - create claim with status 'accepted'
 *  - mark demand as 'claimed'
 *  - unique (demand_id, driver_id) guarded by index
 */
router.post("/demands/:id/claims", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  // must be a driver
  let isDriver = false;
  try {
    isDriver = await userIsDriver(user.id);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  if (!isDriver) {
    return res.status(403).json({ error: "Driver profile required" });
  }

  const demandId = req.params.id;

  // load demand
  const { data: dem, error: demErr } = await supabaseAdmin
    .from("ride_demands")
    .select("id, rider_id, status")
    .eq("id", demandId)
    .maybeSingle();

  if (demErr) return res.status(500).json({ error: demErr.message });
  if (!dem) return res.status(404).json({ error: "Demand not found" });
  if (dem.rider_id === user.id)
    return res.status(400).json({ error: "Driver cannot claim own demand" });
  if (dem.status !== "open")
    return res.status(409).json({ error: "Demand is not open" });

  // create claim as accepted
  const { data: claim, error: cErr } = await supabaseAdmin
    .from("ride_claims")
    .insert({
      demand_id: demandId,
      driver_id: user.id,
      status: "accepted",
    })
    .select()
    .maybeSingle();

  if (cErr) return res.status(400).json({ error: cErr.message });

  // mark demand as claimed (best-effort)
  await supabaseAdmin
    .from("ride_demands")
    .update({ status: "claimed" })
    .eq("id", demandId)
    .eq("status", "open");

  return res.status(201).json({ claim });
});

/** GET /api/claims/mine  (driver sees their claims, joined with demand) */
router.get("/claims/mine", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data, error } = await supabaseAdmin
    .from("ride_claims")
    .select(
      `
      id, status, created_at,
      demand:ride_demands(id, origin, destination, departure_time, seats_needed, rider_id, status)
    `
    )
    .eq("driver_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ claims: data });
});

/** PATCH /api/claims/:id/withdraw  (driver withdraws if still accepted/pending) */
router.patch("/claims/:id/withdraw", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.params;

  const { data: claim, error: cErr } = await supabaseAdmin
    .from("ride_claims")
    .select("id, driver_id, status, demand_id")
    .eq("id", id)
    .maybeSingle();

  if (cErr) return res.status(500).json({ error: cErr.message });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (claim.driver_id !== user.id) return res.status(403).json({ error: "Forbidden" });
  if (!["pending", "accepted"].includes(claim.status))
    return res.status(400).json({ error: "Only pending/accepted can be withdrawn" });

  const { data, error } = await supabaseAdmin
    .from("ride_claims")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });

  // if demand was 'claimed' and this was the accepted claim, consider re-opening.
  // (safe best-effort; if another logic promotes to 'completed', it won't reopen.)
  await supabaseAdmin
    .from("ride_demands")
    .update({ status: "open" })
    .eq("id", claim.demand_id)
    .eq("status", "claimed");

  return res.json({ claim: data });
});

export default router;