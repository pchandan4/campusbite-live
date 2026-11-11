"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time: string | null;
  items: { name: string; quantity: number; price: number }[];
};

type StudentData = {
  wallet: { name: string; balance: number };
  orders: Order[];
};

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-sky-400/15 text-sky-200",
  preparing: "bg-amber-400/15 text-amber-200",
  ready: "bg-emerald-400/15 text-emerald-200",
  collected: "bg-slate-400/15 text-slate-200",
  cancelled: "bg-rose-400/15 text-rose-200",
};

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<StudentData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/me", { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load wallet and orders");
        setData(result as StudentData);
        setError("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load wallet and orders");
      }
    }

    void load();
    const intervalId = window.setInterval(() => void load(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5">
        <p className="text-sm font-medium text-slate-300">CampusBite wallet</p>
        {data ? (
          <>
            <p className="mt-1 text-sm text-slate-300">{data.wallet.name}</p>
            <p className="mt-3 text-3xl font-semibold">Rs {data.wallet.balance}</p>
            <p className="mt-1 text-xs text-slate-400">Available balance</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-300">{error || "Loading wallet..."}</p>
        )}
      </div>

      <div className="p-5">
        <h2 className="font-semibold">My orders today</h2>
        {error && data && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {!data && !error && <p className="mt-3 text-sm text-slate-400">Loading orders...</p>}
        {data && data.orders.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">No orders yet today.</p>
        )}
        {data && data.orders.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-800">
            {data.orders.map((order) => (
              <li key={order.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Order #{order.id}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      STATUS_STYLES[order.status] ?? "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Pickup {order.pickup_time ?? "time unavailable"}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}
                </p>
                <p className="mt-1 text-sm font-medium text-white">Total: Rs {order.total}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}