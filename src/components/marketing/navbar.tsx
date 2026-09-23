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

const navItems = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
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
          <Image src="/icon-512x512.png" alt="Sable Mesa" width={60} height={60} />
          <span className="text-base font-bold tracking-tight">BookMi</span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
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
            <Link href="/sign-up">Get Started</Link>
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
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
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
