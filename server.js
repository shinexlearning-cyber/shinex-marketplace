import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import productRoutes from "./src/routes/products.js";
import shopRoutes from "./src/routes/shops.js";
import favoriteRoutes from "./src/routes/favorites.js";
import userRoutes from "./src/routes/users.js";
import advertisementRoutes from "./src/routes/advertisements.js";
import reportRoutes from "./src/routes/reports.js";
import adminRoutes from "./src/routes/admin.js";
import contactRoutes from "./src/routes/contact.js";

const app = express();
const port = Number(process.env.PORT || 10000);

const allowed = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("CORS: frontend origin is not allowed"));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/", (_req, res) => res.json({
  ok: true,
  name: "SHINEX Marketplace API",
  status: "running"
}));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`SHINEX API running on port ${port}`);
});
