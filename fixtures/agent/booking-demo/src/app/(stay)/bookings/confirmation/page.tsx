import { readBooking } from "@/lib/booking-ledger";
import { BookingReceipt } from "@/ui/booking-receipt";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const { booking: reference } = await searchParams;
  const booking = await readBooking(reference ?? "demonstration");
  return <BookingReceipt booking={booking} />;
}
