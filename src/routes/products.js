import { Router } from "express";
import { supabase } from "../services/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { uploadBuffer } from "../services/cloudinary.js";

const router = Router();

async function withSeller(products) {
  if (!products?.length) return [];
  const ids = [...new Set(products.map(p => p.seller_id).filter(Boolean))];
  const { data: sellers, error } = await supabase.from("users")
    .select("id,username,full_name,avatar,shop_name,whatsapp,location")
    .in("id", ids);
  if (error) throw error;
  const map = new Map((sellers || []).map(s => [s.id, s]));
  return products.map(p => ({
    ...p,
    id: p.id,
    name: p.name,
    images: p.images || [],
    seller: map.get(p.seller_id) || null
  }));
}

router.get("/", async (req, res, next) => {
  try {
    const { search = "", category = "" } = req.query;
    let q = supabase.from("products").select("*").eq("is_approved", true).order("created_at", { ascending: false }).limit(100);
    if (category) q = q.eq("category", category);
    if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ products: await withSeller(data || []) });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("products").select("*").eq("id", req.params.id).eq("is_approved", true).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Product not found." });
    const [p] = await withSeller([data]);
    await supabase.rpc("increment_product_views", { product_uuid: data.id }).catch(() => {});
    res.json({ product: p });
  } catch (e) { next(e); }
});

router.post("/", requireAuth, upload.array("images", 5), async (req, res, next) => {
  try {
    const { name, price, category, description, location } = req.body || {};
    if (!name || !price || !category || !description || !location) {
      return res.status(400).json({ message: "Name, price, category, description and location are required." });
    }
    if (!req.files?.length) return res.status(400).json({ message: "Add at least one product image." });

    const uploaded = [];
    for (const file of req.files) {
      const result = await uploadBuffer(file.buffer, "shinex/products");
      uploaded.push(result.secure_url);
    }

    const { data, error } = await supabase.from("products").insert({
      seller_id: req.user.id,
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
      description: description.trim(),
      location: location.trim(),
      images: uploaded,
      is_approved: true
    }).select("*").single();

    if (error) throw error;
    const [product] = await withSeller([data]);
    res.status(201).json({ product });
  } catch (e) { next(e); }
});

export default router;
