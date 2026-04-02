import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

const API_BASE = "/api";

// Unified request helper: always include cookies for token-cookie authentication.
function request(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
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

// Public landing page
export function HomePage() {
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
      </div>
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

// Product list page that demonstrates loading, error, and empty states.
export function ProductsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 6;

  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;

  // Fetch products whenever pagination offset changes.
  const fetchProducts = useMemo(
    () => async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await request(`/products?limit=${limit}&offset=${offset}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch products.");
        setItems(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [offset]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (isLoading) return <section className="card">Loading products...</section>;
  if (error) {
    return (
      <section className="card">
        <p className="error">{error}</p>
        <button className="btn" onClick={fetchProducts}>
          Retry
        </button>
      </section>
    );
  }
  if (items.length === 0) {
    return <section className="card">No products yet. Add the first product.</section>;
  }

  return (
    <section className="card">
      <h2>Products</h2>
      <div className="grid">
        {items.map((item) => (
          <article key={item.id} className="product">
            <h3>{item.title}</h3>
            <p>Category: {item.category}</p>
            <p>${item.price.toFixed(2)}</p>
            <p>Stock: {item.stock}</p>
          </article>
        ))}
      </div>
      <div className="row">
        <button className="btn secondary" disabled={!hasPrevious} onClick={() => setOffset((v) => Math.max(0, v - limit))}>
          Previous
        </button>
        <span>
          Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </span>
        <button className="btn secondary" disabled={!hasNext} onClick={() => setOffset((v) => v + limit)}>
          Next
        </button>
      </div>
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
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductCreatePage user={user} />} />
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
