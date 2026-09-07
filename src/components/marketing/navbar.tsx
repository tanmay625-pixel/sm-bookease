"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const productLinks = [
  { label: "BookMi", href: "/products/bookmi", description: "Booking software for service businesses" },
];

const navItems = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };
  const productsActive = pathname?.startsWith("/products");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-heading text-sm font-bold">
            S
          </span>
          <span className="font-heading text-sm font-semibold tracking-tight">
            Sable Mesa
          </span> */}
          <Image src="/logo_text_dark_cropped.png" alt="Sable Mesa" width={120} height={100}/>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "cursor-pointer outline-none transition-colors hover:text-foreground aria-expanded:text-foreground",
                  productsActive && "text-foreground"
                )}
              >
                Products
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuGroup>
                  {productLinks.map((p) => (
                    <DropdownMenuItem key={p.href} asChild>
                      <Link href={p.href} className="flex flex-col items-start gap-0.5">
                        <span className="font-medium text-foreground">{p.label}</span>
                        <span className="text-muted-foreground">{p.description}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  isActive(item.href) && "text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="lg" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/products/bookmi">Get Started</Link>
          </Button>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-heading">Sable Mesa</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 pb-4">
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  Products
                </p>
                {productLinks.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 text-sm hover:bg-muted"
                  >
                    {p.label}
                  </Link>
                ))}
                <p className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                  Company
                </p>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 text-sm hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  <Button size="lg" asChild>
                    <Link href="/products/bookmi" onClick={() => setOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
