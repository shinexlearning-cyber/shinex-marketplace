import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../services/supabase.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const publicUser = u => ({
  id: u.id,
  fullName: u.full_name,
  username: u.username,
  email: u.email,
  phone: u.phone,
  avatar: u.avatar,
  bio: u.bio,
  location: u.location,
  whatsapp: u.whatsapp,
  shopName: u.shop_name,
  role: u.role,
  createdAt: u.created_at
});

router.post("/register", async (req, res, next) => {
  try {
    const { fullName, username, email, phone, password } = req.body || {};
    if (!fullName || !username || !email || !phone || !password) {
      return res.status(400).json({ message: "All registration fields are required." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim().toLowerCase();

    const { data: existing, error: existingError } = await supabase
      .from("users").select("id").or(`email.eq.${normalizedEmail},username.eq.${normalizedUsername}`);
    if (existingError) throw existingError;
    if (existing?.length) return res.status(409).json({ message: "Email or username is already in use." });

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from("users").insert({
      full_name: fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      phone: phone.trim(),
      password_hash: passwordHash,
      shop_name: fullName.trim()
    }).select("*").single();

    if (error) throw error;
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const { data: user, error } = await supabase
      .from("users").select("*").eq("email", String(email).trim().toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const { data: user, error } = await supabase.from("users").select("id,email").eq("email", email).maybeSingle();
    if (error) throw error;

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await supabase.from("password_resets").insert({
        user_id: user.id,
        token,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
      console.log(`Password reset token for ${email}: ${token}`);
      // No email provider is configured in this starter backend.
    }

    res.json({ message: "If an account exists, a reset link is on its way." });
  } catch (e) { next(e); }
});

export { publicUser };
export default router;
