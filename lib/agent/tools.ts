import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { CURRENT_STUDENT_ID, formatSlot } from "../campusbite";
import { getSupabase } from "../supabase";

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when//. the student asks what food is available, wants menu details, or needs menu options filtered by category, vegetarian status, or price.",
  schema: z.object({
    category: z.enum(["meal", "snack", "drink", "sweet"]).optional(),
    veg_only: z.boolean().optional(),
    max_price: z.number().int().optional(),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category", { ascending: true })
      .order("price", { ascending: true });

    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price !== undefined) query = query.lte("price", max_price);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { items: data };
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description:
    "Use this when//. the student asks for their wallet balance or wants to know how much they can spend.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Wallet not found for the current student.");
    return { name: data.name, balance: data.balance };
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description:
    "Use this when//. the student asks about available pickup times or needs to choose a pickup slot.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time", { ascending: true });

    if (error) throw new Error(error.message);
    const slots = data
      .map((slot) => ({
        slot_id: slot.id,
        time: formatSlot(slot.slot_time),
        free: slot.capacity - slot.booked,
      }))
      .filter((slot) => slot.free > 0);

    return { slots };
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description:
    "Use this when//. the student asks to see their recent orders or check an order's status.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("id, status, total, pickup_slots(slot_time), order_items(menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);
    const orders = data.map((order) => {
      const pickupSlot = Array.isArray(order.pickup_slots)
        ? order.pickup_slots[0]
        : order.pickup_slots;

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: pickupSlot ? formatSlot(pickupSlot.slot_time) : null,
        item_names: order.order_items.flatMap((item) =>
          item.menu_items.map((menuItem) => menuItem.name)
        ),
      };
    });

    return { orders };
  },
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [getMenu, getWalletBalance, getPickupSlots, getMyOrders];
