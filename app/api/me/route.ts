import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstRelated<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

export async function GET() {
  const supabase = getSupabase();
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("name, balance")
    .eq("student_id", CURRENT_STUDENT_ID)
    .maybeSingle();

  if (walletError) {
    console.error("[GET /api/me] wallet", walletError.message);
    return NextResponse.json({ error: walletError.message }, { status: 500 });
  }
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found for the current student." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, price, menu_items(name))")
    .eq("student_id", CURRENT_STUDENT_ID)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[GET /api/me] orders", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data.map((order) => {
    const pickupSlot = firstRelated(order.pickup_slots);

    return {
      id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      pickup_time: pickupSlot ? formatSlot(pickupSlot.slot_time) : null,
      items: order.order_items.map((item) => ({
        name: firstRelated(item.menu_items)?.name ?? "Unknown item",
        quantity: item.quantity,
        price: item.price,
      })),
    };
  });

  return NextResponse.json({ wallet, orders });
}
