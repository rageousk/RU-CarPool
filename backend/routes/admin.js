// backend/routes/admin.js
import { Router } from "express";
import { supabaseAnon, supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/** Extract and validate Supabase session from Authorization header */
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please sign in first." });

  // Validate token; using admin client is fine here too
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
  req.user = data.user;
  next();
}

/** Only allow admins (users.is_admin = true) */
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user.id;

    // IMPORTANT: use service-role client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle?.();   // use maybeSingle if available…
                          // …otherwise fall back to single with a guard:
                          // .single();

    if (error) return res.status(500).json({ error: error.message });
    // If your SDK doesn't have maybeSingle, handle "no row" case:
    if (!data) return res.status(403).json({ error: "Forbidden (admin only)." });
    if (!data.is_admin) return res.status(403).json({ error: "Forbidden (admin only)." });

    next();
  } catch (e) {
    return res.status(500).json({ error: e.message || "Admin check failed" });
  }
}

/** POST /api/admin/cleanup */
router.post("/cleanup", requireAuth, requireAdmin, async (_req, res) => {
  try {
    // 1) list all users (you can paginate later if needed)
    const { data: authUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) return res.status(500).json({ error: listErr.message });

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const targets = (authUsers?.users || []).filter(
      (u) => !u.email_confirmed_at && new Date(u.created_at).getTime() < cutoff
    );

    // 2) delete mirrored rows (service role bypasses RLS)
    const ids = targets.map((u) => u.id);
    if (ids.length) {
      await supabaseAdmin.from("users").delete().in("id", ids);
    }

    // 3) delete auth users
    let deleted = 0;
    for (const u of targets) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (!error) deleted++;
    }

    return res.json({
      checked: authUsers?.users?.length || 0,
      toDelete: targets.length,
      deleted,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Cleanup failed" });
  }
});

export default router;