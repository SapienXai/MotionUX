interface Receipt {
  status: "confirmed" | "pending";
}

export default async function ServerReceipt() {
  const response = await fetch(process.env.BOOKING_ENDPOINT ?? "http://127.0.0.1:3999/fictional-booking");
  if (response.ok) {
    const receipt: Receipt = await response.json();
    return <main>
      <h1>Booking receipt</h1>
      {receipt.status === "confirmed" && <p role="status">Booking confirmed</p>}
      {receipt.status === "pending" && <p>Awaiting confirmation</p>}
    </main>;
  }
  return <main><h1>Booking unavailable</h1><p role="alert">Could not load the receipt.</p></main>;
}
