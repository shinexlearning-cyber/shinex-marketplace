import { Router } from "express";
import { supabase } from "../services/supabase.js";

const router = Router();

router.get("/:username", async (req, res, next) => {
  try {
    const username = String(req.params.username).toLowerCase();
    const { data: shop, error } = await supabase.from("users")
      .select("id,full_name,username,avatar,bio,location,whatsapp,shop_name,role,created_at,shop_views")
      .eq("username", username).maybeSingle();
    if (error) throw error;
    if (!shop) return res.status(404).json({ message: "Shop not found." });

    const { data: products, error: pe } = await supabase.from("products")
      .select("*").eq("seller_id", shop.id).eq("is_approved", true)
      .order("created_at", { ascending: false });
    if (pe) throw pe;

    await supabase.from("users").update({ shop_views: (shop.shop_views || 0) + 1 }).eq("id", shop.id);

    res.json({
      shop: {
        id: shop.id, fullName: shop.full_name, username: shop.username,
        avatar: shop.avatar, bio: shop.bio, location: shop.location,
        whatsapp: shop.whatsapp, shopName: shop.shop_name, role: shop.role
      },
      products: products || []
    });
  } catch (e) { next(e); }
});

export default router;
