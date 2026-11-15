"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export default function CheckoutPage() {
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInvalid(!new FormData(event.currentTarget).get("reference"));
  };
  return <main>
    <h1>Find a booking</h1>
    <form onSubmit={submit} noValidate>
      <label htmlFor="reference">Booking reference</label>
      <input id="reference" name="reference" required aria-invalid={invalid} aria-describedby={invalid ? "reference-error" : undefined} />
      {invalid && <p id="reference-error" role="alert">Enter your booking reference.</p>}
      <button type="submit">Find booking</button>
    </form>
  </main>;
}
