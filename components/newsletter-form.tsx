"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <form
      className="max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email) return;
        setDone(true);
      }}
    >
      <label htmlFor="newsletter" className="eyebrow text-ash">
        Bülten
      </label>
      <div className="mt-3 flex items-end gap-6 border-b border-mist transition-colors duration-500 focus-within:border-ink">
        <input
          id="newsletter"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          className="w-full bg-transparent py-3 text-[15px] outline-none"
          disabled={done}
        />
        <button type="submit" className="eyebrow whitespace-nowrap pb-3.5 u-line" disabled={done}>
          {done ? "Kaydedildi" : "Abone ol"}
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-ash">
        {done ? "Teşekkürler. Ayda bir yazıyoruz." : "Ayda bir: yeni koleksiyonlar, dersler ve stüdyo notları."}
      </p>
    </form>
  );
}
