import { Router } from "express";
import { supabase } from "../services/supabase.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Please fill in every field." });
    }
    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(), email: email.trim().toLowerCase(), message: message.trim()
    });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
