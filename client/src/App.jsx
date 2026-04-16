import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { ReferenceExchangePanel } from "./components/ReferenceExchangePanel";

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");
/** Production builds need VITE_API_BASE — there is no /api proxy on Vercel like in local Vite dev. */
const MISSING_VITE_API_BASE = import.meta.env.PROD && !String(import.meta.env.VITE_API_BASE ?? "").trim();

const GUEST_CART_KEY = "guest_cart_items_v1";
const CATEGORY_OPTIONS = ["Backpack Charm", "Home Decor", "Blind Box Figurines", "Plush Toy"];

// Clearer copy when the API rejects auth (cookie/JWT).
function formatApiAuthError(message) {
  if (message === "Unauthorized") {
    return "Unauthorized: no valid API session cookie (or token expired). Try Log out, then log in again and retry.";
  }
  if (message === "Forbidden") {
    return "Forbidden: this account is not an admin.";
  }
  return message;
}

// Unified request helper: always include cookies for token-cookie authentication.
function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: isFormData ? { ...(options.headers || {}) } : { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
}

// Parse API responses defensively so empty/non-JSON payloads don't crash UI flows.
async function readJsonSafe(response) {
  if (typeof response?.text !== "function") {
    if (typeof response?.json === "function") return await response.json();
    return {};
  }
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`API returned non-JSON response (${response.status}).`);
  }
}

function applyBackgroundUrl(backgroundUrl) {
  if (backgroundUrl) {
    document.documentElement.style.setProperty("--shop-bg-image", `url("${backgroundUrl}")`);
  } else {
    document.documentElement.style.removeProperty("--shop-bg-image");
  }
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl || !imageUrl.trim()) return "/images/placeholder-capybara.svg";
  return imageUrl;
}

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function DeployMissingApiBanner() {
  if (!MISSING_VITE_API_BASE) return null;
  return (
    <section className="card" style={{ borderLeft: "4px solid var(--error)" }} role="alert">
      <p style={{ margin: 0 }}>
        <strong>Backend URL not configured for production:</strong> add{" "}
        <code style={{ fontSize: "0.95em" }}>VITE_API_BASE</code> in Vercel (e.g.{" "}
        <code style={{ fontSize: "0.95em" }}>https://your-api.onrender.com/api</code>
        ), save, then <strong>Redeploy</strong>. Without it, this site only requests <code>/api</code> on Vercel, not your Render API.
      </p>
    </section>
  );
}

// Theme switcher that persists user preference and updates the root theme attribute.
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button className="btn secondary" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}

