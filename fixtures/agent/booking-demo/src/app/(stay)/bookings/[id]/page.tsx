import { readBooking } from "@/lib/booking-ledger";
import { BookingReceipt } from "@/ui/booking-receipt";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await readBooking(id);
  return <BookingReceipt booking={booking} />;
}
