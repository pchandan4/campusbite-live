"use client";

import { useEffect, useState } from "react";

type KitchenOrder = {
  id: number;
  status: "placed" | "preparing" | "ready";
  total: number;
  student_name: string | null;
  pickup_time: string | null;
  items: { name: string; quantity: number; price: number }[];
};

const COLUMNS: {
  status: KitchenOrder["status"];
  title: string;
  buttonLabel: string;
  nextStatus: "preparing" | "ready" | "collected";
}[] = [
  { status: "placed", title: "New orders", buttonLabel: "Start preparing", nextStatus: "preparing" },
  { status: "preparing", title: "Preparing", buttonLabel: "Mark ready", nextStatus: "ready" },
  { status: "ready", title: "Ready for pickup", buttonLabel: "Collected", nextStatus: "collected" },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      try {
        const response = await fetch("/api/kitchen", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load kitchen orders");
        setOrders(result.orders as KitchenOrder[]);
        setError("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load kitchen orders");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOrders();
    const intervalId = window.setInterval(() => void loadOrders(), 3000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [reloadKey]);

  async function advanceOrder(order: KitchenOrder, status: "preparing" | "ready" | "collected") {
    setUpdatingId(order.id);
    setError("");
    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update order");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8">
      <header className="mx-auto mb-7 flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            CampusBite · SRM
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Kitchen screen</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
          <a href="/" className="text-sm text-slate-300 transition hover:text-white">
            Student screen
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px]">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter((order) => order.status === column.status);
            return (
              <section
                key={column.status}
                aria-labelledby={`column-${column.status}`}
                className="min-h-64 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 id={`column-${column.status}`} className="text-lg font-semibold">
                    {column.title}
                  </h2>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg shadow-black/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold">Order #{order.id}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            Pickup <span className="font-semibold text-white">{order.pickup_time ?? "—"}</span>
                          </p>
                        </div>
                        <span className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-medium capitalize text-slate-200">
                          {order.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        Student: <span className="font-medium text-white">{order.student_name ?? "Unknown"}</span>
                      </p>
                      <ul className="mt-3 space-y-1 border-t border-slate-700 pt-3">
                        {order.items.map((item, index) => (
                          <li
                            key={`${order.id}-${item.name}-${index}`}
                            className="flex justify-between gap-3 text-sm"
                          >
                            <span className="text-slate-200">
                              {item.quantity} × {item.name}
                            </span>
                            <span className="shrink-0 text-slate-400">
                              Rs {item.price * item.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-3">
                        <span className="text-sm text-slate-400">Order total</span>
                        <span className="font-semibold">Rs {order.total}</span>
                      </div>

                      <button
                        type="button"
                        disabled={updatingId !== null}
                        onClick={() => advanceOrder(order, column.nextStatus)}
                        className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId === order.id ? "Updating..." : column.buttonLabel}
                      </button>
                    </article>
                  ))}

                  {!loading && columnOrders.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
                      No orders in this column.
                    </p>
                  )}
                  {loading && columnOrders.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">Loading orders...</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
