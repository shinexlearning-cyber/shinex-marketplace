import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import {
  Search, Heart, Plus, User, LogOut, MapPin, Phone, MessageCircle,
  Camera, X, ChevronLeft, ChevronRight, Menu, Home, Store, Megaphone,
  LayoutDashboard, Users, Package, Tag, CreditCard, Flag, Mail,
  Trash2, Edit2, ChevronDown, AlertCircle, CheckCircle, Info, Loader2,
  Eye, EyeOff, ShoppingBag, Check, Pause, Ban
} from "lucide-react";

/* ============================================================
   SHINEX MARKETPLACE
   Single-file React application with client-side state routing
   (no react-router available in this environment — page switches
   are handled through the `nav` state below).

   Wired to the real SHINEX backend (Express + Supabase). Every
   endpoint below matches backend/API_DOCUMENTATION.md and the
   route files exactly — nothing here is invented. Notable real
   constraints reflected in this file:
   - All responses are enveloped as { success, message, data }.
     The api() helper below unwraps `data` for callers.
   - Product creation needs a real category_id (from
     GET /products/categories/all), not a free-text category.
   - Favorites has no bulk "my favorite ids" endpoint, so favorite
     state is derived from GET /favorites/products + /favorites/sellers.
   - There is no public "active advertisements" endpoint, so the
     homepage has no sponsored-ads rail — nothing serves that data.
   - There is no GET /admin/stats endpoint; the admin overview is
     composed from the totals already returned by /admin/users,
     /admin/products, /admin/advertisements, /admin/reports and
     /admin/payments/stats.
   - Ad pricing is managed via /admin/durations (duration_days,
     price, is_active) — not a bespoke "ad-pricing" resource.
   - There's no "my profile stats" endpoint; Profile page stats are
     derived from the shop + favorites endpoints that do exist.
   ============================================================ */

const API_BASE = "https://shinex-marketplace.onrender.com/api";

const COLORS = {
  primary: "#5B3FC6",
  primaryDark: "#4A32A3",
  secondary: "#159A61",
  secondaryDark: "#0F7A4C",
  bg: "#EFF7F2",
};

/* ------------------------------------------------------------
   API HELPER
   Backend envelope: { success: boolean, message?: string, data?: any }
   ------------------------------------------------------------ */
