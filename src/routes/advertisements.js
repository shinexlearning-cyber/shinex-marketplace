import { Router } from "express";
import { supabase } from "../services/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { uploadBuffer } from "../services/cloudinary.js";

const router = Router();
const DEFAULT_PLANS = [
  { key: "1day", label: "1 Day", price: 200, days: 1 },
  { key: "3days", label: "3 Days", price: 500, days: 3 },
  { key: "7days", label: "7 Days", price: 1000, days: 7 },
  { key: "30days", label: "30 Days", price: 3000, days: 30 }
];

async function getPlans() {
  const { data } = await supabase.from("settings").select("value").eq("key", "ad_pricing").maybeSingle();
  return data?.value?.plans || DEFAULT_PLANS;
}

router.get("/active", async (_req, res, next) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("advertisements")
      .select("*").eq("status", "active").lte("starts_at", now).gte("ends_at", now)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ advertisements: data || [] });
  } catch (e) { next(e); }
});

router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const { plan, title, description } = req.body || {};
    const plans = await getPlans();
    const selected = plans.find(p => p.key === plan);
    if (!selected) return res.status(400).json({ message: "Invalid advertisement plan." });
    if (!title?.trim() || !description?.trim()) return res.status(400).json({ message: "Ad title and description are required." });

    let image = null;
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, "shinex/ads");
      image = result.secure_url;
    }

    const { data: ad, error } = await supabase.from("advertisements").insert({
      user_id: req.user.id,
      title: title.trim(),
      description: description.trim(),
      image,
      plan: selected.key,
      amount: Number(selected.price),
      status: "pending"
    }).select("*").single();
    if (error) throw error;

    let authorization_url = null;
    if (process.env.PAYSTACK_SECRET_KEY) {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: req.user.email,
          amount: Math.round(Number(selected.price) * 100),
          callback_url: process.env.PAYSTACK_CALLBACK_URL,
          metadata: { advertisement_id: ad.id, user_id: req.user.id }
        })
      });
      const pay = await response.json();
      if (pay.status) authorization_url = pay.data.authorization_url;
    }

    res.status(201).json({ advertisement: ad, authorization_url });
  } catch (e) { next(e); }
});

export default router;
