import type { Metadata } from 'next';
import { StaffLoginForm } from './StaffLoginForm';
import { Scissors } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Staff Login — BookMi',
  robots: { index: false, follow: false },
};

export default async function StaffLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="text-base font-bold tracking-tight">BookMi</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded">
          Staff Portal
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Sign In</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your registered contact number to continue
            </p>
          </div>
          <StaffLoginForm slug={slug} />
        </div>
      </main>

      <footer className="border-t border-border bg-background/50 py-4 text-center text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} BookMi · Staff Portal</span>
      </footer>
    </div>
  );
}

