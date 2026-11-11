"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "sweet" | "drink";
  price: number;
  is_veg: boolean;
  stock: number;
  description: string;
};

const GROUPS: { category: MenuItem["category"]; title: string }[] = [
  { category: "meal", title: "Meals" },
  { category: "snack", title: "Snacks" },
  { category: "sweet", title: "Sweets" },
  { category: "drink", title: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/menu", { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load menu");
        setItems(result.items as MenuItem[]);
        setError("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load menu");
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="mt-1 text-xs text-slate-500">Availability and prices update live.</p>
      </div>
      <div className="p-5">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!error && items.length === 0 && (
          <p className="text-sm text-slate-500">Loading menu...</p>
        )}
        <div className="space-y-5">
          {GROUPS.map(({ category, title }) => {
            const groupItems = items.filter((item) => item.category === category);
            if (groupItems.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {title}
                </h3>
                <ul className="divide-y divide-slate-100">
                  {groupItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-1"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                          title={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            item.is_veg ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          {item.stock === 0 ? (
                            <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              Sold out
                            </span>
                          ) : item.stock <= 3 ? (
                            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Only {item.stock} left
                            </span>
                          ) : (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.stock} available · {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-900">
                        Rs {item.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}