async function api(path, { method = "GET", body, auth = true, formData = false } = {}) {
  const headers = {};
  if (!formData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = localStorage.getItem("shinex_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (formData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  let payload = null;
  try {
    payload = await res.json();
  } catch (e) {
    payload = null;
  }
  if (!res.ok || (payload && payload.success === false)) {
    const msg =
      (payload && (payload.message || (Array.isArray(payload.errors) && payload.errors[0]))) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  // Return the full payload so callers can read data/pagination/message as needed.
  return payload || {};
}

/* ------------------------------------------------------------
   TOAST SYSTEM
   ------------------------------------------------------------ */
const ToastContext = createContext(null);
function useToast() {
  return useContext(ToastContext);
}
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl shadow-lg px-4 py-3 text-sm font-medium border animate-[fadein_.2s_ease-out] ${
              t.type === "success"
                ? "bg-white border-[#159A61] text-[#0F7A4C]"
                : t.type === "error"
                ? "bg-white border-red-400 text-red-600"
                : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            {t.type === "success" && <CheckCircle size={18} className="mt-0.5 shrink-0" />}
            {t.type === "error" && <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            {t.type === "info" && <Info size={18} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------
   AUTH CONTEXT
   Backend user fields: id, username, email, full_name, phone,
   avatar_url, bio, location, whatsapp, shop_name,
   shop_description, is_admin, is_suspended, created_at
   ------------------------------------------------------------ */
const AuthContext = createContext(null);
function useAuth() {
  return useContext(AuthContext);
}
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("shinex_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api("/auth/me");
      setUser(data.user);
    } catch (e) {
      localStorage.removeItem("shinex_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await api("/auth/login", { method: "POST", body: { email, password }, auth: false });
    if (data.token) localStorage.setItem("shinex_token", data.token);
    setUser(data.user || null);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api("/auth/register", { method: "POST", body: payload, auth: false });
    if (data.token) localStorage.setItem("shinex_token", data.token);
    setUser(data.user || null);
    return data;
  };

  const logout = () => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("shinex_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------
   CATEGORIES CONTEXT — GET /products/categories/all
   { id, name, slug, description, icon, is_active }
   ------------------------------------------------------------ */
const CategoriesContext = createContext({ categories: [], status: "loading" });
function useCategories() {
  return useContext(CategoriesContext);
}
function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await api("/products/categories/all", { auth: false });
      setCategories(data || []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return <CategoriesContext.Provider value={{ categories, status, reload: load }}>{children}</CategoriesContext.Provider>;
}

/* ------------------------------------------------------------
   SMALL SHARED UI PIECES
   ------------------------------------------------------------ */
function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className="rounded-xl flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, fontSize: size * 0.5 }}
      >
        S
      </div>
      <span className="font-extrabold text-lg tracking-tight" style={{ color: COLORS.primary }}>
        SHINEX
      </span>
    </div>
  );
}

function Button({ children, variant = "primary", className = "", as: As = "button", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const styles = {
    primary: "text-white shadow-sm hover:shadow-md",
    secondary: "text-white shadow-sm hover:shadow-md",
    outline: "border-2 bg-white",
    ghost: "hover:bg-black/5",
  };
  const inline =
    variant === "primary"
      ? { backgroundColor: COLORS.primary }
      : variant === "secondary"
      ? { backgroundColor: COLORS.secondary }
      : variant === "outline"
      ? { borderColor: COLORS.primary, color: COLORS.primary }
      : {};
  return (
    <As className={`${base} ${styles[variant]} ${className}`} style={inline} {...props}>
      {children}
    </As>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <input
        className={`w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none transition focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:ring-[#5B3FC6]/20 focus:border-[#5B3FC6]"
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

function TextArea({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <textarea
        className={`w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none transition focus:ring-2 resize-none ${
          error ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:ring-[#5B3FC6]/20 focus:border-[#5B3FC6]"
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

function Select({ label, error, className = "", children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <div className="relative">
        <select
          className={`w-full appearance-none rounded-xl border px-3.5 py-2.5 text-[15px] outline-none transition focus:ring-2 bg-white ${
            error ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:ring-[#5B3FC6]/20 focus:border-[#5B3FC6]"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200/80 rounded-xl ${className}`} />;
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = Package, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${COLORS.primary}14` }}>
        <Icon size={28} style={{ color: COLORS.primary }} />
      </div>
      <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
      {subtitle && <p className="text-gray-500 text-sm mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-50">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <h3 className="font-semibold text-gray-800 text-lg">Something went wrong</h3>
      <p className="text-gray-500 text-sm mt-1 max-w-xs">{message || "We couldn't load this right now."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 text-sm font-semibold" style={{ color: COLORS.primary }}>
          Try again
        </button>
      )}
    </div>
  );
}

function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin" size={28} style={{ color: COLORS.primary }} />
    </div>
  );
}

function money(n) {
  const num = Number(n || 0);
  return `₦${num.toLocaleString("en-NG")}`;
}

/* ------------------------------------------------------------
   HEADER / FOOTER / BOTTOM NAV
   ------------------------------------------------------------ */
function Header({ nav, go, query, setQuery, onSearchSubmit }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <button onClick={() => go("home")} className="shrink-0">
          <Logo />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
          className="hidden md:flex flex-1 max-w-md relative"
        >
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-full border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20 focus:border-[#5B3FC6]"
          />
        </form>

        <div className="flex-1 md:hidden" />

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <button onClick={() => go("favorites")} className="p-2.5 rounded-full hover:bg-gray-50" title="Favorites">
            <Heart size={20} className="text-gray-600" />
          </button>
          <Button onClick={() => go(user ? "sell" : "login")} className="!py-2 !px-3.5">
            <Plus size={16} /> Sell
          </Button>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="ml-1 w-9 h-9 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100"
                style={{ borderColor: COLORS.primary }}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold" style={{ color: COLORS.primary }}>
                    {(user.full_name || user.username || "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5" onMouseLeave={() => setMenuOpen(false)}>
                  <button onClick={() => { setMenuOpen(false); go("profile"); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <User size={15} /> Profile
                  </button>
                  <button onClick={() => { setMenuOpen(false); go("advertise"); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Megaphone size={15} /> Advertise
                  </button>
                  {user.is_admin && (
                    <button onClick={() => { setMenuOpen(false); go("admin"); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <LayoutDashboard size={15} /> Admin
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); logout(); go("home"); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-500"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <button onClick={() => go("login")} className="text-sm font-semibold px-3 py-2" style={{ color: COLORS.primary }}>
                Login
              </button>
              <Button onClick={() => go("register")} variant="secondary" className="!py-2">
                Register
              </Button>
            </div>
          )}
        </nav>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit();
        }}
        className="md:hidden px-4 pb-3 relative"
      >
        <Search size={17} className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-full border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20"
        />
      </form>
    </header>
  );
}

function Footer({ go }) {
  return (
    <footer className="bg-white border-t border-gray-100 mt-16 pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Logo size={26} />
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            A trusted marketplace to buy and sell locally, built on real listings from real people.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><button onClick={() => go("about")} className="hover:text-[#5B3FC6]">About</button></li>
            <li><button onClick={() => go("contact")} className="hover:text-[#5B3FC6]">Contact</button></li>
            <li><button onClick={() => go("advertise")} className="hover:text-[#5B3FC6]">Advertise</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><button onClick={() => go("privacy")} className="hover:text-[#5B3FC6]">Privacy Policy</button></li>
            <li><button onClick={() => go("terms")} className="hover:text-[#5B3FC6]">Terms of Service</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-3">Get started</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><button onClick={() => go("sell")} className="hover:text-[#5B3FC6]">Sell an item</button></li>
            <li><button onClick={() => go("register")} className="hover:text-[#5B3FC6]">Create account</button></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-gray-400 pb-6">© {new Date().getFullYear()} SHINEX Marketplace. All rights reserved.</div>
    </footer>
  );
}

function BottomNav({ nav, go }) {
  const { user } = useAuth();
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "favorites", label: "Favorites", icon: Heart },
    { key: "sell", label: "Sell", icon: Plus, requiresAuth: true },
    { key: "advertise", label: "Advertise", icon: Megaphone },
    { key: "profile", label: user ? "Profile" : "Login", icon: User, altKey: user ? "profile" : "login" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const target = it.altKey || it.key;
        const active = nav.page === target;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            onClick={() => go(it.requiresAuth && !user ? "login" : target)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <Icon size={20} color={active ? COLORS.primary : "#9CA3AF"} fill={it.key === "favorites" && active ? COLORS.primary : "none"} />
            <span className="text-[10px] font-medium" style={{ color: active ? COLORS.primary : "#9CA3AF" }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------
   PRODUCT CARD
   Product shape (list): id, name, price, primary_image, location,
   seller { username, full_name, shop_name, avatar_url, whatsapp }
   ------------------------------------------------------------ */
function ProductCard({ product, go, favoriteProductIds, toggleFavorite }) {
  const id = product.id;
  const isFav = favoriteProductIds.has(id);
  const image = product.primary_image || (product.images && product.images[0]?.image_url);
  return (
    <div className="group rounded-2xl bg-white border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <button onClick={() => go("product", { id })} className="block w-full text-left">
        <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
          {image ? (
            <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ShoppingBag size={36} />
            </div>
          )}
          {product.is_sold && (
            <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-md bg-gray-800/80">Sold</span>
          )}
        </div>
      </button>
      <div className="p-3">
        <button onClick={() => go("product", { id })} className="block text-left w-full">
          <h3 className="font-medium text-sm text-gray-800 truncate">{product.name}</h3>
        </button>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-[15px]" style={{ color: COLORS.secondary }}>
            {money(product.price)}
          </span>
          <button onClick={() => toggleFavorite(id, "product")} className="p-1 -mr-1">
            <Heart size={18} color={isFav ? "#EF4444" : "#C4C4C4"} fill={isFav ? "#EF4444" : "none"} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
          <span className="truncate">{product.seller?.shop_name || product.seller?.username || "Seller"}</span>
          {product.location && (
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin size={11} /> {product.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: HOME
   ------------------------------------------------------------ */
function HomePage({ go, search, favoriteProductIds, toggleFavorite }) {
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [activeCategory, setActiveCategory] = useState("all");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (activeCategory !== "all") q.set("category", activeCategory);
      const { data } = await api(`/products?${q.toString()}`, { auth: false });
      setProducts(data || []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, [search, activeCategory]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        <button
          onClick={() => setActiveCategory("all")}
          className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
          style={
            activeCategory === "all"
              ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary, color: "white" }
              : { borderColor: "#E5E7EB", color: "#4B5563" }
          }
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
            style={
              activeCategory === c.id
                ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary, color: "white" }
                : { borderColor: "#E5E7EB", color: "#4B5563" }
            }
          >
            {c.icon ? `${c.icon} ` : ""}{c.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-800">
            {search ? `Results for "${search}"` : activeCategory !== "all" ? categories.find((c) => c.id === activeCategory)?.name || "Listings" : "Latest listings"}
          </h2>
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {status === "error" && <ErrorState message="We couldn't load listings from the server." onRetry={load} />}

        {status === "ready" && products.length === 0 && (
          <EmptyState
            icon={Package}
            title="No listings yet"
            subtitle={search ? "Try a different search term or browse all categories." : "Be the first to list something in this category."}
            action={<Button onClick={() => go("sell")}>List a product</Button>}
          />
        )}

        {status === "ready" && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} go={go} favoriteProductIds={favoriteProductIds} toggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: PRODUCT DETAIL — GET /products/:id
   ------------------------------------------------------------ */
function ProductDetailPage({ params, go, favoriteProductIds, toggleFavorite }) {
  const toast = useToast();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeImg, setActiveImg] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await api(`/products/${params.id}`, { auth: false });
      setProduct(data);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <PageSpinner />;
  if (status === "error" || !product) return <ErrorState message="This listing may have been removed." onRetry={load} />;

  const images = (product.images && product.images.length
    ? [...product.images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)).map((i) => i.image_url)
    : []);
  const isFav = favoriteProductIds.has(product.id);

  const whatsappNumber = (product.seller?.whatsapp || "").replace(/[^0-9]/g, "");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I'm interested in "${product.name}" on SHINEX.`)}`
    : null;

  const submitReport = async () => {
    if (!reportReason) {
      toast.push("Choose a reason for this report.", "error");
      return;
    }
    setReporting(true);
    try {
      await api(`/reports`, { method: "POST", body: { target_product_id: product.id, reason: reportReason, description: reportDescription } });
      toast.push("Report submitted. Thank you for helping keep SHINEX safe.", "success");
      setReportOpen(false);
      setReportReason("");
      setReportDescription("");
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag size={48} /></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2"
                  style={{ borderColor: i === activeImg ? COLORS.primary : "transparent" }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-3xl font-extrabold mt-2" style={{ color: COLORS.secondary }}>
            {money(product.price)}
          </p>
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500 flex-wrap">
            {product.location && <span className="flex items-center gap-1"><MapPin size={14} /> {product.location}</span>}
            {product.category?.name && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">{product.category.name}</span>}
            {product.condition && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs capitalize">{product.condition}</span>}
            {product.is_sold && <span className="px-2 py-0.5 rounded-full bg-gray-800 text-white text-xs">Sold</span>}
          </div>

          <button
            onClick={() => product.seller?.username && go("shop", { username: product.seller.username })}
            className="flex items-center gap-3 mt-5 p-3 rounded-xl border border-gray-100 w-full hover:bg-gray-50"
          >
            <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {product.seller?.avatar_url ? (
                <img src={product.seller.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <User size={20} className="text-gray-400" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-800">{product.seller?.shop_name || product.seller?.username || "Seller"}</p>
              <p className="text-xs text-gray-400">@{product.seller?.username || "unknown"}</p>
            </div>
          </button>

          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-1.5">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description || "No description provided."}</p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {whatsappHref ? (
              <Button as="a" href={whatsappHref} target="_blank" rel="noreferrer" variant="secondary" className="flex-1 min-w-[180px]">
                <MessageCircle size={17} /> Contact Seller
              </Button>
            ) : (
              <Button variant="secondary" className="flex-1 min-w-[180px]" disabled>
                <MessageCircle size={17} /> No WhatsApp number
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => (user ? toggleFavorite(product.id, "product") : go("login"))}
              className="!bg-white"
            >
              <Heart size={17} fill={isFav ? "#EF4444" : "none"} color={isFav ? "#EF4444" : COLORS.primary} />
              {isFav ? "Saved" : "Favorite"}
            </Button>
            <button
              onClick={() => (user ? setReportOpen(true) : go("login"))}
              className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-4 py-2.5 text-red-500 border-2 border-red-100 hover:bg-red-50"
            >
              <Flag size={16} /> Report
            </button>
          </div>
        </div>
      </div>

      {reportOpen && (
        <Modal onClose={() => setReportOpen(false)} title="Report this listing">
          <Select label="Reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
            <option value="">Select a reason</option>
            <option value="Spam">Spam</option>
            <option value="Scam or fraud">Scam or fraud</option>
            <option value="Counterfeit item">Counterfeit item</option>
            <option value="Inappropriate content">Inappropriate content</option>
            <option value="Other">Other</option>
          </Select>
          <div className="mt-4">
            <TextArea
              label="Additional details (optional)"
              rows={4}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Describe the issue..."
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 !bg-white" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={submitReport} disabled={reporting || !reportReason}>
              {reporting ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: SHOP — GET /users/:username + GET /users/:username/shop
   ------------------------------------------------------------ */
function ShopPage({ params, go, favoriteSellerIds, toggleFavorite }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [profileRes, shopRes] = await Promise.all([
        api(`/users/${params.username}`, { auth: false }),
        api(`/users/${params.username}/shop`, { auth: false }),
      ]);
      setProfile(profileRes.data.user);
      setShop(shopRes.data.shop);
      setProducts(shopRes.data.products || []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, [params.username]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <PageSpinner />;
  if (status === "error" || !profile) return <ErrorState message="This shop could not be found." onRetry={load} />;

  const whatsappNumber = (shop?.whatsapp || profile.whatsapp || "").replace(/[^0-9]/g, "");
  const isFavShop = favoriteSellerIds.has(profile.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
          {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={32} className="text-gray-400" />}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{shop?.shop_name || profile.username}</h1>
              <p className="text-sm text-gray-400">@{profile.username}</p>
            </div>
            {user && user.username !== profile.username && (
              <button onClick={() => toggleFavorite(profile.id, "seller")} className="p-2 rounded-full border border-gray-100 hover:bg-gray-50 shrink-0">
                <Heart size={18} fill={isFavShop ? "#EF4444" : "none"} color={isFavShop ? "#EF4444" : "#9CA3AF"} />
              </button>
            )}
          </div>
          {(shop?.shop_description || profile.bio) && <p className="text-sm text-gray-600 mt-2 max-w-xl">{shop?.shop_description || profile.bio}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {profile.location && <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>}
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium" style={{ color: COLORS.secondary }}>
                <Phone size={14} /> WhatsApp seller
              </a>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-bold text-lg text-gray-800 mt-8 mb-4">Listings from this shop</h2>
      {products.length === 0 ? (
        <EmptyState icon={Store} title="No products listed yet" subtitle="This seller hasn't listed anything yet — check back soon." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={{ ...p, seller: { username: profile.username, shop_name: shop?.shop_name } }}
              go={go}
              favoriteProductIds={new Set()}
              toggleFavorite={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: REGISTER — POST /auth/register
   ------------------------------------------------------------ */
function RegisterPage({ go }) {
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = "Full name is required";
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(form.username)) e.username = "3+ characters — letters, numbers, underscore only";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.phone.trim().length < 10) e.phone = "Enter a valid phone number";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        full_name: form.fullName,
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.push("Account created! Welcome to SHINEX.", "success");
      go("home");
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join SHINEX to buy and sell with your community." go={go} switchLabel="Already have an account?" switchCta="Log in" switchTo="login">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} placeholder="e.g. Amaka Obi" />
        <Input label="Username" value={form.username} onChange={set("username")} error={errors.username} placeholder="e.g. amaka_shop" />
        <Input label="Email" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" />
        <Input label="Phone number" value={form.phone} onChange={set("phone")} error={errors.phone} placeholder="+234..." />
        <div className="relative">
          <Input label="Password" type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} error={errors.password} placeholder="At least 8 characters" />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-[38px] text-gray-400">
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <Input label="Confirm password" type={showPw ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} placeholder="Re-enter your password" />
        <Button className="w-full !py-3 mt-2" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children, go, switchLabel, switchCta, switchTo }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={40} /></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <h1 className="text-xl font-bold text-gray-900 text-center">{title}</h1>
          <p className="text-sm text-gray-500 text-center mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
        <p className="text-center text-sm text-gray-500 mt-5">
          {switchLabel}{" "}
          <button onClick={() => go(switchTo)} className="font-semibold" style={{ color: COLORS.primary }}>
            {switchCta}
          </button>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: LOGIN — POST /auth/login
   ------------------------------------------------------------ */
function LoginPage({ go }) {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.push("Welcome back!", "success");
      go("home");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Log in to SHINEX" subtitle="Enter your details to continue." go={go} switchLabel="New to SHINEX?" switchCta="Create an account" switchTo="register">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <div className="relative">
          <Input label="Password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-[38px] text-gray-400">
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={14} />{error}</p>}
        <div className="text-right -mt-2">
          <button type="button" onClick={() => go("forgot")} className="text-sm font-medium" style={{ color: COLORS.primary }}>
            Forgot password?
          </button>
        </div>
        <Button className="w-full !py-3" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function ForgotPasswordPage({ go }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
      setSent(true);
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll send a reset link to your email." go={go} switchLabel="Remembered it?" switchCta="Back to login" switchTo="login">
      {sent ? (
        <div className="text-center py-4">
          <CheckCircle size={36} className="mx-auto mb-3" style={{ color: COLORS.secondary }} />
          <p className="text-sm text-gray-600">If an account exists for {email}, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button className="w-full !py-3" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
        </form>
      )}
    </AuthLayout>
  );
}

/* ------------------------------------------------------------
   PAGE: SELL — POST /products (multipart, field "images", max 5)
   category_id must be a real category id from
   GET /products/categories/all.
   ------------------------------------------------------------ */
function SellPage({ go }) {
  const { user } = useAuth();
  const toast = useToast();
  const { categories, status: catStatus } = useCategories();
  const [form, setForm] = useState({ name: "", price: "", categoryId: "", condition: "used", description: "", location: "" });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (categories.length && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  if (!user) {
    return <EmptyState icon={Plus} title="Log in to sell" subtitle="Create an account or log in to list a product on SHINEX." action={<Button onClick={() => go("login")}>Log in</Button>} />;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.push("You can upload a maximum of 5 images.", "error");
      return;
    }
    const newOnes = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setImages((imgs) => [...imgs, ...newOnes]);
  };

  const removeImage = (i) => setImages((imgs) => imgs.filter((_, idx) => idx !== i));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Product name is required";
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price";
    if (!form.categoryId) e.category = "Choose a category";
    if (images.length === 0) e.images = "Add at least one image";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("price", form.price);
      fd.append("category_id", form.categoryId);
      fd.append("condition", form.condition);
      fd.append("description", form.description);
      fd.append("location", form.location);
      images.forEach((img) => fd.append("images", img.file));
      const { data } = await api("/products", { method: "POST", body: fd, formData: true });
      toast.push("Your product is now live!", "success");
      const newId = data.product?.id;
      go(newId ? "product" : "home", newId ? { id: newId } : undefined);
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">List a product</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Give buyers what they need to know — clear photos and details sell faster.</p>

      <form onSubmit={submit} className="space-y-5 bg-white rounded-2xl border border-gray-100 p-6">
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Photos ({images.length}/5)</span>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                <img src={img.url} className="w-full h-full object-cover" alt="" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#5B3FC6] hover:text-[#5B3FC6]"
              >
                <Camera size={20} />
                <span className="text-[11px]">Add photo</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
          {errors.images && <span className="mt-1 block text-xs text-red-500">{errors.images}</span>}
        </div>

        <Input label="Product name" value={form.name} onChange={set("name")} error={errors.name} placeholder="e.g. iPhone 13 Pro Max" />
        <Input label="Price (₦)" type="number" value={form.price} onChange={set("price")} error={errors.price} placeholder="e.g. 350000" />

        <Select label="Category" value={form.categoryId} onChange={set("categoryId")} error={errors.category} disabled={catStatus === "loading"}>
          {catStatus === "loading" && <option value="">Loading categories...</option>}
          {catStatus === "error" && <option value="">Couldn't load categories</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Select label="Condition" value={form.condition} onChange={set("condition")}>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </Select>

        <TextArea label="Description" rows={4} value={form.description} onChange={set("description")} placeholder="Condition, features, reason for selling..." />
        <Input label="Location" value={form.location} onChange={set("location")} placeholder="e.g. Ikeja, Lagos" />

        <Button className="w-full !py-3" disabled={loading}>
          {loading ? "Listing product..." : "List Product"}
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: FAVORITES — GET /favorites/products, GET /favorites/sellers
   ------------------------------------------------------------ */
function FavoritesPage({ go, favoriteProductIds, favoriteSellerIds, toggleFavorite }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setStatus("loading");
    try {
      const [prodRes, sellerRes] = await Promise.all([api("/favorites/products"), api("/favorites/sellers")]);
      setProducts((prodRes.data || []).map((f) => f.product).filter(Boolean));
      setSellers((sellerRes.data || []).map((f) => f.seller).filter(Boolean));
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return <EmptyState icon={Heart} title="Log in to see your favorites" subtitle="Save products and shops you love — they'll show up here." action={<Button onClick={() => go("login")}>Log in</Button>} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Favorites</h1>
      <div className="flex gap-1 bg-white rounded-full border border-gray-100 p-1 w-fit mb-6">
        {[{ k: "products", l: "Products" }, { k: "shops", l: "Shops" }].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            style={tab === t.k ? { backgroundColor: COLORS.primary, color: "white" } : { color: "#6B7280" }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}
      {status === "error" && <ErrorState message="Couldn't load your favorites." onRetry={load} />}

      {status === "ready" && tab === "products" && (
        products.length === 0 ? (
          <EmptyState icon={Heart} title="No favorite products yet" subtitle="Tap the heart on any listing to save it here." action={<Button onClick={() => go("home")}>Browse products</Button>} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} go={go} favoriteProductIds={favoriteProductIds} toggleFavorite={toggleFavorite} />
            ))}
          </div>
        )
      )}

      {status === "ready" && tab === "shops" && (
        sellers.length === 0 ? (
          <EmptyState icon={Store} title="No favorite shops yet" subtitle="Follow shops you trust to find them quickly next time." action={<Button onClick={() => go("home")}>Explore shops</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sellers.map((s) => (
              <button key={s.id} onClick={() => go("shop", { username: s.username })} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md">
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                  {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={20} className="text-gray-400" />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{s.shop_name || s.username}</p>
                  <p className="text-xs text-gray-400">@{s.username}</p>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: PROFILE — GET/PUT /users/me
   Stats derived from GET /users/:username/shop (product_count)
   and GET /favorites/products (pagination.total) — there is no
   dedicated "my stats" endpoint.
   ------------------------------------------------------------ */
function ProfilePage({ go }) {
  const { user, logout, refresh } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        bio: user.bio || "",
        location: user.location || "",
        whatsapp: user.whatsapp || "",
        shop_name: user.shop_name || "",
      });
      Promise.all([
        api(`/users/${user.username}/shop?limit=1`, { auth: false }).catch(() => null),
        api(`/favorites/products?limit=1`).catch(() => null),
      ]).then(([shopRes, favRes]) => {
        setStats({
          listings: shopRes?.data?.shop?.product_count ?? shopRes?.data?.pagination?.total ?? null,
          favorites: favRes?.data ? favRes.pagination?.total ?? favRes.data.length : null,
        });
      });
    }
  }, [user]);

  if (!user) {
    return <EmptyState icon={User} title="Log in to view your profile" action={<Button onClick={() => go("login")}>Log in</Button>} />;
  }

  const save = async () => {
    setSaving(true);
    try {
      await api("/users/me", { method: "PUT", body: form });
      await refresh();
      toast.push("Profile updated", "success");
      setEditing(false);
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={30} className="text-gray-400" />}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
            <p className="text-sm text-gray-400">@{user.username}</p>
          </div>
          {!editing && (
            <Button variant="outline" className="!bg-white !py-2" onClick={() => setEditing(true)}>
              <Edit2 size={14} /> Edit
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[{ l: "Listings", v: stats.listings }, { l: "Favorites", v: stats.favorites }].map((s) => (
              <div key={s.l} className="text-center bg-gray-50 rounded-xl py-3">
                <p className="font-bold text-lg" style={{ color: COLORS.primary }}>{s.v ?? "—"}</p>
                <p className="text-xs text-gray-500">{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {editing ? (
          <div className="mt-6 space-y-4">
            <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            <Input label="Shop name" value={form.shop_name} onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))} />
            <TextArea label="Bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            <Input label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            <Input label="WhatsApp number" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 !bg-white" onClick={() => setEditing(false)}>Cancel</Button>
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-sm">
            {user.bio && <p className="text-gray-600">{user.bio}</p>}
            <div className="flex flex-wrap gap-4 text-gray-500">
              {user.location && <span className="flex items-center gap-1"><MapPin size={14} /> {user.location}</span>}
              {user.whatsapp && <span className="flex items-center gap-1"><Phone size={14} /> {user.whatsapp}</span>}
              {user.shop_name && <span className="flex items-center gap-1"><Store size={14} /> {user.shop_name}</span>}
            </div>
            <div className="flex gap-3 pt-3">
              <Button variant="outline" className="!bg-white" onClick={() => go("shop", { username: user.username })}>View my shop</Button>
              <button onClick={() => { logout(); go("home"); }} className="inline-flex items-center gap-2 text-red-500 font-semibold text-sm px-4">
                <LogOut size={15} /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: ADVERTISE — GET /advertisements/pricing, POST /advertisements,
   then POST /advertisements/:id/pay to get the Paystack authorization_url.
   ------------------------------------------------------------ */
function AdvertisePage({ go }) {
  const { user } = useAuth();
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [plansStatus, setPlansStatus] = useState("loading");
  const [planId, setPlanId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const loadPricing = useCallback(async () => {
    setPlansStatus("loading");
    try {
      const { data } = await api("/advertisements/pricing", { auth: false });
      setPlans(data || []);
      if (data && data.length) setPlanId(data[0].id);
      setPlansStatus("ready");
    } catch (e) {
      setPlansStatus("error");
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  if (!user) {
    return <EmptyState icon={Megaphone} title="Log in to advertise" subtitle="Promote your listing to more buyers on SHINEX." action={<Button onClick={() => go("login")}>Log in</Button>} />;
  }

  const selectedPlan = plans.find((p) => p.id === planId);

  const submit = async () => {
    if (!title.trim()) {
      toast.push("Add a title for your ad.", "error");
      return;
    }
    if (!image) {
      toast.push("An advertisement image is required.", "error");
      return;
    }
    if (!planId) {
      toast.push("Choose a duration.", "error");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("duration_id", planId);
      fd.append("image", image.file);
      const created = await api("/advertisements", { method: "POST", body: fd, formData: true });
      const adId = created.data.advertisement.id;
      const payment = await api(`/advertisements/${adId}/pay`, { method: "POST" });
      if (payment.data?.authorization_url) {
        toast.push("Redirecting to Paystack...", "info");
        window.location.href = payment.data.authorization_url;
      } else {
        toast.push("Advertisement created — awaiting payment confirmation.", "success");
        go("home");
      }
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Advertise on SHINEX</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Get your listing seen by more buyers with a featured spot on the home page.</p>

      {plansStatus === "loading" && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      )}
      {plansStatus === "error" && <ErrorState message="Couldn't load advertising plans." onRetry={loadPricing} />}
      {plansStatus === "ready" && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className="rounded-2xl border-2 p-4 text-left transition-colors bg-white"
              style={{ borderColor: planId === p.id ? COLORS.primary : "#E5E7EB" }}
            >
              <p className="font-semibold text-gray-800">{p.duration_days} Day{p.duration_days > 1 ? "s" : ""}</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: COLORS.secondary }}>{money(p.price)}</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <Input label="Ad title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend discount on all shoes" />
        <TextArea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you promoting?" />
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Ad image</span>
          {image ? (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-100">
              <img src={image.url} className="w-full h-full object-cover" alt="" />
              <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                <X size={13} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#5B3FC6] hover:text-[#5B3FC6]"
            >
              <Camera size={22} /> <span className="text-xs">Upload image</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && setImage({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) })} />
        </div>

        {selectedPlan && (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600">Total for {selectedPlan.duration_days} day{selectedPlan.duration_days > 1 ? "s" : ""}</span>
            <span className="font-bold" style={{ color: COLORS.primary }}>{money(selectedPlan.price)}</span>
          </div>
        )}

        <Button variant="secondary" className="w-full !py-3" onClick={submit} disabled={loading || !selectedPlan}>
          {loading ? "Processing..." : selectedPlan ? `Pay with Paystack — ${money(selectedPlan.price)}` : "Pay with Paystack"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE: CONTACT / ABOUT / PRIVACY / TERMS
   POST /contact requires name, email, subject, message (10+ chars)
   ------------------------------------------------------------ */
function ContactPage() {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || form.message.trim().length < 10) {
      toast.push("Please fill in every field (message needs at least 10 characters).", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/contact", { method: "POST", body: form, auth: false });
      toast.push("Message sent — we'll get back to you soon.", "success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Contact us</h1>
      <p className="text-gray-500 mt-2 max-w-lg">Questions, feedback, or a listing issue — reach out and our team will respond within one business day.</p>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-4">
          {[
            { icon: Mail, label: "Email", value: "shinexlearning@gmail.com" },
            { icon: Phone, label: "Phone", value: "+234 706 757 4479" },
            { icon: MessageCircle, label: "WhatsApp", value: "+234 802 505 2852" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS.primary}14` }}>
                <c.icon size={18} style={{ color: COLORS.primary }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="font-medium text-sm text-gray-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
          <Input label="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="What's this about?" />
          <TextArea label="Message" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="How can we help?" />
          <Button className="w-full !py-3" disabled={loading}>{loading ? "Sending..." : "Send message"}</Button>
        </form>
      </div>
    </div>
  );
}

function AboutPage() {
  const values = [
    { title: "Trust first", text: "Every seller and listing is held to clear community standards, so buyers can shop with confidence." },
    { title: "Local by design", text: "SHINEX connects people in the same neighbourhoods, keeping deals fast and face-to-face." },
    { title: "Fair pricing", text: "Straightforward advertising and no hidden fees for sellers just starting out." },
  ];
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">About SHINEX Marketplace</h1>
      <p className="text-gray-600 mt-4 leading-relaxed max-w-2xl">
        SHINEX Marketplace exists to make buying and selling within your community simple, safe, and human. We started with a
        simple belief: the best marketplaces are the ones where neighbours can find what they need from people they can trust.
      </p>
      <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-lg text-gray-800">Our mission</h2>
        <p className="text-gray-600 mt-2 leading-relaxed">
          To give every seller — from a first-time student vendor to an established shop owner — a simple, fair place to reach
          buyers nearby, without complicated fees or confusing tools.
        </p>
      </div>
      <h2 className="font-bold text-lg text-gray-800 mt-8 mb-4">What we value</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {values.map((v) => (
          <div key={v.title} className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800">{v.title}</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{v.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegalPage({ title, sections }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-400 mt-2">Last updated: January 2026</p>
      <div className="mt-6 space-y-6">
        {sections.map((s) => (
          <div key={s.heading}>
            <h2 className="font-semibold text-gray-800 mb-2">{s.heading}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { heading: "Information we collect", text: "We collect the information you provide when creating an account, such as your name, email, phone number, and listing details, along with basic usage data to keep the platform secure." },
        { heading: "How we use your information", text: "Your information is used to operate your account, connect you with buyers and sellers, process advertisement payments, and improve the marketplace experience." },
        { heading: "Sharing your information", text: "We only share the contact details you choose to make public on your profile (such as your WhatsApp number) with buyers who view your shop. We do not sell your data to third parties." },
        { heading: "Your choices", text: "You can update or delete your profile information at any time from your account settings, or contact our support team for help." },
      ]}
    />
  );
}

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        { heading: "Using SHINEX", text: "By creating an account, you agree to list only items you're authorized to sell and to represent them accurately, including condition, price, and location." },
        { heading: "Prohibited listings", text: "Illegal goods, counterfeit items, and content that violates the law or infringes on others' rights are not permitted and will be removed." },
        { heading: "Payments and advertising", text: "Advertisement fees are processed securely through Paystack. Fees are non-refundable once an ad has started running." },
        { heading: "Account suspension", text: "SHINEX may suspend or remove accounts that violate these terms, receive repeated valid reports, or engage in fraudulent activity." },
      ]}
    />
  );
}

/* ------------------------------------------------------------
   ADMIN DASHBOARD
   ------------------------------------------------------------ */
const ADMIN_SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "advertisements", label: "Advertisements", icon: Megaphone },
  { key: "durations", label: "Ad Pricing", icon: CreditCard },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "reports", label: "Reports", icon: Flag },
  { key: "contact", label: "Contact", icon: Mail },
];

function AdminDashboard({ go }) {
  const { user } = useAuth();
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <EmptyState icon={LayoutDashboard} title="Log in required" action={<Button onClick={() => go("login")}>Log in</Button>} />;
  }
  if (!user.is_admin) {
    return <EmptyState icon={AlertCircle} title="Admins only" subtitle="You don't have permission to view this page." action={<Button onClick={() => go("home")}>Back home</Button>} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
      <button className="md:hidden fixed bottom-24 right-5 z-30 bg-white rounded-full p-3 shadow-lg border" onClick={() => setSidebarOpen(true)}>
        <Menu size={20} style={{ color: COLORS.primary }} />
      </button>

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 p-4 transform transition-transform md:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center justify-between mb-6">
          <Logo size={26} />
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="space-y-1">
          {ADMIN_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setSection(s.key); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={section === s.key ? { backgroundColor: `${COLORS.primary}14`, color: COLORS.primary } : { color: "#4B5563" }}
            >
              <s.icon size={17} /> {s.label}
            </button>
          ))}
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 min-w-0">
        {section === "overview" && <AdminOverview />}
        {section === "users" && <AdminUsersTable />}
        {section === "products" && <AdminTable resource="products" columns={["name", "price", "user", "category", "is_sold", "created_at"]} title="Products" searchable deletable />}
        {section === "categories" && <AdminCategories />}
        {section === "advertisements" && <AdminAdsTable />}
        {section === "durations" && <AdminDurations />}
        {section === "payments" && <AdminTable resource="payments" columns={["paystack_reference", "amount", "status", "user", "created_at"]} title="Payments" searchable />}
        {section === "reports" && <AdminReportsTable />}
        {section === "contact" && <AdminTable resource="contact" columns={["name", "email", "subject", "status", "created_at"]} title="Contact messages" searchable deletable />}
      </main>
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [usersRes, productsRes, adsRes, reportsRes, paymentsRes] = await Promise.all([
        api("/admin/users?limit=1"),
        api("/admin/products?limit=1"),
        api("/admin/advertisements?approval=pending&limit=1"),
        api("/admin/reports?status=pending&limit=1"),
        api("/admin/payments/stats"),
      ]);
      setStats({
        users: usersRes.pagination?.total ?? usersRes.data?.length ?? 0,
        products: productsRes.pagination?.total ?? productsRes.data?.length ?? 0,
        pendingAds: adsRes.pagination?.total ?? adsRes.data?.length ?? 0,
        pendingReports: reportsRes.pagination?.total ?? reportsRes.data?.length ?? 0,
        revenue: paymentsRes.data?.total_revenue ?? 0,
        transactions: paymentsRes.data?.total_transactions ?? 0,
      });
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (status === "loading") return <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (status === "error") return <ErrorState message="Couldn't load dashboard stats." onRetry={load} />;

  const cards = [
    { label: "Total users", value: stats.users, icon: Users },
    { label: "Total products", value: stats.products, icon: Package },
    { label: "Pending ads", value: stats.pendingAds, icon: Megaphone },
    { label: "Pending reports", value: stats.pendingReports, icon: Flag },
    { label: "Total revenue", value: money(stats.revenue), icon: CreditCard },
    { label: "Transactions", value: stats.transactions, icon: CreditCard },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${COLORS.primary}14` }}>
              <c.icon size={17} style={{ color: COLORS.primary }} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{c.value ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCell(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return value.name || value.username || value.title || JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/* Generic admin table for resources with simple GET (list) + optional DELETE */
function AdminTable({ resource, columns, title, searchable, deletable, renderActions }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) q.set("search", search);
      const { data } = await api(`/admin/${resource}?${q.toString()}`);
      setRows(data || []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, [resource, page, search]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!window.confirm("Delete this permanently?")) return;
    try {
      await api(`/admin/${resource}/${id}`, { method: "DELETE" });
      toast.push("Removed", "success");
      load();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {searchable && (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="rounded-full border border-gray-200 pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {status === "loading" && <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>}
        {status === "error" && <ErrorState message={`Couldn't load ${title.toLowerCase()}.`} onRetry={load} />}
        {status === "ready" && rows.length === 0 && <EmptyState icon={Package} title={`No ${title.toLowerCase()} found`} subtitle="Try a different search, or check back later." />}
        {status === "ready" && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-400">
                  {columns.map((c) => <th key={c} className="px-4 py-3 font-medium capitalize whitespace-nowrap">{c.replace(/_/g, " ")}</th>)}
                  {(deletable || renderActions) && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    {columns.map((c) => (
                      <td key={c} className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[220px] truncate">
                        {c === "price" || c === "amount" ? money(r[c]) : renderCell(r[c])}
                      </td>
                    ))}
                    {(deletable || renderActions) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center gap-2 justify-end">
                          {renderActions && renderActions(r, load)}
                          {deletable && (
                            <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {status === "ready" && rows.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex items-center gap-1 text-sm font-medium disabled:opacity-40" style={{ color: COLORS.primary }}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <button disabled={rows.length < pageSize} onClick={() => setPage((p) => p + 1)} className="flex items-center gap-1 text-sm font-medium disabled:opacity-40" style={{ color: COLORS.primary }}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* Users: PATCH /admin/users/:id/suspend|unsuspend, DELETE /admin/users/:id */
function AdminUsersTable() {
  const toast = useToast();
  const suspendUser = async (id, suspend, reload) => {
    try {
      if (suspend) {
        const reason = window.prompt("Reason for suspension (optional):") || "";
        await api(`/admin/users/${id}/suspend`, { method: "PATCH", body: { reason } });
      } else {
        await api(`/admin/users/${id}/unsuspend`, { method: "PATCH" });
      }
      toast.push(suspend ? "User suspended" : "User unsuspended", "success");
      reload();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  return (
    <AdminTable
      resource="users"
      columns={["username", "full_name", "email", "phone", "is_suspended", "created_at"]}
      title="Users"
      searchable
      deletable
      renderActions={(r, reload) => (
        <button
          onClick={() => suspendUser(r.id, !r.is_suspended, reload)}
          className="text-xs font-semibold px-2 py-1 rounded-md border"
          style={r.is_suspended ? { color: COLORS.secondary, borderColor: COLORS.secondary } : { color: "#B45309", borderColor: "#FCD34D" }}
        >
          {r.is_suspended ? "Unsuspend" : "Suspend"}
        </button>
      )}
    />
  );
}

/* Reports: PATCH /admin/reports/:id/resolve|dismiss — no delete endpoint */
function AdminReportsTable() {
  const toast = useToast();
  const act = async (id, action, reload) => {
    try {
      const admin_notes = window.prompt(`Notes for this ${action} (optional):`) || "";
      await api(`/admin/reports/${id}/${action}`, { method: "PATCH", body: { admin_notes } });
      toast.push(action === "resolve" ? "Report resolved" : "Report dismissed", "success");
      reload();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  return (
    <AdminTable
      resource="reports"
      columns={["reason", "status", "reporter", "target_product", "created_at"]}
      title="Reports"
      searchable={false}
      renderActions={(r, reload) =>
        r.status === "pending" && (
          <div className="flex gap-1.5">
            <button onClick={() => act(r.id, "resolve", reload)} className="text-xs font-semibold px-2 py-1 rounded-md border" style={{ color: COLORS.secondary, borderColor: COLORS.secondary }}>
              Resolve
            </button>
            <button onClick={() => act(r.id, "dismiss", reload)} className="text-xs font-semibold px-2 py-1 rounded-md border text-gray-500 border-gray-300">
              Dismiss
            </button>
          </div>
        )
      }
    />
  );
}

/* Advertisements: PATCH approve/reject/pause, DELETE */
function AdminAdsTable() {
  const toast = useToast();
  const act = async (id, action, reload) => {
    try {
      if (action === "reject") {
        const reason = window.prompt("Reason for rejection:");
        if (!reason) return;
        await api(`/admin/advertisements/${id}/reject`, { method: "PATCH", body: { reason } });
      } else {
        await api(`/admin/advertisements/${id}/${action}`, { method: "PATCH" });
      }
      toast.push(`Advertisement ${action}d`, "success");
      reload();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  return (
    <AdminTable
      resource="advertisements"
      columns={["title", "user", "payment_status", "approval_status", "created_at"]}
      title="Advertisements"
      searchable
      deletable
      renderActions={(r, reload) => (
        <div className="flex gap-1.5">
          {r.approval_status === "pending" && (
            <>
              <button onClick={() => act(r.id, "approve", reload)} className="p-1 rounded-md border text-white" style={{ backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }} title="Approve">
                <Check size={13} />
              </button>
              <button onClick={() => act(r.id, "reject", reload)} className="p-1 rounded-md border text-red-500 border-red-200" title="Reject">
                <Ban size={13} />
              </button>
            </>
          )}
          {r.approval_status === "approved" && (
            <button onClick={() => act(r.id, "pause", reload)} className="p-1 rounded-md border text-amber-600 border-amber-200" title="Pause">
              <Pause size={13} />
            </button>
          )}
        </div>
      )}
    />
  );
}

function AdminCategories() {
  const toast = useToast();
  const { reload: reloadGlobalCategories } = useCategories();
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [newCat, setNewCat] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await api("/admin/categories");
      setCategories(data || []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newCat.trim()) return;
    try {
      await api("/admin/categories", { method: "POST", body: { name: newCat } });
      setNewCat("");
      toast.push("Category added", "success");
      load();
      reloadGlobalCategories();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api(`/admin/categories/${id}`, { method: "DELETE" });
      toast.push("Category removed", "success");
      load();
      reloadGlobalCategories();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Categories</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex gap-3">
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20"
        />
        <Button onClick={add}><Plus size={16} /> Add</Button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-2">
        {status === "loading" && <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>}
        {status === "error" && <ErrorState message="Couldn't load categories." onRetry={load} />}
        {status === "ready" && categories.length === 0 && <EmptyState icon={Tag} title="No categories yet" />}
        {status === "ready" && categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-700">{c.icon ? `${c.icon} ` : ""}{c.name}</span>
            <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Ad pricing == /admin/durations (duration_days, price, is_active). Edited per-row (no bulk update endpoint). */
function AdminDurations() {
  const toast = useToast();
  const [durations, setDurations] = useState([]);
  const [status, setStatus] = useState("loading");
  const [savingId, setSavingId] = useState(null);
  const [newDuration, setNewDuration] = useState({ duration_days: "", price: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await api("/admin/durations");
      setDurations(data || []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (id, field, value) =>
    setDurations((ds) => ds.map((d) => (d.id === id ? { ...d, [field]: value } : d)));

  const save = async (d) => {
    setSavingId(d.id);
    try {
      await api(`/admin/durations/${d.id}`, {
        method: "PUT",
        body: { duration_days: Number(d.duration_days), price: Number(d.price), is_active: d.is_active },
      });
      toast.push("Duration updated", "success");
      load();
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this duration plan?")) return;
    try {
      await api(`/admin/durations/${id}`, { method: "DELETE" });
      toast.push("Duration removed", "success");
      load();
    } catch (e) {
      toast.push(e.message, "error");
    }
  };

  const create = async () => {
    if (!newDuration.duration_days || !newDuration.price) {
      toast.push("Enter both duration and price.", "error");
      return;
    }
    setCreating(true);
    try {
      await api("/admin/durations", {
        method: "POST",
        body: { duration_days: Number(newDuration.duration_days), price: Number(newDuration.price), is_active: true },
      });
      setNewDuration({ duration_days: "", price: "" });
      toast.push("Duration created", "success");
      load();
    } catch (e) {
      toast.push(e.message, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Ad Pricing</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex flex-wrap items-end gap-3">
        <div className="w-28">
          <span className="block text-xs font-medium text-gray-500 mb-1">Days</span>
          <input type="number" value={newDuration.duration_days} onChange={(e) => setNewDuration((d) => ({ ...d, duration_days: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20" />
        </div>
        <div className="w-32">
          <span className="block text-xs font-medium text-gray-500 mb-1">Price (₦)</span>
          <input type="number" value={newDuration.price} onChange={(e) => setNewDuration((d) => ({ ...d, price: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20" />
        </div>
        <Button onClick={create} disabled={creating}><Plus size={16} /> {creating ? "Adding..." : "Add plan"}</Button>
      </div>

      {status === "loading" ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : status === "error" ? (
        <ErrorState message="Couldn't load ad pricing." onRetry={load} />
      ) : durations.length === 0 ? (
        <EmptyState icon={CreditCard} title="No duration plans yet" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          {durations.map((d) => (
            <div key={d.id} className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <input type="number" value={d.duration_days} onChange={(e) => updateField(d.id, "duration_days", e.target.value)} className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20" />
                <span className="text-xs text-gray-500">days</span>
              </div>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                <input type="number" value={d.price} onChange={(e) => updateField(d.id, "price", e.target.value)} className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#5B3FC6]/20" />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <input type="checkbox" checked={!!d.is_active} onChange={(e) => updateField(d.id, "is_active", e.target.checked)} /> Active
              </label>
              <Button onClick={() => save(d)} disabled={savingId === d.id} className="!py-1.5 !px-3 ml-auto">
                {savingId === d.id ? "Saving..." : "Save"}
              </Button>
              <button onClick={() => remove(d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   APP ROOT
   ------------------------------------------------------------ */
function AppShell() {
  const [nav, setNav] = useState({ page: "home", params: {} });
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [favoriteProductIds, setFavoriteProductIds] = useState(new Set());
  const [favoriteSellerIds, setFavoriteSellerIds] = useState(new Set());
  const { user } = useAuth();
  const toast = useToast();

  const go = (page, params = {}) => {
    setNav({ page, params });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  };

  const loadFavoriteIds = useCallback(async () => {
    if (!user) {
      setFavoriteProductIds(new Set());
      setFavoriteSellerIds(new Set());
      return;
    }
    try {
      const [prodRes, sellerRes] = await Promise.all([api("/favorites/products"), api("/favorites/sellers")]);
      setFavoriteProductIds(new Set((prodRes.data || []).map((f) => f.product?.id).filter(Boolean)));
      setFavoriteSellerIds(new Set((sellerRes.data || []).map((f) => f.seller?.id).filter(Boolean)));
    } catch (e) {
      // silent — favorites are non-critical to first paint
    }
  }, [user]);

  useEffect(() => {
    loadFavoriteIds();
  }, [loadFavoriteIds]);

  const toggleFavorite = async (id, type) => {
    if (!user) return go("login");
    const setState = type === "product" ? setFavoriteProductIds : setFavoriteSellerIds;
    const currentSet = type === "product" ? favoriteProductIds : favoriteSellerIds;
    const isFav = currentSet.has(id);
    setState((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(id) : next.add(id);
      return next;
    });
    const endpoint = type === "product" ? `/favorites/product/${id}` : `/favorites/seller/${id}`;
    try {
      await api(endpoint, { method: isFav ? "DELETE" : "POST" });
      toast.push(isFav ? "Removed from favorites" : "Added to favorites", "success");
    } catch (e) {
      setState((prev) => {
        const next = new Set(prev);
        isFav ? next.add(id) : next.delete(id);
        return next;
      });
      toast.push(e.message, "error");
    }
  };

  const onSearchSubmit = () => {
    setActiveSearch(query);
    go("home");
  };

  let content;
  switch (nav.page) {
    case "home": content = <HomePage go={go} search={activeSearch} favoriteProductIds={favoriteProductIds} toggleFavorite={toggleFavorite} />; break;
    case "product": content = <ProductDetailPage params={nav.params} go={go} favoriteProductIds={favoriteProductIds} toggleFavorite={toggleFavorite} />; break;
    case "shop": content = <ShopPage params={nav.params} go={go} favoriteSellerIds={favoriteSellerIds} toggleFavorite={toggleFavorite} />; break;
    case "register": content = <RegisterPage go={go} />; break;
    case "login": content = <LoginPage go={go} />; break;
    case "forgot": content = <ForgotPasswordPage go={go} />; break;
    case "sell": content = <SellPage go={go} />; break;
    case "favorites": content = <FavoritesPage go={go} favoriteProductIds={favoriteProductIds} favoriteSellerIds={favoriteSellerIds} toggleFavorite={toggleFavorite} />; break;
    case "profile": content = <ProfilePage go={go} />; break;
    case "advertise": content = <AdvertisePage go={go} />; break;
    case "admin": content = <AdminDashboard go={go} />; break;
    case "contact": content = <ContactPage />; break;
    case "about": content = <AboutPage />; break;
    case "privacy": content = <PrivacyPage />; break;
    case "terms": content = <TermsPage />; break;
    default: content = <HomePage go={go} search={activeSearch} favoriteProductIds={favoriteProductIds} toggleFavorite={toggleFavorite} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadein { from { opacity: 0; transform: translateY(-6px);} to { opacity:1; transform:none; } }
        select:focus { outline: none; }
      `}</style>
      <Header nav={nav} go={go} query={query} setQuery={setQuery} onSearchSubmit={onSearchSubmit} />
      <main className="flex-1">{content}</main>
      <Footer go={go} />
      <BottomNav nav={nav} go={go} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CategoriesProvider>
          <AppShell />
        </CategoriesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
