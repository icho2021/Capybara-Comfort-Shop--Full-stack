import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { ReferenceExchangePanel } from "./components/ReferenceExchangePanel";

const API_BASE = "/api";
const GUEST_CART_KEY = "guest_cart_items_v1";

// Unified request helper: always include cookies for token-cookie authentication.
function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: isFormData ? { ...(options.headers || {}) } : { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
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

// Public landing page with a small featured-products preview.
export function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await request("/products?limit=4&offset=0");
        const data = await response.json();
        if (!cancelled && response.ok) setItems(data.items || []);
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
      <h3 style={{ marginTop: "1.5rem" }}>Featured picks</h3>
      {loading ? (
        <p>Loading featured products…</p>
      ) : items.length === 0 ? (
        <p>No products yet.</p>
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
    setUser(data.user);
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
    setUser(data.user);
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
        const data = await response.json();
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
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. plush" />
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
                <input value={editForm.category} onChange={(e) => setEditForm((v) => ({ ...v, category: e.target.value }))} />
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
      {user && (
        <form className="form" onSubmit={submitReview}>
          <label>
            Rating (1–5)
            <input
              type="number"
              min={1}
              max={5}
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
            />
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
      {!user && <p>Log in to leave a review.</p>}
      {reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {reviews.map((r) => (
            <li key={r.id} className="card" style={{ marginBottom: "8px" }}>
              <strong>{r.user?.name || "User"}</strong> — {r.rating}/5
              <p>{r.comment}</p>
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

  return (
    <section className="card">
      <h2>{user.role === "admin" ? "All orders" : "My orders"}</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {orders.map((o) => (
            <li key={o.id} className="card" style={{ marginBottom: "8px" }}>
              <Link to={`/orders/${o.id}`}>
                Order #{o.id} — {o.status} — ${Number(o.totalAmount).toFixed(2)} — {new Date(o.createdAt).toLocaleString()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderDetailPage({ user }) {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

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
        <div className="row" style={{ marginTop: "10px" }}>
          <button className="btn" type="button" onClick={payNow} disabled={paying}>
            {paying ? "Processing..." : "One-click Pay (simulate)"}
          </button>
          <span style={{ color: "var(--text-secondary)" }}>
            If you leave without paying, order stays pending.
          </span>
        </div>
      )}
      {payError && <p className="error">{payError}</p>}
      <h3>Items</h3>
      <ul>
        {order.items.map((line) => (
          <li key={line.id}>
            {line.product.title} × {line.quantity} @ ${Number(line.unitPrice).toFixed(2)}
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
          <input name="category" value={form.category} onChange={onChange} />
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
        const data = await response.json();
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

  if (isAuthLoading) {
    return (
      <div className="layout">
        <section className="card">Loading session...</section>
      </div>
    );
  }

  return (
    <div className="layout">
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
