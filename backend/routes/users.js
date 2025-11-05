// backend/routes/users.js
import { Router } from "express";
import { supabaseAnon, supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/* ----------------------------- helpers ----------------------------- */

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

function pick(obj = {}, allowed = []) {
  const out = {};
  for (const k of allowed) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/* -------------------------- self profile (/me) -------------------------- */

// GET /api/users/me
router.get("/me", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const [{ data: profile, error: uErr }, { data: driver, error: dErr }] =
    await Promise.all([
      supabaseAdmin.from("users").select("*").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("driver").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  if (uErr) return res.status(500).json({ error: uErr.message });
  if (!profile) return res.status(404).json({ error: "User profile not found" });

  return res.json({ profile, driver: driver || null });
});

// PATCH /api/users/me
// Body: { first_name?, last_name?, phone? }  (email not editable here)
router.patch("/me", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const updates = pick(req.body, ["first_name", "last_name", "phone"]);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No editable fields provided" });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

/* ----------------------- driver profile (/me/driver) ----------------------- */

// GET /api/users/me/driver
router.get("/me/driver", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data, error } = await supabaseAdmin
    .from("driver")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || null);
});

// PUT /api/users/me/driver  (create or update / upsert)
router.put("/me/driver", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const driverFields = pick(req.body, [
    "plate_number",
    "car_make",
    "license",
    "car_insurance",
    "phone_number",
  ]);

  const insertBody = { user_id: user.id, ...driverFields };

  const { data: upserted, error: upErr } = await supabaseAdmin
    .from("driver")
    .upsert(insertBody, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (upErr) return res.status(400).json({ error: upErr.message });

  const { error: flagErr } = await supabaseAdmin
    .from("users")
    .update({ is_driver: true })
    .eq("id", user.id);

  if (flagErr) {
    return res
      .status(200)
      .json({ driver: upserted, warning: "Saved, but failed to set is_driver=true" });
  }

  return res.status(200).json({ driver: upserted });
});

// PATCH /api/users/me/driver  (partial update)
router.patch("/me/driver", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const updates = pick(req.body, [
    "plate_number",
    "car_make",
    "license",
    "car_insurance",
    "phone_number",
  ]);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No editable driver fields provided" });
  }

  const { data, error } = await supabaseAdmin
    .from("driver")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ driver: data });
});

// DELETE /api/users/me/driver
router.delete("/me/driver", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { error: delErr } = await supabaseAdmin
    .from("driver")
    .delete()
    .eq("user_id", user.id);

  if (delErr) return res.status(400).json({ error: delErr.message });

  await supabaseAdmin.from("users").update({ is_driver: false }).eq("id", user.id);
  return res.status(204).send();
});

/* ------------------------ account deletion (/me/account) ------------------------ */

// DELETE /api/users/me/account
router.delete("/me/account", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  // best-effort clean up
  await supabaseAdmin.from("driver").delete().eq("user_id", user.id);
  await supabaseAdmin.from("users").delete().eq("id", user.id);

  try {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  } catch (e) {
    // return 202 to indicate best-effort if admin deletion fails
    return res.status(202).json({ warning: "Profile deleted; auth removal queued/failed." });
  }

  return res.status(204).send();
});

/* ---------------------- minimal public read (/api/users/:id) ---------------------- */

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name, phone, is_driver, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return res.status(404).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "User not found" });
  return res.json(data);
});

export default router;