// Global header with navigation links, auth actions, and theme toggle.
function Header({ user, setUser }) {
  async function onLogout() {
    await request("/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <header className="header">
      <div className="header-main">
        <h1>Capybara Comfort Shop</h1>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/products">Product Categories</Link>
          <Link to="/cart">Cart</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">Who We Are</Link>
          <Link to="/login">{user ? "Account" : "Login"}</Link>
          {user?.role === "admin" && <Link to="/products/new">Admin: Add Product</Link>}
          {user?.role === "admin" && <Link to="/admin/settings">Admin: Settings</Link>}
          {!user ? (
            <span className="badge">Guest</span>
          ) : (
            <button className="btn link" onClick={onLogout}>
              Logout ({user.role})
            </button>
          )}
        </nav>
      </div>
      <div className="header-actions">
        <ThemeToggle />
      </div>
    </header>
  );
}

// Public landing page with admin-curated popular products (see Admin Settings).
export function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await request("/settings/popular-products");
        const data = await readJsonSafe(response);
        if (!cancelled && response.ok) setItems(data.products || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card">
      <h2>Welcome</h2>
      <p>Capybara Comfort Shop is a cozy mini e-commerce website for capybara-themed products.</p>
      <p>Browse categories, explore products, and sign in to unlock account-specific features.</p>
      <div className="row">
        <Link className="btn" to="/login">
          Login
        </Link>
        <Link className="btn secondary" to="/register">
          Register
        </Link>
        <Link className="btn secondary" to="/products">
          Browse products
        </Link>
      </div>
      <h3 style={{ marginTop: "1.5rem" }}>Popular items</h3>
      {loading ? (
        <p>Loading popular items…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No popular items yet. Admins can choose them under Admin Settings.</p>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <Link key={item.id} to={`/products/${item.id}`} className="product" style={{ textDecoration: "none", color: "inherit" }}>
              <img
                src={resolveImageUrl(item.imageUrl)}
                alt={item.title}
                style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "8px" }}
                onError={(e) => {
                  e.target.src = "/images/placeholder-capybara.svg";
                }}
              />
              <h3>{item.title}</h3>
              <p>Category: {item.category}</p>
              <p>${Number(item.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// Public company-introduction page used for storefront branding.
function AboutPage() {
  return (
    <section className="card">
      <h2>Who We Are</h2>
      <p>We are a small capybara-loving team building fun, cute, and comforting products.</p>
      <p>Our goal is to make an approachable shopping experience for all users.</p>
      <ReferenceExchangePanel />
    </section>
  );
}

// Registration page with client-side validation before calling /api/register.
function RegisterPage({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  // Keep validation logic close to this form for instant field-level feedback.
  function validate(next) {
    const current = next || form;
    const e = {};
    if (current.name.trim().length < 2) e.name = "Name must be at least 2 chars.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) e.email = "Invalid email.";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(current.password)) {
      e.password = "8+ chars with upper/lower/number.";
    }
    return e;
  }

  // Update form state and re-run validation as the user types.
  function onChange(event) {
    const next = { ...form, [event.target.name]: event.target.value };
    setForm(next);
    setErrors(validate(next));
  }

  // Submit valid form data and store authenticated user on success.
  async function onSubmit(event) {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setServerError("");
    const response = await request("/register", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setServerError(data.error || "Register failed.");
      return;
    }
    const meRes = await request("/me");
    const meData = await meRes.json();
    if (!meRes.ok) {
      setServerError(
        "Account created, but your browser did not keep the session cookie. Log out of any old sessions, try another browser, or allow cookies for the API host — admin actions require that cookie."
      );
      return;
    }
    setUser(meData.user);
    navigate("/products");
  }

  return (
    <section className="card">
      <h2>Register</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={onChange} />
          {errors.name && <small className="error">{errors.name}</small>}
        </label>
        <label>
          Email
          <input name="email" value={form.email} onChange={onChange} />
          {errors.email && <small className="error">{errors.email}</small>}
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={onChange} />
          {errors.password && <small className="error">{errors.password}</small>}
        </label>
        {serverError && <p className="error">{serverError}</p>}
        <button className="btn" type="submit">
          Create Account
        </button>
      </form>
    </section>
  );
}

// Login page that authenticates via /api/login and stores user data in state.
function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const response = await request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Login failed.");
      return;
    }
    const meRes = await request("/me");
    const meData = await meRes.json();
    if (!meRes.ok) {
      setError(
        "Password accepted, but your browser did not save the session cookie. Admin upload and other protected APIs need it. Try Safari/Firefox, a private window, or reduce third‑party cookie blocking for this site."
      );
      return;
    }
    setUser(meData.user);
    navigate("/products");
  }

  return (
    <section className="card">
      <h2>Login</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          Login
        </button>
      </form>
    </section>
  );
}

// Combined authentication page with login/register tab switching.
function AuthPage({ setUser, initialTab = "login" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const isLoginTab = activeTab === "login";

  return (
    <section className="card">
      <h2>Account Access</h2>
      <p className="switch-auth">
        {isLoginTab ? "New here?" : "Already have an account?"}{" "}
        <button
          className="btn link"
          onClick={() => setActiveTab(isLoginTab ? "register" : "login")}
        >
          {isLoginTab ? "Create an account" : "Back to login"}
        </button>
      </p>
      <div className="auth-panel">
        {isLoginTab ? (
          <LoginPage setUser={setUser} />
        ) : (
          <RegisterPage setUser={setUser} />
        )}
      </div>
    </section>
  );
}

function buildProductsQuery({ limit, offset, search, category, minPrice, maxPrice }) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const minN = minPrice === "" ? NaN : Number(minPrice);
  const maxN = maxPrice === "" ? NaN : Number(maxPrice);
  if (Number.isFinite(minN) && minN > 0) params.set("minPrice", String(minN));
  if (Number.isFinite(maxN) && maxN > 0) params.set("maxPrice", String(maxN));
  return params.toString();
}

// Product list: debounced search, category and price filters, pagination.
export function ProductsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const limit = 6;

  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, category, minPrice, maxPrice]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const qs = buildProductsQuery({
          limit,
          offset,
          search: debouncedSearch,
          category,
          minPrice,
          maxPrice,
        });
        const response = await request(`/products?${qs}`);
        const data = await readJsonSafe(response);
        if (!response.ok) throw new Error(data.error || "Failed to fetch products.");
        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Something went wrong.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [offset, debouncedSearch, category, minPrice, maxPrice, reloadKey]);

  function retry() {
    setReloadKey((k) => k + 1);
  }

  if (isLoading) return <section className="card">Loading products...</section>;
  if (error) {
    return (
      <section className="card">
        <p className="error">{error}</p>
        <button className="btn" type="button" onClick={retry}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Products</h2>
      <div className="form" style={{ marginBottom: "1rem" }}>
        <label>
          Search (debounced 300ms)
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or description"
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <label style={{ flex: "1 1 120px" }}>
            Min price
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="optional"
            />
          </label>
          <label style={{ flex: "1 1 120px" }}>
            Max price
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
      </div>
      {items.length === 0 ? (
        <p>No products match your filters.</p>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/products/${item.id}`}
              className="product"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <img
                src={resolveImageUrl(item.imageUrl)}
                alt={item.title}
                style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "8px" }}
                onError={(e) => {
                  e.target.src = "/images/placeholder-capybara.svg";
                }}
              />
              <h3>{item.title}</h3>
              <p>Category: {item.category}</p>
              <p>${Number(item.price).toFixed(2)}</p>
              <p>Stock: {item.stock}</p>
            </Link>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn secondary" disabled={!hasPrevious} type="button" onClick={() => setOffset((v) => Math.max(0, v - limit))}>
          Previous
        </button>
        <span>
          Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + limit, total)} of {total}
        </span>
        <button className="btn secondary" disabled={!hasNext} type="button" onClick={() => setOffset((v) => v + limit)}>
          Next
        </button>
      </div>
    </section>
  );
}

function ProductDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [cartMsg, setCartMsg] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewComment, setEditReviewComment] = useState("");

  function renderStarPicker(value, onChange, namePrefix) {
    return (
      <div className="row" style={{ marginTop: 0, justifyContent: "flex-start", gap: "6px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={`${namePrefix}-${star}`}
            type="button"
            className="btn link"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange(star)}
            style={{
              fontSize: "1.2rem",
              lineHeight: 1,
              color: star <= value ? "#f59e0b" : "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            {star <= value ? "★" : "☆"}
          </button>
        ))}
      </div>
    );
  }
  const [isSavingReviewEdit, setIsSavingReviewEdit] = useState(false);
  const [adminDeleteError, setAdminDeleteError] = useState("");
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    imageUrl: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [pRes, rRes] = await Promise.all([
          request(`/products/${id}`),
          request(`/products/${id}/reviews`),
        ]);
        const pData = await pRes.json();
        const rData = await rRes.json();
        if (!pRes.ok) throw new Error(pData.error || "Product not found.");
        if (!cancelled) {
          setProduct(pData.product);
          setReviews(rData.reviews || []);
          setEditForm({
            title: pData.product.title || "",
            category: pData.product.category || "",
            price: String(pData.product.price ?? ""),
            stock: String(pData.product.stock ?? ""),
            description: pData.product.description || "",
            imageUrl: pData.product.imageUrl || "",
          });
          setIsEditMode(false);
          setEditError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function addToCart() {
    setCartMsg("");
    if (!user) {
      const current = readGuestCart();
      const productId = Number(id);
      const existing = current.find((line) => line.productId === productId);
      const next = existing
        ? current.map((line) =>
            line.productId === productId
              ? { ...line, quantity: Math.min((line.product?.stock ?? 9999), line.quantity + qty) }
              : line
          )
        : [
            ...current,
            {
              id: `guest-${productId}`,
              productId,
              quantity: qty,
              product: {
                id: product.id,
                title: product.title,
                price: product.price,
                stock: product.stock,
                imageUrl: product.imageUrl || "",
              },
            },
          ];
      writeGuestCart(next);
      setCartMsg("Added to guest cart. Register/login at checkout.");
      return;
    }
    const response = await request("/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId: Number(id), quantity: qty }),
    });
    const data = await response.json();
    if (!response.ok) {
      setCartMsg(data.error || "Could not add to cart.");
      return;
    }
    setCartMsg("Added to cart.");
  }

  async function submitReview(event) {
    event.preventDefault();
    setReviewError("");
    if (!user) {
      navigate("/login");
      return;
    }
    const response = await request(`/products/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
    });
    const data = await response.json();
    if (!response.ok) {
      setReviewError(data.error || "Could not save review.");
      return;
    }
    setReviews((prev) => {
      const others = prev.filter((r) => r.userId !== user.id);
      return [data.review, ...others];
    });
    setReviewComment("");
  }

  async function saveReviewEdit(event) {
    event.preventDefault();
    if (!editingReviewId) return;
    setReviewError("");
    setIsSavingReviewEdit(true);
    try {
      const response = await request(`/reviews/${editingReviewId}`, {
        method: "PUT",
        body: JSON.stringify({ rating: editReviewRating, comment: editReviewComment }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReviewError(data.error || "Could not update review.");
        return;
      }
      setReviews((prev) => prev.map((r) => (r.id === editingReviewId ? data.review : r)));
      setEditingReviewId(null);
    } catch {
      setReviewError("Could not update review.");
    } finally {
      setIsSavingReviewEdit(false);
    }
  }

  async function deleteProductAsAdmin() {
    if (!user || user.role !== "admin") return;
    if (!window.confirm("Delete this product from storefront?")) return;

    setAdminDeleteError("");
    setIsDeletingProduct(true);
    try {
      const response = await request(`/products/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setAdminDeleteError(data.error || "Failed to delete product.");
        return;
      }
      navigate("/products");
    } catch {
      setAdminDeleteError("Failed to delete product.");
    } finally {
      setIsDeletingProduct(false);
    }
  }

  async function saveProductEdit(event) {
    event.preventDefault();
    if (!user || user.role !== "admin") return;

    setEditError("");
    setIsSavingEdit(true);
    try {
      const response = await request(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editForm.title,
          category: editForm.category,
          price: Number(editForm.price),
          stock: Number(editForm.stock),
          description: editForm.description,
          imageUrl: editForm.imageUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setEditError(data.error || "Failed to update product.");
        return;
      }
      setProduct(data.product);
      setIsEditMode(false);
    } catch {
      setEditError("Failed to update product.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  if (loading) return <section className="card">Loading product…</section>;
  if (error || !product) {
    return (
      <section className="card">
        <p className="error">{error || "Not found."}</p>
        <Link className="btn" to="/products">
          Back to products
        </Link>
      </section>
    );
  }

  const imgSrc = resolveImageUrl(product.imageUrl);

  return (
    <section className="card">
      <div className="row" style={{ alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>
        <img
          src={imgSrc}
          alt=""
          style={{ maxWidth: "280px", width: "100%", borderRadius: "8px", objectFit: "cover" }}
          onError={(e) => {
            e.target.src = "/images/placeholder-capybara.svg";
          }}
        />
        <div style={{ flex: "1 1 240px" }}>
          {isEditMode ? (
            <form className="form" onSubmit={saveProductEdit}>
              <h2>Edit product</h2>
              <label>
                Title
                <input value={editForm.title} onChange={(e) => setEditForm((v) => ({ ...v, title: e.target.value }))} />
              </label>
              <label>
                Category
                <select value={editForm.category} onChange={(e) => setEditForm((v) => ({ ...v, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Price
                <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm((v) => ({ ...v, price: e.target.value }))} />
              </label>
              <label>
                Stock
                <input type="number" value={editForm.stock} onChange={(e) => setEditForm((v) => ({ ...v, stock: e.target.value }))} />
              </label>
              <label>
                Description
                <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm((v) => ({ ...v, description: e.target.value }))} />
              </label>
              <label>
                Image URL
                <input value={editForm.imageUrl} onChange={(e) => setEditForm((v) => ({ ...v, imageUrl: e.target.value }))} />
              </label>
              {editError && <p className="error">{editError}</p>}
              <div className="row">
                <button className="btn" type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save changes"}
                </button>
                <button className="btn secondary" type="button" onClick={() => setIsEditMode(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2>{product.title}</h2>
              <p>Category: {product.category}</p>
              <p>${Number(product.price).toFixed(2)}</p>
              <p>Stock: {product.stock}</p>
              {product.description && <p>{product.description}</p>}
              <div className="row" style={{ marginTop: "12px" }}>
                <label>
                  Qty
                  <input
                    type="number"
                    min={1}
                    max={product.stock}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))}
                    style={{ width: "72px" }}
                  />
                </label>
                <button className="btn" type="button" onClick={addToCart}>
                  Add to cart
                </button>
                <Link className="btn secondary" to="/cart">
                  View cart
                </Link>
                {user?.role === "admin" && (
                  <>
                    <button className="btn secondary" type="button" onClick={() => setIsEditMode(true)}>
                      Admin: Edit product
                    </button>
                    <button className="btn secondary" type="button" onClick={deleteProductAsAdmin} disabled={isDeletingProduct}>
                      {isDeletingProduct ? "Deleting..." : "Admin: Delete product"}
                    </button>
                  </>
                )}
              </div>
              {cartMsg && <p className={cartMsg.startsWith("Added") ? "" : "error"}>{cartMsg}</p>}
              {adminDeleteError && <p className="error">{adminDeleteError}</p>}
            </>
          )}
        </div>
      </div>

      <h3 style={{ marginTop: "2rem" }}>Reviews</h3>
      {user && user.role !== "admin" && (
        <form className="form" onSubmit={submitReview}>
          <label>
            Rating
            {renderStarPicker(reviewRating, setReviewRating, "new-review-rating")}
          </label>
          <label>
            Comment
            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
          </label>
          {reviewError && <p className="error">{reviewError}</p>}
          <button className="btn" type="submit">
            Submit review
          </button>
        </form>
      )}
      {user?.role === "admin" && <p>Admin can view and edit reviews, but cannot publish new reviews.</p>}
      {!user && <p>Log in to leave a review.</p>}
      {reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {reviews.map((r) => (
            <li key={r.id} className="card" style={{ marginBottom: "8px" }}>
              {editingReviewId === r.id ? (
                <form className="form" onSubmit={saveReviewEdit}>
                  <strong>{r.user?.name || "User"}</strong>
                  <label>
                    Rating
                    {renderStarPicker(editReviewRating, setEditReviewRating, `edit-review-${r.id}`)}
                  </label>
                  <label>
                    Comment
                    <textarea value={editReviewComment} rows={3} onChange={(e) => setEditReviewComment(e.target.value)} />
                  </label>
                  <div className="row">
                    <button className="btn" type="submit" disabled={isSavingReviewEdit}>
                      {isSavingReviewEdit ? "Saving..." : "Save review"}
                    </button>
                    <button className="btn secondary" type="button" onClick={() => setEditingReviewId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <strong>{r.user?.name || "User"}</strong> — {"★".repeat(r.rating)}
                  <p>{r.comment}</p>
                  {user?.role === "admin" && (
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => {
                        setEditingReviewId(r.id);
                        setEditReviewRating(r.rating);
                        setEditReviewComment(r.comment || "");
                      }}
                    >
                      Edit review
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CartPage({ user }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCart() {
    setError("");
    if (!user) {
      setItems(readGuestCart());
      setLoading(false);
      return;
    }
    try {
      const response = await request("/cart");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load cart.");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load cart.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, [user]);

  if (loading) return <section className="card">Loading cart…</section>;
  if (error) {
    return (
      <section className="card">
        <p className="error">{error}</p>
        <button className="btn" type="button" onClick={loadCart}>
          Retry
        </button>
      </section>
    );
  }

  async function updateQty(itemId, quantity) {
    if (!user) {
      const next = items.map((line) => (line.id === itemId ? { ...line, quantity } : line));
      setItems(next);
      writeGuestCart(next);
      return;
    }
    const response = await request(`/cart/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    setItems((prev) => prev.map((line) => (line.id === itemId ? data.item : line)));
  }

  async function removeLine(itemId) {
    if (!user) {
      const next = items.filter((line) => line.id !== itemId);
      setItems(next);
      writeGuestCart(next);
      return;
    }
    const previous = items;
    setItems((prev) => prev.filter((line) => line.id !== itemId));
    const response = await request(`/cart/items/${itemId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setItems(previous);
      setError(data.error || "Could not remove item.");
    }
  }

  const subtotal = items.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);

  return (
    <section className="card">
      <h2>Cart</h2>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {items.map((line) => (
              <li key={line.id} className="card" style={{ marginBottom: "12px" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={resolveImageUrl(line.product?.imageUrl)}
                      alt={line.product?.title || "Cart product"}
                      style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--border)" }}
                      onError={(e) => {
                        e.target.src = "/images/placeholder-capybara.svg";
                      }}
                    />
                    <div>
                    <strong>{line.product.title}</strong>
                    <p>${Number(line.product.price).toFixed(2)} each</p>
                    </div>
                  </div>
                  <div className="row">
                    <label>
                      Qty
                      <input
                        type="number"
                        min={1}
                        max={line.product.stock}
                        key={`${line.id}-${line.quantity}`}
                        defaultValue={line.quantity}
                        onBlur={(e) => {
                          const q = Number(e.target.value);
                          if (Number.isInteger(q) && q >= 1 && q !== line.quantity) updateQty(line.id, q);
                        }}
                        style={{ width: "64px" }}
                      />
                    </label>
                    <button className="btn secondary" type="button" onClick={() => removeLine(line.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p>
            <strong>Subtotal:</strong> ${subtotal.toFixed(2)}
          </p>
          <button className="btn" type="button" onClick={() => navigate("/checkout")}>
            Checkout
          </button>
          {!user && (
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Guest checkout is not allowed. Please register/login to place order.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function CheckoutPage({ user }) {
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/register" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await request("/orders", {
        method: "POST",
        body: JSON.stringify({ shippingAddress }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Checkout failed.");
        return;
      }
      navigate(`/orders/${data.order.id}`);
    } catch {
      setError("Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Checkout</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Shipping address
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={4}
            required
            minLength={5}
            placeholder="Full address (at least 5 characters)"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Creating pending order…" : "Create pending order"}
        </button>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          You will see a one-click pay button on the order detail page.
        </p>
      </form>
    </section>
  );
}

function OrdersPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await request("/orders");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load orders.");
        if (!cancelled) setOrders(data.orders || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <section className="card">Loading orders…</section>;
  if (error) {
    return (
      <section className="card">
        <p className="error">{error}</p>
      </section>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const paidColumnOrders = orders.filter((o) => o.status !== "pending");

  async function deletePendingOrder(o) {
    if (o.status !== "pending") return;
    if (
      !window.confirm(
        `Delete order #${o.id}? This cancels the order and puts items back in stock.`
      )
    ) {
      return;
    }
    setDeleteError("");
    setDeletingId(o.id);
    try {
      const response = await request(`/orders/${o.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || "Could not delete order.");
        return;
      }
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch {
      setDeleteError("Could not delete order.");
    } finally {
      setDeletingId(null);
    }
  }

  function renderOrderCard(o) {
    const thumbs = (o.items || []).slice(0, 6);
    return (
      <li key={o.id} className="card order-summary-card">
        <div className="order-summary-card-inner">
          <Link to={`/orders/${o.id}`} className="order-summary-link">
            <div className="order-summary-head">
              <span className="order-summary-id">Order #{o.id}</span>
              <span className={`order-status-badge order-status-${o.status}`}>{o.status}</span>
            </div>
            <div className="order-summary-meta">
              ${Number(o.totalAmount).toFixed(2)} · {new Date(o.createdAt).toLocaleString()}
            </div>
            {thumbs.length > 0 && (
              <div className="order-thumb-row" aria-hidden="true">
                {thumbs.map((line) => (
                  <img
                    key={line.id}
                    className="order-thumb"
                    src={resolveImageUrl(line.product?.imageUrl)}
                    alt={line.product?.title || ""}
                  />
                ))}
                {(o.items || []).length > 6 && (
                  <span className="order-thumb-more">+{(o.items || []).length - 6}</span>
                )}
              </div>
            )}
          </Link>
          {o.status === "pending" && (
            <button
              type="button"
              className="btn secondary order-summary-delete"
              disabled={deletingId === o.id}
              onClick={() => deletePendingOrder(o)}
            >
              {deletingId === o.id ? "…" : "Delete"}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <section className="card">
      <h2>{user.role === "admin" ? "All orders" : "My orders"}</h2>
      {deleteError && (
        <p className="error" role="alert">
          {deleteError}
        </p>
      )}
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="orders-columns">
          <div className="orders-column">
            <h3 className="orders-column-title">Pending</h3>
            {pendingOrders.length === 0 ? (
              <p className="orders-column-empty">No pending orders.</p>
            ) : (
              <ul className="orders-column-list">{pendingOrders.map(renderOrderCard)}</ul>
            )}
          </div>
          <div className="orders-column">
            <h3 className="orders-column-title">Paid &amp; shipped</h3>
            <p className="orders-column-hint">Includes paid, shipped, and cancelled orders.</p>
            {paidColumnOrders.length === 0 ? (
              <p className="orders-column-empty">No completed orders yet.</p>
            ) : (
              <ul className="orders-column-list">{paidColumnOrders.map(renderOrderCard)}</ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function OrderDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    let cancelled = false;
    async function load() {
      try {
        const response = await request(`/orders/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Order not found.");
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  async function payNow() {
    if (!order) return;
    setPayError("");
    setPaying(true);
    try {
      const response = await request(`/orders/${order.id}/pay`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setPayError(data.error || "Payment failed.");
        return;
      }
      setOrder(data.order);
    } catch {
      setPayError("Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  async function deleteOrder() {
    if (!order || order.status !== "pending") return;
    if (
      !window.confirm(
        `Delete order #${order.id}? Items will return to inventory.`
      )
    ) {
      return;
    }
    setDeleteError("");
    setDeleting(true);
    try {
      const response = await request(`/orders/${order.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || "Could not delete order.");
        return;
      }
      navigate("/orders", { replace: true });
    } catch {
      setDeleteError("Could not delete order.");
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <section className="card">Loading order…</section>;
  if (error || !order) {
    return (
      <section className="card">
        <p className="error">{error || "Not found."}</p>
        <Link className="btn" to="/orders">
          Back to orders
        </Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Order #{order.id}</h2>
      <p>Status: {order.status}</p>
      <p>Total: ${Number(order.totalAmount).toFixed(2)}</p>
      <p>Ship to: {order.shippingAddress}</p>
      <p>Placed: {new Date(order.createdAt).toLocaleString()}</p>
      {order.status === "pending" && (
        <div className="row" style={{ marginTop: "10px", flexWrap: "wrap", gap: "10px" }}>
          <button className="btn" type="button" onClick={payNow} disabled={paying || deleting}>
            {paying ? "Processing..." : "One-click Pay (simulate)"}
          </button>
          <button className="btn secondary" type="button" onClick={deleteOrder} disabled={paying || deleting}>
            {deleting ? "Deleting…" : "Delete order"}
          </button>
          <span style={{ color: "var(--text-secondary)" }}>
            If you leave without paying, order stays pending.
          </span>
        </div>
      )}
      {payError && <p className="error">{payError}</p>}
      {deleteError && <p className="error">{deleteError}</p>}
      <h3>Items</h3>
      <ul className="order-items-list">
        {order.items.map((line) => (
          <li key={line.id} className="order-line-item">
            <img
              className="order-line-item-img"
              src={resolveImageUrl(line.product?.imageUrl)}
              alt={line.product?.title || "Product"}
            />
            <div className="order-line-item-body">
              <div className="order-line-item-title">{line.product.title}</div>
              <div className="order-line-item-meta">
                × {line.quantity} @ ${Number(line.unitPrice).toFixed(2)} each
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Link className="btn secondary" to="/orders">
        All orders
      </Link>
    </section>
  );
}

// Admin-only product insertion page with client-side validation.
function ProductCreatePage({ user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    imageUrl: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  function validate(next) {
    const current = next || form;
    const e = {};
    if (current.title.trim().length < 2) e.title = "Title is required.";
    if (!current.category.trim()) e.category = "Category is required.";
    if (!Number.isFinite(Number(current.price)) || Number(current.price) <= 0) e.price = "Price must be > 0.";
    if (!Number.isInteger(Number(current.stock)) || Number(current.stock) < 0) e.stock = "Stock must be integer >= 0.";
    return e;
  }

  // Block unauthenticated users and redirect them to login.
  if (!user) return <Navigate to="/login" replace />;
  // Also block authenticated non-admin users from seeing the create form.
  if (user.role !== "admin") {
    return (
      <section className="card">
        <h2>Admin Access Required</h2>
        <p className="error">Only admin users can create products.</p>
      </section>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setServerError("");
    const response = await request("/products", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setServerError(data.error || "Create product failed.");
      return;
    }
    navigate("/products");
  }

  async function uploadSelectedImage(fileOverride) {
    const fileToUpload = fileOverride || selectedImageFile;
    if (!fileToUpload) {
      setServerError("Please select an image file first.");
      setUploadMessage("");
      return;
    }
    setServerError("");
    setUploadMessage("");
    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append("image", fileToUpload);
      const response = await request("/upload/image", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(data.error || "Upload failed.");
        return;
      }
      setForm((prev) => ({ ...prev, imageUrl: data.imageUrl || "" }));
      setUploadMessage("Image uploaded successfully. You can now save the product.");
    } catch {
      setServerError("Upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  function onChange(event) {
    const next = { ...form, [event.target.name]: event.target.value };
    setForm(next);
    setErrors(validate(next));
  }

  return (
    <section className="card">
      <h2>Admin Product Upload</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Title
          <input name="title" value={form.title} onChange={onChange} />
          {errors.title && <small className="error">{errors.title}</small>}
        </label>
        <label>
          Category
          <select name="category" value={form.category} onChange={onChange}>
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <small className="error">{errors.category}</small>}
        </label>
        <label>
          Price
          <input name="price" type="number" step="0.01" value={form.price} onChange={onChange} />
          {errors.price && <small className="error">{errors.price}</small>}
        </label>
        <label>
          Stock
          <input name="stock" type="number" value={form.stock} onChange={onChange} />
          {errors.stock && <small className="error">{errors.stock}</small>}
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={onChange} />
        </label>
        <label>
          Image URL
          <input name="imageUrl" value={form.imageUrl} onChange={onChange} />
        </label>
        <label>
          Or upload image file
          <input
            name="imageFile"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
              setSelectedImageFile(file);
              setUploadMessage("");
              if (file) {
                void uploadSelectedImage(file);
              }
            }}
          />
        </label>
        <div className="row">
          <button className="btn secondary" type="button" onClick={() => uploadSelectedImage()} disabled={uploadingImage || !selectedImageFile}>
            {uploadingImage ? "Uploading..." : "Upload selected image"}
          </button>
          {selectedImageFile && <span>Selected file: {selectedImageFile.name}</span>}
          {form.imageUrl && <span>Current image: {form.imageUrl}</span>}
        </div>
        {uploadMessage && <p style={{ color: "var(--text-secondary)", margin: 0 }}>{uploadMessage}</p>}
        {form.imageUrl && (
          <img
            src={form.imageUrl}
            alt="Uploaded product preview"
            style={{ width: "180px", maxWidth: "100%", borderRadius: "10px", border: "1px solid var(--border)" }}
            onError={(e) => {
              e.target.src = "/images/placeholder-capybara.svg";
            }}
          />
        )}
        {serverError && <p className="error">{serverError}</p>}
        <button className="btn" type="submit">
          Save Product
        </button>
      </form>
    </section>
  );
}

const MAX_POPULAR_PICK = 12;

function AdminSettingsPage({ user }) {
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(null);
  const [popularIds, setPopularIds] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularSaving, setPopularSaving] = useState(false);
  const [popularMessage, setPopularMessage] = useState("");
  const [popularError, setPopularError] = useState("");

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return (
      <section className="card">
        <h2>Admin Access Required</h2>
        <p className="error">Only admin users can update storefront settings.</p>
      </section>
    );
  }

  async function refresh() {
    const response = await request("/settings/background");
    const data = await response.json();
    if (response.ok) setCurrent(data.backgroundUrl || null);
  }

  async function loadPopularAndCatalog() {
    setPopularLoading(true);
    setPopularError("");
    try {
      const [popRes, catRes] = await Promise.all([
        request("/settings/popular-products"),
        request("/products?limit=200&offset=0"),
      ]);
      const popData = await popRes.json();
      const catData = await catRes.json();
      if (popRes.ok) setPopularIds(popData.productIds || []);
      else setPopularError(popData.error || "Failed to load popular items.");
      if (catRes.ok) setCatalog(catData.items || []);
    } catch {
      setPopularError("Failed to load catalog or popular items.");
    } finally {
      setPopularLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    loadPopularAndCatalog();
  }, []);

  async function uploadBackground() {
    if (!selected) return;
    setUploading(true);
    setMessage("");
    setError("");
    try {
      const body = new FormData();
      body.append("image", selected);
      const response = await request("/settings/background", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(formatApiAuthError(data.error || "Upload failed."));
        return;
      }
      setCurrent(data.backgroundUrl || null);
      applyBackgroundUrl(data.backgroundUrl || null);
      setMessage("Background updated. Refresh any page to see it.");
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function resetBackground() {
    setUploading(true);
    setMessage("");
    setError("");
    try {
      const response = await request("/settings/background", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(formatApiAuthError(data.error || "Reset failed."));
        return;
      }
      setCurrent(null);
      applyBackgroundUrl(null);
      setMessage("Background reset to default.");
    } catch {
      setError("Reset failed.");
    } finally {
      setUploading(false);
    }
  }

  function productById(id) {
    return catalog.find((x) => x.id === id);
  }

  function productLabel(id) {
    const p = productById(id);
    return p ? `#${id} ${p.title}` : `#${id}`;
  }

  function movePopular(index, dir) {
    setPopularIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function removePopular(index) {
    setPopularIds((prev) => prev.filter((_, i) => i !== index));
  }

  function addPopular(id) {
    if (!id || popularIds.includes(id) || popularIds.length >= MAX_POPULAR_PICK) return;
    setPopularIds((prev) => [...prev, id]);
  }

  async function savePopular() {
    setPopularSaving(true);
    setPopularMessage("");
    setPopularError("");
    try {
      const response = await request("/settings/popular-products", {
        method: "PUT",
        body: JSON.stringify({ productIds: popularIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPopularError(formatApiAuthError(data.error || "Save failed."));
        return;
      }
      setPopularIds(data.productIds || []);
      setPopularMessage("Popular items updated. Refresh the home page to preview.");
    } catch {
      setPopularError("Save failed.");
    } finally {
      setPopularSaving(false);
    }
  }

  const addable = catalog.filter((p) => !popularIds.includes(p.id));

  return (
    <section className="card">
      <h2>Admin Settings</h2>
      <h3>Popular items (home page)</h3>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        Choose up to {MAX_POPULAR_PICK} active products and the order they appear under &quot;Popular items&quot; on the welcome page.
      </p>
      {popularLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="form" style={{ maxWidth: "640px" }}>
          <ol className="popular-pick-list">
            {popularIds.map((id, index) => {
              const p = productById(id);
              return (
                <li key={id} className="popular-pick-row">
                  <div className="popular-pick-main">
                    <img
                      className="popular-pick-thumb"
                      src={resolveImageUrl(p?.imageUrl)}
                      alt={p?.title ? `${p.title} thumbnail` : ""}
                      onError={(e) => {
                        e.target.src = "/images/placeholder-capybara.svg";
                      }}
                    />
                    <div className="popular-pick-text">
                      <div className="popular-pick-title">{p ? p.title : productLabel(id)}</div>
                      <div className="popular-pick-sub">#{id}{p?.category ? ` · ${p.category}` : ""}</div>
                    </div>
                  </div>
                  <div className="row" style={{ flexWrap: "nowrap", gap: "6px" }}>
                    <button className="btn secondary" type="button" disabled={index === 0} onClick={() => movePopular(index, -1)} title="Move up">
                      ↑
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={index === popularIds.length - 1}
                      onClick={() => movePopular(index, 1)}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button className="btn secondary" type="button" onClick={() => removePopular(index)}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="popular-pick-add-heading">Add a product</p>
          {addable.length === 0 || popularIds.length >= MAX_POPULAR_PICK ? (
            <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
              {popularIds.length >= MAX_POPULAR_PICK
                ? `Maximum ${MAX_POPULAR_PICK} items. Remove one to add another.`
                : "All products are already in the list."}
            </p>
          ) : (
            <div className="popular-pick-add-grid">
              {addable.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="popular-pick-add-card"
                  aria-label={`Add ${p.title} to popular items`}
                  onClick={() => addPopular(p.id)}
                >
                  <img
                    src={resolveImageUrl(p.imageUrl)}
                    alt=""
                    aria-hidden="true"
                    onError={(e) => {
                      e.target.src = "/images/placeholder-capybara.svg";
                    }}
                  />
                  <span className="popular-pick-add-title">#{p.id} {p.title}</span>
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <button className="btn" type="button" disabled={popularSaving} onClick={savePopular}>
              {popularSaving ? "Saving…" : "Save popular items"}
            </button>
          </div>
          {popularMessage && <p style={{ margin: 0, color: "var(--text-secondary)" }}>{popularMessage}</p>}
          {popularError && <p className="error">{popularError}</p>}
        </div>
      )}

      <h3>Storefront background (tiled)</h3>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        Upload a small image to tile across the whole site. The app will store the image under <code>api/uploads</code> and save its URL in the database.
      </p>
      <div className="form">
        <label>
          Upload background image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelected(e.target.files?.[0] || null)}
          />
        </label>
        <div className="row">
          <button className="btn" type="button" disabled={!selected || uploading} onClick={uploadBackground}>
            {uploading ? "Uploading..." : "Upload & Apply"}
          </button>
          <button className="btn secondary" type="button" disabled={uploading} onClick={resetBackground}>
            Reset to default
          </button>
        </div>
        {current && (
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--text-secondary)" }}>Current background URL: {current}</p>
            <img
              src={current}
              alt="Current background preview"
              style={{ width: "220px", maxWidth: "100%", borderRadius: "10px", border: "1px solid var(--border)" }}
              onError={(e) => {
                e.target.src = "/images/placeholder-capybara.svg";
              }}
            />
          </div>
        )}
        {message && <p style={{ margin: 0, color: "var(--text-secondary)" }}>{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}

// Main route map
function AppRoutes() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Restore login state from token cookie when the app first loads.
  useEffect(() => {
    let cancelled = false;
    async function fetchMe() {
      try {
        const response = await request("/me");
        if (!response.ok) {
          if (!cancelled) setUser(null);
          return;
        }
      const data = await readJsonSafe(response);
        if (!cancelled) setUser(data.user || null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    }
    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load persisted background setting (public endpoint).
  useEffect(() => {
    let cancelled = false;
    async function loadBackground() {
      try {
        const response = await request("/settings/background");
        const data = await readJsonSafe(response);
        if (!cancelled && response.ok) applyBackgroundUrl(data.backgroundUrl);
      } catch {
        // ignore
      }
    }
    loadBackground();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthLoading) {
    return (
      <div className="layout">
        <DeployMissingApiBanner />
        <section className="card">Loading session...</section>
      </div>
    );
  }

  return (
    <div className="layout">
      <DeployMissingApiBanner />
      <Header user={user} setUser={setUser} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<AuthPage setUser={setUser} initialTab="register" />} />
          <Route path="/login" element={<AuthPage setUser={setUser} initialTab="login" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/products/new" element={<ProductCreatePage user={user} />} />
          <Route path="/products/:id" element={<ProductDetailPage user={user} />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/cart" element={<CartPage user={user} />} />
          <Route path="/checkout" element={<CheckoutPage user={user} />} />
          <Route path="/orders/:id" element={<OrderDetailPage user={user} />} />
          <Route path="/orders" element={<OrdersPage user={user} />} />
          <Route path="/admin/settings" element={<AdminSettingsPage user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

// App entry point with router provider.
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
