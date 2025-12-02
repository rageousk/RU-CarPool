// backend/routes/messages.js
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

/** 
 * POST /api/messages/conversations
 * Create or get existing conversation for a demand
 * Body: { demand_id, driver_id, rider_id }
 */
router.post("/conversations", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { demand_id, driver_id, rider_id } = req.body;

    if (!demand_id || !driver_id || !rider_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure the requesting user is part of the conversation
    if (user.id !== driver_id && user.id !== rider_id) {
        return res.status(403).json({ error: "You are not part of this conversation" });
    }

    // Check if conversation already exists
    const { data: existing, error: fetchErr } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("demand_id", demand_id)
        .eq("driver_id", driver_id)
        .eq("rider_id", rider_id)
        .maybeSingle();

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (existing) return res.json({ conversation: existing });

    // Create new conversation
    const { data: newConv, error: createErr } = await supabaseAdmin
        .from("conversations")
        .insert({ demand_id, driver_id, rider_id })
        .select()
        .single();

    if (createErr) return res.status(500).json({ error: createErr.message });
    return res.status(201).json({ conversation: newConv });
});

/**
 * GET /api/messages/conversations
 * List all conversations for the current user
 */
router.get("/conversations", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    // Fetch conversations where user is rider OR driver
    const { data, error } = await supabaseAdmin
        .from("conversations")
        .select(`
      *,
      rider:users!rider_id(first_name, last_name),
      driver:users!driver_id(first_name, last_name),
      demand:ride_demands(origin, destination, departure_time)
    `)
        .or(`rider_id.eq.${user.id},driver_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ conversations: data });
});

/**
 * GET /api/messages/:conversationId
 * Get message history for a conversation
 */
router.get("/:conversationId", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    // Verify access (RLS policies on Supabase side handle this, but good to double check if using admin client)
    // For simplicity/speed, we'll rely on the join to filter or just fetch. 
    // Since we are using supabaseAdmin, we SHOULD check ownership manually if we want strict security here,
    // but for now let's fetch and filter or trust the client to only ask for their own.
    // Better: Check if user is in the conversation first.

    const { data: conv, error: convErr } = await supabaseAdmin
        .from("conversations")
        .select("rider_id, driver_id")
        .eq("id", conversationId)
        .single();

    if (convErr || !conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.rider_id !== user.id && conv.driver_id !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (msgErr) return res.status(500).json({ error: msgErr.message });
    return res.json({ messages });
});

/**
 * POST /api/messages/:conversationId
 * Send a new message
 */
router.post("/:conversationId", async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: "Content is required" });

    // Verify membership
    const { data: conv, error: convErr } = await supabaseAdmin
        .from("conversations")
        .select("rider_id, driver_id")
        .eq("id", conversationId)
        .single();

    if (convErr || !conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.rider_id !== user.id && conv.driver_id !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // Insert message
    const { data: msg, error: insertErr } = await supabaseAdmin
        .from("messages")
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content
        })
        .select()
        .single();

    if (insertErr) return res.status(500).json({ error: insertErr.message });

    // Update conversation updated_at
    await supabaseAdmin
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

    return res.status(201).json({ message: msg });
});

export default router;
