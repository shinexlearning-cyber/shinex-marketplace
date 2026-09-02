import { Router } from "express";
import { supabase } from "../services/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUser } from "./auth.js";

const router = Router();
router.use(requireAuth);

router.patch("/me", async (req, res, next) => {
  try {
    const { fullName, bio, location, whatsapp, shopName } = req.body || {};
    const updates = {
      full_name: fullName?.trim(),
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      shop_name: shopName?.trim() || null
    };
    const { data, error } = await supabase.from("users").update(updates).eq("id", req.user.id).select("*").single();
    if (error) throw error;
    res.json({ user: publicUser(data) });
  } catch (e) { next(e); }
});

router.get("/me/stats", async (req, res, next) => {
  try {
    const [{ count: productsCount }, { count: favoritesCount }] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", req.user.id),
      supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", req.user.id)
    ]);
    res.json({
      productsCount: productsCount || 0,
      favoritesCount: favoritesCount || 0,
      viewsCount: req.user.shop_views || 0
    });
  } catch (e) { next(e); }
});

export default router;
