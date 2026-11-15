"use client";

import { useState } from "react";

export default function UnsafePaymentExample() {
  const [status, setStatus] = useState("pending");
  return <main>
    <h1>Payment simulator</h1>
    <button type="button" onClick={() => setTimeout(() => setStatus("success"), 450)}>Start preview</button>
    {status === "success" && <p>This preview has ended.</p>}
  </main>;
}
