"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, FlaskConical, Home, PenLine } from "lucide-react";
import { SoundToggle } from "@/components/SoundProvider";

const links = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/workspace", label: "Intake", icon: PenLine },
  { href: "/results", label: "Results", icon: BarChart3 },
  { href: "/stress-tests", label: "Stress Tests", icon: FlaskConical },
  { href: "/method", label: "Method", icon: FileText }
];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen hero-glow">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <Link
              href="/"
              className="text-2xl font-semibold tracking-tight text-[var(--foreground)] transition hover:text-[var(--accent-strong)]"
            >
              FlareWise
            </Link>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
              Smart pre-visit intake for doctors
            </p>
          </div>
          <nav className="flex max-w-full items-center gap-2 overflow-x-auto soft-scroll">
            <SoundToggle />
            {links.map((link) => {
              const Icon = link.icon;
              const active = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition ${
                    active
                      ? "border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-sm"
                      : "border border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
