"use client";

import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/lib/data";
import { formatTRY } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";

const VAT = 0.2;

export function CheckoutForm({ plan }: { plan: Plan }) {
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const net = Math.round(plan.price / (1 + VAT));
  const vat = plan.price - net;

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-5 pb-28 pt-40 text-center md:pt-52">
        <p className="eyebrow text-fog">Sipariş alındı</p>
        <h1 className="mt-6 font-display text-6xl leading-[0.95] md:text-8xl">Teşekkürler.</h1>
        <p className="mx-auto mt-8 max-w-[40ch] text-[15px] leading-7 text-fog">
          <span className="font-display text-lg text-kalem">{plan.name}</span> erişiminiz açıldı.
          Giriş bilgileri e-postanıza gönderildi.
        </p>
        <div className="mt-12 flex items-center justify-center gap-8">
          <Button href="/akademi#dersler">Derslere git</Button>
          <Link href="/" className="eyebrow u-line">
            Anasayfa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-28 pt-28 md:px-10 md:pt-40">
      <Link href="/akademi#fiyatlandirma" className="inline-flex items-center gap-3 eyebrow text-fog u-line">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M15 8H2M7 3 2 8l5 5" />
        </svg>
        Fiyatlandırma
      </Link>

      <div className="mt-8 grid gap-16 lg:grid-cols-12 lg:gap-10">
        {/* Form */}
        <form
          className="lg:col-span-7"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <h1 className="font-display text-5xl leading-[0.98] tracking-[-0.01em] md:text-7xl">Ödeme</h1>

          <section className="mt-14 border-t border-hair pt-10">
            <h2 className="eyebrow">Hesap</h2>
            <div className="mt-8 grid gap-9">
              <Field label="E-posta" htmlFor="email" hint="Erişim bilgileri bu adrese gönderilir.">
                <Input id="email" type="email" required autoComplete="email" placeholder="ad@ornek.com" />
              </Field>
            </div>
          </section>

          <section className="mt-14 border-t border-hair pt-10">
            <h2 className="eyebrow">Fatura bilgileri</h2>
            <div className="mt-8 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              <Field label="Ad" htmlFor="first">
                <Input id="first" required autoComplete="given-name" />
              </Field>
              <Field label="Soyad" htmlFor="last">
                <Input id="last" required autoComplete="family-name" />
              </Field>
              <Field label="Ülke" htmlFor="country">
                <Select id="country" defaultValue="TR" autoComplete="country">
                  <option value="TR">Türkiye</option>
                  <option value="DE">Almanya</option>
                  <option value="GB">Birleşik Krallık</option>
                  <option value="FR">Fransa</option>
                  <option value="NL">Hollanda</option>
                  <option value="US">Amerika Birleşik Devletleri</option>
                </Select>
              </Field>
              <Field label="Şehir" htmlFor="city">
                <Input id="city" required autoComplete="address-level2" />
              </Field>
            </div>
          </section>

          <section className="mt-14 border-t border-hair pt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="eyebrow">Kart bilgileri</h2>
              <span className="eyebrow text-fog">Güvenli ödeme</span>
            </div>
            <div className="mt-8 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              <Field label="Kart üzerindeki isim" htmlFor="cc-name" className="sm:col-span-2">
                <Input id="cc-name" required autoComplete="cc-name" />
              </Field>
              <Field label="Kart numarası" htmlFor="cc-number" className="sm:col-span-2">
                <Input
                  id="cc-number"
                  required
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="•••• •••• •••• ••••"
                  maxLength={19}
                  className="tabular-nums tracking-[0.08em]"
                />
              </Field>
              <Field label="Son kullanma" htmlFor="cc-exp">
                <Input id="cc-exp" required inputMode="numeric" autoComplete="cc-exp" placeholder="AA / YY" maxLength={7} className="tabular-nums" />
              </Field>
              <Field label="CVC" htmlFor="cc-csc">
                <Input id="cc-csc" required inputMode="numeric" autoComplete="cc-csc" placeholder="•••" maxLength={4} className="tabular-nums" />
              </Field>
            </div>
          </section>

          <div className="mt-14 border-t border-hair pt-10">
            <Checkbox
              id="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              label={
                <>
                  <Link href="/#" className="u-line text-kalem">Satış şartlarını</Link> ve{" "}
                  <Link href="/#" className="u-line text-kalem">gizlilik politikasını</Link> okudum, kabul ediyorum.
                </>
              }
            />
            <Button type="submit" size="lg" className="mt-10 w-full sm:w-auto" disabled={!agreed}>
              Ödemeyi tamamla · {formatTRY(plan.price)}
            </Button>
            <p className="mt-6 text-[11px] leading-4 text-fog">
              Bu ekran bir arayüz prototipidir; kart bilgileri işlenmez, ödeme alınmaz.
            </p>
          </div>
        </form>

        {/* Sipariş özeti */}
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="border border-hair bg-kalem/[0.04] p-8 lg:sticky lg:top-28">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-fog">Sipariş özeti</p>
              <Link href="/akademi#fiyatlandirma" className="eyebrow u-line">
                Planı değiştir
              </Link>
            </div>
            <p className="mt-8 font-display text-3xl leading-tight">{plan.name}</p>
            <p className="mt-2 text-sm leading-6 text-fog">{plan.note}</p>
            <ul className="mt-8 space-y-2.5 text-sm leading-6 text-fog">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-4">
                  <span aria-hidden className="mt-3 h-px w-3 shrink-0 bg-current opacity-60" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div aria-hidden className="seam mt-10 text-kalem" />
            <dl className="mt-6 space-y-3 text-sm tabular-nums">
              <div className="flex justify-between text-fog">
                <dt>Ara toplam</dt>
                <dd>{formatTRY(net)}</dd>
              </div>
              <div className="flex justify-between text-fog">
                <dt>KDV (%20)</dt>
                <dd>{formatTRY(vat)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-hair pt-4">
                <dt className="eyebrow">Toplam</dt>
                <dd className="font-display text-2xl">{formatTRY(plan.price)}</dd>
              </div>
            </dl>
            <p className="mt-6 text-[11px] leading-4 text-fog">Tek seferlik ödeme · 14 gün iade garantisi.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
