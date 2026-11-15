import "server-only";

export type Booking = {
  status: "confirmed" | "pending" | "failed" | "cancelled";
  room: string;
};

const ledger = new Map<string, Booking>([
  ["demonstration", { status: "confirmed", room: "Courtyard room" }],
  ["awaiting", { status: "pending", room: "Garden room" }],
  ["cancelled", { status: "cancelled", room: "Garden room" }],
]);

export async function readBooking(reference: string): Promise<Booking> {
  return ledger.get(reference) ?? { status: "failed", room: "Unassigned" };
}
