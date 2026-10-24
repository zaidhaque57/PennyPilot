
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeIndianRupee,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "./lib/api";
import "./index.css";

type TransactionType = "INCOME" | "EXPENSE";

type AuthResponse = {
  accessToken: string;
  tokenType?: string;
  userId?: string;
  name?: string;
  email?: string;
};

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  transactionDate: string;
  createdAt?: string;
};

type DashboardData = {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
};

type TransactionPage = {
  content?: Transaction[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const emptyDashboard: DashboardData = {
  month: currentMonth(),
  totalIncome: 0,
  totalExpenses: 0,
  balance: 0,
  transactionCount: 0,
};

function money(value: number | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function readableDate(value: string) {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("401")) {
      return "Your session may have expired. Please sign in again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("pennypilot_token") ?? "",
  );
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(() => localStorage.getItem("pennypilot_name") ?? "");
  const [email, setEmail] = useState(() => localStorage.getItem("pennypilot_email") ?? "");
  const [profileOpen, setProfileOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(today());

  const dailyChartData = useMemo(() => {
    const grouped = new Map<string, { day: string; income: number; expenses: number }>();
    transactions.forEach((transaction) => {
      const day = transaction.transactionDate?.slice(8, 10) || "—";
      const current = grouped.get(day) ?? { day, income: 0, expenses: 0 };
      if (transaction.type === "INCOME") current.income += Number(transaction.amount) || 0;
      else current.expenses += Number(transaction.amount) || 0;
      grouped.set(day, current);
    });
    return [...grouped.values()].sort((a, b) => Number(a.day) - Number(b.day));
  }, [transactions]);

  const categoryChartData = useMemo(() => {
    const grouped = new Map<string, number>();
    transactions
      .filter((transaction) => transaction.type === "EXPENSE")
      .forEach((transaction) => {
        const categoryName = transaction.category || "Other";
        grouped.set(categoryName, (grouped.get(categoryName) ?? 0) + (Number(transaction.amount) || 0));
      });
    return [...grouped.entries()]
      .map(([categoryName, value]) => ({ name: categoryName, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const chartColors = ["#B9DDFB", "#BDEBD0", "#111827", "#83B8E8", "#75C99D", "#7B8798", "#D9EAFE"];

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, transactionsResponse] = await Promise.all([
        api.get<DashboardData>("/dashboard", {
          params: { month },
        }),
        api.get<TransactionPage | Transaction[]>("/transactions"),
      ]);

      setDashboard({
        ...emptyDashboard,
        ...dashboardResponse.data,
      });

      const result = transactionsResponse.data;
      const records = Array.isArray(result)
        ? result
        : result?.content ?? [];

      // The dashboard and table show the selected month.
      setTransactions(
        records.filter((item) => item.transactionDate?.startsWith(month)),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError("");
    setNotice("");

    try {
      const path =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const payload =
        authMode === "register"
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const response = await api.post<AuthResponse>(path, payload);
      const result = response.data;

      if (!result?.accessToken) {
        throw new Error(
          "The server responded without an access token. Check AuthResponse on the backend.",
        );
      }

      localStorage.setItem("pennypilot_token", result.accessToken);
      const accountName = result.name ?? name.trim();
      const accountEmail = result.email ?? email.trim();
      if (accountName) localStorage.setItem("pennypilot_name", accountName);
      if (accountEmail) localStorage.setItem("pennypilot_email", accountEmail);
      setToken(result.accessToken);
      setName(accountName);
      setEmail(accountEmail);
      setNotice("Welcome to PennyPilot!");
      setPassword("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("pennypilot_token");
    localStorage.removeItem("pennypilot_name");
    localStorage.removeItem("pennypilot_email");
    setProfileOpen(false);
    setName("");
    setEmail("");
    setToken("");
    setTransactions([]);
    setDashboard(emptyDashboard);
    setError("");
    setNotice("");
    setPassword("");
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.post("/transactions", {
        type,
        amount: numericAmount,
        category: category.trim(),
        description: description.trim(),
        transactionDate,
      });

      setAmount("");
      setDescription("");
      setTransactionDate(selectedDate);
      setShowForm(false);
      setNotice("Transaction saved successfully.");
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    const confirmed = window.confirm(
      "Delete this transaction? This action cannot be undone.",
    );
    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/transactions/${encodeURIComponent(id)}`);
      setNotice("Transaction deleted.");
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-visual">
          <div className="brand">
            <span className="brand-mark">
              <Wallet size={22} />
            </span>
            <span>PennyPilot</span>
          </div>

          <div className="auth-pitch">
            <span className="eyebrow">YOUR MONEY, YOUR DIRECTION</span>
            <h1>
              Make every
              <br />
              rupee <span>count.</span>
            </h1>
            <p>
              A calmer way to track your spending, understand your habits, and
              keep your financial goals in sight.
            </p>

            <div className="preview-card">
              <div className="preview-top">
                <span>Monthly overview</span>
                <span className="preview-dot" />
              </div>
              <div className="preview-label">Your finances, in focus</div>
              <div className="preview-bars">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="preview-legend">
                <span><i className="legend-income" /> Income</span>
                <span><i className="legend-expense" /> Expenses</span>
              </div>
            </div>
          </div>

          <p className="auth-footer">
            Simple money management. Built around you.
          </p>
        </section>

        <section className="auth-panel">
          <div className="mobile-brand brand">
            <span className="brand-mark"><Wallet size={22} /></span>
            <span>PennyPilot</span>
          </div>

          <div className="auth-form-wrap">
            <div className="auth-heading">
              <span className="eyebrow">
                {authMode === "login" ? "WELCOME BACK" : "GET STARTED"}
              </span>
              <h2>
                {authMode === "login" ? "Sign in to your account" : "Create your account"}
              </h2>
              <p>
                {authMode === "login"
                  ? "Pick up where you left off."
                  : "Your clearer financial picture starts here."}
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {notice && <div className="alert alert-success">{notice}</div>}

            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                    maxLength={80}
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  minLength={8}
                  required
                />
                {authMode === "register" && (
                  <span className="field-hint">Use at least 8 characters.</span>
                )}
              </label>

              <button className="button button-primary auth-submit" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Sign in"
                    : "Create account"}
                {!authLoading && <ArrowUpRight size={18} />}
              </button>
            </form>

            <div className="auth-switch">
              {authMode === "login"
                ? "New to PennyPilot?"
                : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setError("");
                  setNotice("");
                }}
              >
                {authMode === "login" ? "Create account" : "Sign in"}
              </button>
            </div>

            <p className="privacy-note">
              <CheckCircle2 size={15} />
              Your account is protected with secure authentication.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="#dashboard">
          <span className="brand-mark"><Wallet size={22} /></span>
          <span>PennyPilot</span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-card">
          <span className="workspace-avatar">P</span>
          <span className="workspace-text">
            <strong>Personal finance</strong>
            <small>Personal workspace</small>
          </span>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">MENU</div>
        <a className="nav-link active" href="#dashboard">
          <LayoutDashboard size={18} />
          Overview
        </a>
        <a
          className="nav-link"
          href="#transactions"
          onClick={() => document.getElementById("transactions")?.scrollIntoView({ behavior: "smooth" })}
        >
          <ArrowDownLeft size={18} />
          Transactions
        </a>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><CircleDollarSign size={20} /></span>
            <strong>Small steps add up.</strong>
            <p>Keep track of today to make better choices tomorrow.</p>
          </div>
          <button className="nav-link logout-button" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <section className="main-panel" id="dashboard">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace <span>/</span> Overview</div>
            <h1>Good to see you{ name.trim() ? `, ${name.trim().split(" ")[0]}` : "" }.</h1>
            <p>Here’s what’s happening with your money.</p>
          </div>

          <div className="topbar-actions">
            <label className="month-picker">
              <CalendarDays size={17} />
              <input
                type="month"
                value={month}
                onChange={(event) => {
                  const nextMonth = event.target.value || currentMonth();
                  setMonth(nextMonth);
                  const nextDate = selectedDate.startsWith(nextMonth)
                    ? selectedDate
                    : `${nextMonth}-01`;
                  setSelectedDate(nextDate);
                  setTransactionDate(nextDate);
                }}
                aria-label="Select dashboard month"
              />
            </label>
            <button
              className="icon-button"
              onClick={() => void loadData()}
              title="Refresh data"
              aria-label="Refresh data"
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            <div className="profile-area">
              <button
                className="profile-button"
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <span className="profile-avatar">{(name.trim() || email.trim() || "P").charAt(0).toUpperCase()}</span>
                <span className="profile-button-copy">
                  <strong>{name.trim() || "My account"}</strong>
                  <small>{email.trim() || "Personal profile"}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-heading">
                    <span className="profile-avatar profile-avatar-large">{(name.trim() || email.trim() || "P").charAt(0).toUpperCase()}</span>
                    <span><strong>{name.trim() || "PennyPilot user"}</strong><small>{email.trim() || "Signed in account"}</small></span>
                  </div>
                  <button type="button" onClick={logout}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
            <button className="button button-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Add transaction
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-error app-alert">
            <span>{error}</span>
            {error.includes("401") && (
              <button onClick={logout}>Sign in again</button>
            )}
            <button className="alert-close" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div className="alert alert-success app-alert">
            <CheckCircle2 size={17} />
            <span>{notice}</span>
            <button className="alert-close" onClick={() => setNotice("")} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="stats-grid" aria-label="Monthly summary">
          <article className="stat-card balance-card">
            <div className="stat-top">
              <span className="stat-icon balance-icon"><Wallet size={19} /></span>
              <span className="stat-caption">NET BALANCE</span>
            </div>
            <div className="stat-value">{money(dashboard.balance)}</div>
            <div className="stat-foot">Income minus expenses</div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-icon income-icon"><ArrowDownLeft size={19} /></span>
              <span className="stat-caption">TOTAL INCOME</span>
            </div>
            <div className="stat-value">{money(dashboard.totalIncome)}</div>
            <div className="stat-foot positive">Money coming in</div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-icon expense-icon"><ArrowUpRight size={19} /></span>
              <span className="stat-caption">TOTAL EXPENSES</span>
            </div>
            <div className="stat-value">{money(dashboard.totalExpenses)}</div>
            <div className="stat-foot">Money going out</div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-icon count-icon"><BadgeIndianRupee size={19} /></span>
              <span className="stat-caption">TRANSACTIONS</span>
            </div>
            <div className="stat-value">{dashboard.transactionCount}</div>
            <div className="stat-foot">For the selected month</div>
          </article>
        </section>

        <section className="calendar-panel" aria-label="Monthly transaction calendar">
          <div className="calendar-heading">
            <div>
              <span className="calendar-eyebrow"><CalendarDays size={14} /> PLAN YOUR MONEY</span>
              <h2>Monthly calendar</h2>
              <p>Choose a day to review or add a transaction.</p>
            </div>
            <div className="calendar-controls">
              <button type="button" className="calendar-nav" aria-label="Previous month" onClick={() => {
                const date = new Date(`${month}-01T00:00:00`);
                date.setMonth(date.getMonth() - 1);
                const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                setMonth(nextMonth);
                setSelectedDate(`${nextMonth}-01`);
                setTransactionDate(`${nextMonth}-01`);
              }}><ChevronLeft size={16} /></button>
              <span className="calendar-month-label">{new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
              <button type="button" className="calendar-nav" aria-label="Next month" onClick={() => {
                const date = new Date(`${month}-01T00:00:00`);
                date.setMonth(date.getMonth() + 1);
                const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                setMonth(nextMonth);
                setSelectedDate(`${nextMonth}-01`);
                setTransactionDate(`${nextMonth}-01`);
              }}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="calendar-layout">
            <div className="calendar-grid-wrap">
              <div className="calendar-grid calendar-weekdays">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid calendar-days">
                {(() => {
                  const first = new Date(`${month}-01T00:00:00`);
                  const offset = (first.getDay() + 6) % 7;
                  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
                  const cells: Array<{ date: string; day: number } | null> = Array.from({ length: offset }, () => null);
                  for (let day = 1; day <= daysInMonth; day += 1) {
                    cells.push({ date: `${month}-${String(day).padStart(2, "0")}`, day });
                  }
                  while (cells.length % 7 !== 0) cells.push(null);
                  return cells.map((cell, index) => {
                    if (!cell) return <span className="calendar-day calendar-day-empty" key={`empty-${index}`} aria-hidden="true" />;
                    const dayTransactions = transactions.filter((item) => item.transactionDate?.slice(0, 10) === cell.date);
                    const hasIncome = dayTransactions.some((item) => item.type === "INCOME");
                    const hasExpense = dayTransactions.some((item) => item.type === "EXPENSE");
                    const isToday = cell.date === today();
                    const isSelected = cell.date === selectedDate;
                    return <button type="button" key={cell.date} className={`calendar-day${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${dayTransactions.length ? " has-transactions" : ""}`} onClick={() => { setSelectedDate(cell.date); setTransactionDate(cell.date); }} aria-label={`${cell.date}${dayTransactions.length ? `, ${dayTransactions.length} transactions` : ", no transactions"}`} aria-pressed={isSelected}>
                      <span className="calendar-day-number">{cell.day}</span>
                      {dayTransactions.length > 0 && <span className="calendar-day-markers">{hasIncome && <i className="income-marker" />}{hasExpense && <i className="expense-marker" />}</span>}
                    </button>;
                  });
                })()}
              </div>
              <div className="calendar-legend"><span><i className="income-marker" /> Income</span><span><i className="expense-marker" /> Expense</span></div>
            </div>
            <aside className="calendar-day-summary">
              <div className="calendar-selected-date">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
              {(() => {
                const selectedTransactions = transactions.filter((item) => item.transactionDate?.slice(0, 10) === selectedDate);
                const income = selectedTransactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
                const expenses = selectedTransactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount || 0), 0);
                return <>
                  <div className="calendar-total-row"><span>Income</span><strong className="calendar-income">{money(income)}</strong></div>
                  <div className="calendar-total-row"><span>Expenses</span><strong className="calendar-expense">{money(expenses)}</strong></div>
                  <div className="calendar-transaction-count">{selectedTransactions.length} transaction{selectedTransactions.length === 1 ? "" : "s"}</div>
                </>;
              })()}
              <button type="button" className="button button-secondary calendar-add-button" onClick={() => { setTransactionDate(selectedDate); setShowForm(true); }}><Plus size={15} /> Add to this day</button>
            </aside>
          </div>
        </section>

        <section className="charts-grid" aria-label="Financial charts">
          <article className="chart-panel chart-panel-wide">
            <div className="chart-heading">
              <div>
                <span className="chart-kicker"><BarChart3 size={15} /> CASH FLOW</span>
                <h2>Income vs expenses</h2>
                <p>Daily activity for the selected month, based on your saved transactions.</p>
              </div>
              <span className="chart-period">{new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
            </div>
            {dailyChartData.length === 0 ? (
              <div className="chart-empty">Add transactions to see your cash flow chart.</div>
            ) : (
              <div className="chart-canvas chart-canvas-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 10, right: 8, left: 2, bottom: 2 }} barGap={5}>
                    <CartesianGrid stroke="#E8EEF5" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#7A8798", fontSize: 11 }} tickFormatter={(day) => `${Number(day)}`} />
                    <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "#7A8798", fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`} />
                    <Tooltip formatter={(value) => money(Number(value))} labelFormatter={(label) => `Day ${label}`} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }} />
                    <Bar dataKey="income" name="Income" fill="#A9D5FA" radius={[5, 5, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="expenses" name="Expenses" fill="#A9E5C2" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="chart-legend"><span><i className="legend-blue" /> Income</span><span><i className="legend-green" /> Expenses</span></div>
          </article>

          <article className="chart-panel">
            <div className="chart-heading">
              <div>
                <span className="chart-kicker"><CircleDollarSign size={15} /> SPENDING BREAKDOWN</span>
                <h2>Expenses by category</h2>
                <p>Where your money went this month.</p>
              </div>
            </div>
            {categoryChartData.length === 0 ? (
              <div className="chart-empty">Your category breakdown will appear after you add an expense.</div>
            ) : (
              <>
                <div className="chart-canvas pie-canvas">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={63} outerRadius={91} paddingAngle={3} stroke="none">
                        {categoryChartData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-center"><small>Total expenses</small><strong>{money(categoryChartData.reduce((sum, item) => sum + item.value, 0))}</strong></div>
                </div>
                <div className="category-legend">
                  {categoryChartData.slice(0, 5).map((item, index) => (
                    <div className="category-legend-row" key={item.name}>
                      <span><i style={{ background: chartColors[index % chartColors.length] }} />{item.name}</span>
                      <strong>{money(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        </section>

        <section className="transactions-panel" id="transactions">
          <div className="panel-heading">
            <div>
              <h2>Recent transactions</h2>
              <p>Your money activity for {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}.</p>
            </div>
            <button className="button button-secondary" onClick={() => setShowForm(true)}>
              <Plus size={17} /> Add new
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <RefreshCw size={23} className="spin" />
              <p>Loading your transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Wallet size={24} /></span>
              <h3>No transactions this month</h3>
              <p>Add your first income or expense to get started.</p>
              <button className="button button-primary" onClick={() => setShowForm(true)}>
                <Plus size={17} /> Add your first transaction
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>TRANSACTION</th>
                    <th>CATEGORY</th>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th className="amount-column">AMOUNT</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <div className="transaction-title">
                          <span className={`transaction-icon ${transaction.type === "INCOME" ? "transaction-income" : "transaction-expense"}`}>
                            {transaction.type === "INCOME"
                              ? <ArrowDownLeft size={17} />
                              : <ArrowUpRight size={17} />}
                          </span>
                          <span>
                            <strong>{transaction.description?.trim() || transaction.category}</strong>
                            <small>{transaction.description?.trim() ? transaction.category : "Transaction"}</small>
                          </span>
                        </div>
                      </td>
                      <td><span className="category-pill">{transaction.category}</span></td>
                      <td className="date-cell">{readableDate(transaction.transactionDate)}</td>
                      <td>
                        <span className={`type-label ${transaction.type === "INCOME" ? "type-income" : "type-expense"}`}>
                          {transaction.type === "INCOME" ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className={`amount-cell ${transaction.type === "INCOME" ? "amount-positive" : ""}`}>
                        {transaction.type === "INCOME" ? "+" : "−"}{money(transaction.amount)}
                      </td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => void deleteTransaction(transaction.id)}
                          aria-label={`Delete ${transaction.description || transaction.category}`}
                          title="Delete transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} PennyPilot</span>
          <span><span className="online-dot" /> Connected to your workspace</span>
        </footer>
      </section>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">MONEY ACTIVITY</span>
                <h2 id="transaction-modal-title">Add transaction</h2>
                <p>Record income or an expense in your account.</p>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close form">
                <X size={19} />
              </button>
            </div>

            <form className="transaction-form" onSubmit={handleCreateTransaction}>
              <div className="type-toggle" role="group" aria-label="Transaction type">
                <button
                  type="button"
                  className={type === "EXPENSE" ? "selected expense-selected" : ""}
                  onClick={() => {
                    setType("EXPENSE");
                    setCategory("Food");
                  }}
                >
                  <ArrowUpRight size={17} /> Expense
                </button>
                <button
                  type="button"
                  className={type === "INCOME" ? "selected income-selected" : ""}
                  onClick={() => {
                    setType("INCOME");
                    setCategory("Salary");
                  }}
                >
                  <ArrowDownLeft size={17} /> Income
                </button>
              </div>

              <label>
                Amount (₹)
                <div className="amount-input-wrap">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </label>

              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value)} required>
                  {(type === "EXPENSE"
                    ? ["Food", "Transport", "Shopping", "Bills", "Health", "Education", "Entertainment", "Rent", "Travel", "Other"]
                    : ["Salary", "Freelance", "Business", "Investment", "Gift", "Refund", "Other"]
                  ).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Description <span className="optional-label">Optional</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Groceries for the week"
                  maxLength={180}
                />
              </label>

              <label>
                Transaction date
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save transaction"}
                  {!saving && <CheckCircle2 size={17} />}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;