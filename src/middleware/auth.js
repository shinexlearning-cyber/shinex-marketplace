import { supabase } from "../services/supabase.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required." });

    const payload = verifyToken(token);
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.sub)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ message: "User account not found." });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired login session." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only." });
  }
  next();
}
