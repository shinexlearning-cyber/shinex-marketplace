import { Router } from "express";
import { supabase } from "../services/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { productId, reason } = req.body || {};
    if (!productId || !reason?.trim()) return res.status(400).json({ message: "Product and reason are required." });

    const { error } = await supabase.from("reports").insert({
      reporter_id: req.user.id,
      product_id: productId,
      reason: reason.trim(),
      status: "pending"
    });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
