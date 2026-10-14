import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Scissors } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — BookMi",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground transition-colors hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="text-base font-bold tracking-tight">BookMi</span>
        </Link>
        <span className="text-xs text-muted-foreground">Owner Portal</span>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage your salon appointments and settings
            </p>
          </div>
          <SignIn />
        </div>
      </main>

      <footer className="border-t border-border bg-background/50 py-4 text-center text-xs text-muted-foreground">
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
