import { Router } from "express";
import { supabaseAdmin as supabase } from "../lib/supabase.js";

const router = Router();

/** GET /api/users/:id */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  return res.json(data);
});

/** PATCH /api/users/:id
 * body may include: first_name, last_name, phone, is_driver
 */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = (({ first_name, last_name, phone, is_driver }) => ({
    first_name,
    last_name,
    phone,
    is_driver,
  }))(req.body || {});

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

export default router;