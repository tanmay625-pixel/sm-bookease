import Link from "next/link";
import { Globe, Mail, Share2 } from "lucide-react";
import Image from "next/image";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "BookMi", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
    ],
  },
];

const socials = [
  { label: "Website", href: "#", icon: Globe },
  { label: "Email", href: "mailto:hello@sablemesa.in", icon: Mail },
  { label: "Share", href: "#", icon: Share2 },
];

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              {/* <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-heading text-sm font-bold">
                S
              </span>
              <span className="font-heading text-sm font-semibold tracking-tight">
                Sable Mesa
              </span> */}
              <Image src="/icon-192x192.png" alt="BookMi" width={120} height={120} />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
              A software studio building focused SaaS products for niche
              industries that deserve better tools.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
                {section.title}
              </h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Sable Mesa. All rights reserved.</p>
          <p>Built by Sable Mesa &middot; Made in India</p>
        </div>
      </div>
    </footer>
  );
}
