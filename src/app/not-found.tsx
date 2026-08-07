import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground transition-colors hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="text-base font-bold tracking-tight">BookMi</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60 mb-6">
          <Scissors className="size-10 text-muted-foreground rotate-45" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          404 Error
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The link might be broken, or the page may have been moved.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="size-4" />
              Take me home
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} BookMi</span>
          <span>·</span>
          <Link href="/cookies" className="hover:text-foreground transition-colors">
            Cookie Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
