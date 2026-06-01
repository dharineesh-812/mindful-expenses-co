import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Pencil, Trash2, TrendingUp, Calendar, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Expense Tracker" },
      {
        name: "description",
        content:
          "Track daily expenses, filter by category and date, and view a clean dashboard with category breakdowns.",
      },
      { property: "og:title", content: "Daily Expense Tracker" },
      {
        property: "og:description",
        content: "Track daily expenses with summary statistics and filters.",
      },
    ],
  }),
  component: Index,
});

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
};

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Other",
] as const;

const STORAGE_KEY = "expenses_v1";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  Transport: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  Shopping: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  Bills: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  Entertainment: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  Health: "bg-primary/15 text-primary border-primary/30",
  Other: "bg-muted text-muted-foreground border-border",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function Index() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExpenses(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses, loaded]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => (filterCategory === "all" ? true : e.category === filterCategory))
      .filter((e) => (filterFrom ? e.date >= filterFrom : true))
      .filter((e) => (filterTo ? e.date <= filterTo : true))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, filterCategory, filterFrom, filterTo]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const avgPerDay = useMemo(() => {
    if (filtered.length === 0) return 0;
    const days = new Set(filtered.map((e) => e.date)).size || 1;
    return total / days;
  }, [filtered, total]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success("Expense deleted");
  }

  function handleSave(data: Omit<Expense, "id">) {
    if (editing) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === editing.id ? { ...editing, ...data } : e)),
      );
      toast.success("Expense updated");
    } else {
      setExpenses((prev) => [
        { id: crypto.randomUUID(), ...data },
        ...prev,
      ]);
      toast.success("Expense added");
    }
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">Expense Tracker</h1>
              <p className="text-xs text-muted-foreground mt-1">Your daily spending, organized</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <ExpenseDialog
              key={editing?.id ?? "new"}
              initial={editing}
              onSave={handleSave}
              onCancel={() => {
                setDialogOpen(false);
                setEditing(null);
              }}
            />
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Total spending"
            value={formatCurrency(total)}
            hint={`${filtered.length} expense${filtered.length === 1 ? "" : "s"}`}
          />
          <StatCard
            icon={<Calendar className="h-4 w-4" />}
            label="Average / day"
            value={formatCurrency(avgPerDay)}
            hint="Across days with spending"
          />
          <StatCard
            icon={<Tags className="h-4 w-4" />}
            label="Top category"
            value={byCategory[0]?.[0] ?? "—"}
            hint={byCategory[0] ? formatCurrency(byCategory[0][1]) : "No data"}
          />
        </section>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="f-cat">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="f-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-from">From</Label>
                <Input
                  id="f-from"
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-to">To</Label>
                <Input
                  id="f-to"
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilterCategory("all");
                    setFilterFrom("");
                    setFilterTo("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown */}
        {byCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byCategory.map(([cat, amt]) => {
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={CATEGORY_COLORS[cat]}>
                          {cat}
                        </Badge>
                        <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                      </div>
                      <span className="font-medium">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Expense list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Expenses</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No expenses yet. Click "Add Expense" to get started.
                </p>
              </div>
            ) : (
              <>
                {/* Table on desktop */}
                <div className="hidden md:block">
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Title</th>
                          <th className="px-4 py-2 font-medium">Category</th>
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 text-right font-medium">Amount</th>
                          <th className="px-4 py-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((e) => (
                          <tr key={e.id} className="border-t border-border">
                            <td className="px-4 py-2.5 font-medium">{e.title}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className={CATEGORY_COLORS[e.category]}>
                                {e.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{e.date}</td>
                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                              {formatCurrency(e.amount)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(e)}
                                aria-label="Edit expense"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(e.id)}
                                aria-label="Delete expense"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cards on mobile */}
                <div className="grid gap-3 md:hidden">
                  {filtered.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-lg border border-border p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{e.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{e.date}</div>
                        </div>
                        <div className="font-semibold tabular-nums">
                          {formatCurrency(e.amount)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={CATEGORY_COLORS[e.category]}>
                          {e.category}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(e)}
                            aria-label="Edit expense"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(e.id)}
                            aria-label="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ExpenseDialog({
  initial,
  onSave,
  onCancel,
}: {
  initial: Expense | null;
  onSave: (data: Omit<Expense, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState<string>(initial?.amount?.toString() ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "Food");
  const [date, setDate] = useState<string>(initial?.date ?? todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const t = title.trim();
    if (!t) errs.title = "Title is required";
    else if (t.length > 80) errs.title = "Max 80 characters";
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt)) errs.amount = "Enter a valid amount";
    else if (amt <= 0) errs.amount = "Must be greater than 0";
    else if (amt > 1_000_000) errs.amount = "Amount is too large";
    if (!date) errs.date = "Date is required";
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number]))
      errs.category = "Invalid category";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave({ title: t, amount: amt, category, date });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit expense" : "Add expense"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lunch with team"
            maxLength={80}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save changes" : "Add expense"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
