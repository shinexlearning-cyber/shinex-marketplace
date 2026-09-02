import { Router } from "express";
import { supabase } from "../services/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { data: favs, error } = await supabase.from("favorites")
      .select("product_id,shop_id").eq("user_id", req.user.id);
    if (error) throw error;

    const productIds = (favs || []).map(x => x.product_id).filter(Boolean);
    const shopIds = (favs || []).map(x => x.shop_id).filter(Boolean);

    let products = [];
    let shops = [];
    if (productIds.length) {
      const r = await supabase.from("products").select("*").in("id", productIds).eq("is_approved", true);
      if (r.error) throw r.error;
      products = r.data || [];
    }
    if (shopIds.length) {
      const r = await supabase.from("users").select("id,username,avatar,shop_name,full_name").in("id", shopIds);
      if (r.error) throw r.error;
      shops = (r.data || []).map(s => ({ id: s.id, username: s.username, avatar: s.avatar, shopName: s.shop_name || s.full_name }));
    }
    res.json({ products, shops });
  } catch (e) { next(e); }
});

router.get("/ids", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("favorites").select("product_id").eq("user_id", req.user.id).not("product_id", "is", null);
    if (error) throw error;
    res.json({ productIds: (data || []).map(x => x.product_id) });
  } catch (e) { next(e); }
});

router.post("/products/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("favorites").upsert(
      { user_id: req.user.id, product_id: req.params.id },
      { onConflict: "user_id,product_id" }
    );
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("favorites").delete().eq("user_id", req.user.id).eq("product_id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/shops/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("favorites").upsert(
      { user_id: req.user.id, shop_id: req.params.id },
      { onConflict: "user_id,shop_id" }
    );
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/shops/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("favorites").delete().eq("user_id", req.user.id).eq("shop_id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
