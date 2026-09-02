import { Router } from "express";
import { supabase } from "../services/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const tableMap = {
  users: "users",
  products: "products",
  advertisements: "advertisements",
  payments: "payments",
  reports: "reports",
  contact: "contact_messages"
};

router.get("/stats", async (_req, res, next) => {
  try {
    const counts = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("advertisements").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending")
    ]);
    res.json({
      usersCount: counts[0].count || 0,
      productsCount: counts[1].count || 0,
      activeAdsCount: counts[2].count || 0,
      pendingReportsCount: counts[3].count || 0
    });
  } catch (e) { next(e); }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (e) { next(e); }
});

router.post("/categories", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Category name is required." });
    const { data, error } = await supabase.from("categories").insert({ name }).select("*").single();
    if (error) throw error;
    res.status(201).json({ category: data });
  } catch (e) { next(e); }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const { error } = await supabase.from("categories").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/ad-pricing", async (_req, res, next) => {
  try {
    const { data } = await supabase.from("settings").select("value").eq("key", "ad_pricing").maybeSingle();
    res.json({ plans: data?.value?.plans || [
      { key: "1day", label: "1 Day", price: 200 },
      { key: "3days", label: "3 Days", price: 500 },
      { key: "7days", label: "7 Days", price: 1000 },
      { key: "30days", label: "30 Days", price: 3000 }
    ]});
  } catch (e) { next(e); }
});

router.put("/ad-pricing", async (req, res, next) => {
  try {
    const plans = Array.isArray(req.body?.plans) ? req.body.plans : [];
    const { error } = await supabase.from("settings").upsert({ key: "ad_pricing", value: { plans } }, { onConflict: "key" });
    if (error) throw error;
    res.json({ plans });
  } catch (e) { next(e); }
});

for (const [resource, table] of Object.entries(tableMap)) {
  router.get(`/${resource}`, async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 8)));
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      let q = supabase.from(table).select("*", { count: "exact" }).range(from, to).order("created_at", { ascending: false });
      if (req.query.search && ["users","products","advertisements","reports","contact"].includes(resource)) {
        const s = String(req.query.search).replace(/[%_]/g, "");
        if (resource === "users") q = q.or(`username.ilike.%${s}%,email.ilike.%${s}%,full_name.ilike.%${s}%`);
        if (resource === "products") q = q.or(`name.ilike.%${s}%,category.ilike.%${s}%`);
        if (resource === "advertisements") q = q.ilike("title", `%${s}%`);
        if (resource === "reports") q = q.ilike("reason", `%${s}%`);
        if (resource === "contact") q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,message.ilike.%${s}%`);
      }
      const { data, count, error } = await q;
      if (error) throw error;
      res.json({ items: data || [], total: count || 0 });
    } catch (e) { next(e); }
  });

  router.delete(`/${resource}/:id`, async (req, res, next) => {
    try {
      const { error } = await supabase.from(table).delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}

export default router;
