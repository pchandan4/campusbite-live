import { NextResponse } from "next/server";
import { z } from "zod";
import { formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateOrderStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["preparing", "ready", "collected"]),
});

const nextStatus: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

function firstRelated<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

export async function GET() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, status, total, created_at, wallets(name), pickup_slots(slot_time), order_items(quantity, price, menu_items(name))")
    .in("status", ["placed", "preparing", "ready"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/kitchen]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data.map((order) => {
    const student = firstRelated(order.wallets);
    const pickupSlot = firstRelated(order.pickup_slots);

    return {
      id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      student_name: student?.name ?? null,
      pickup_time: pickupSlot ? formatSlot(pickupSlot.slot_time) : null,
      items: order.order_items.map((item) => {
        const menuItem = firstRelated(item.menu_items);
        return {
          name: menuItem?.name ?? "Unknown item",
          quantity: item.quantity,
          price: item.price,
        };
      }),
    };
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order status update", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { order_id, status } = parsed.data;
  const supabase = getSupabase();
  const { data: order, error: lookupError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", order_id)
    .maybeSingle();

  if (lookupError) {
    console.error("[POST /api/kitchen] lookup", lookupError.message);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: `Order ${order_id} not found.` }, { status: 404 });
  }
  if (nextStatus[order.status] !== status) {
    return NextResponse.json(
      { error: `Order status cannot change from ${order.status} to ${status}.` },
      { status: 409 }
    );
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", order_id)
    .eq("status", order.status)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    console.error("[POST /api/kitchen] update", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updatedOrder) {
    return NextResponse.json(
      { error: "Order status changed before this update could be applied." },
      { status: 409 }
    );
  }

  return NextResponse.json({ order: updatedOrder });
}
