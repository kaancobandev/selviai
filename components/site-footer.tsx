import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterForm } from "@/components/newsletter-form";

const columns = [
  {
    title: "Keşfet",
    links: [
      { label: "Hizmetler", href: "/#hizmetler" },
      { label: "Koleksiyon Marketi", href: "/market" },
      { label: "Akademi", href: "/akademi" },
      { label: "Koleksiyon yükle", href: "/market/yukle" },
    ],
  },
  {
    title: "Stüdyo",
    links: [
      { label: "Hakkında", href: "/#studyo" },
      { label: "İletişim", href: `mailto:${site.email}` },
      { label: "Basın", href: `mailto:${site.pressEmail}` },
    ],
  },
  {
    title: "Takip",
    links: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "Pinterest", href: "https://pinterest.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-mist bg-bone">
      <div className="px-5 pb-10 pt-20 md:px-10 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-[17vw] leading-[0.85] tracking-[-0.02em] md:text-[7rem] lg:text-[8.5rem]">
              {site.name}
            </p>
            <p className="mt-6 eyebrow text-ash">{site.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7 md:pt-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="eyebrow text-ash">{col.title}</p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="u-line text-sm"
                        {...(l.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 grid items-end gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <NewsletterForm />
          </div>
          <div className="flex flex-col gap-3 eyebrow text-ash sm:flex-row sm:items-center sm:justify-between md:col-span-7">
            <span>© 2026 {site.name}. Tüm hakları saklıdır.</span>
            <span className="flex gap-6">
              <Link href="/#" className="u-line">
                Gizlilik
              </Link>
              <Link href="/#" className="u-line">
                Şartlar
              </Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
