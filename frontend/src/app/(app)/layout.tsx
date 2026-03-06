"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navLinks = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            href: "/connect",
            label: "Connect Bank",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
        },
    ];

    return (
        <div
            className="flex h-screen overflow-hidden bg-[#f7faf7]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r border-[#d4e8d4] hidden md:flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="px-6 py-5 border-b border-[#d4e8d4]">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#1a7a1a]" />
                        <span className="text-sm font-semibold tracking-widest uppercase text-[#0d1f0d]">
                            Cashism
                        </span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-5 space-y-0.5">
                    <p className="px-3 mb-3 text-[9px] tracking-widest uppercase text-[#8aaa8a]">
                        Navigation
                    </p>
                    {navLinks.map((link) => {
                        const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-colors duration-150 ${active
                                        ? "bg-[#eaf4ea] text-[#1a7a1a]"
                                        : "text-[#4a7a4a] hover:bg-[#f0f7f0] hover:text-[#0d1f0d]"
                                    }`}
                            >
                                <span className={active ? "text-[#1a7a1a]" : "text-[#8aaa8a]"}>
                                    {link.icon}
                                </span>
                                {link.label}
                                {active && (
                                    <span className="ml-auto w-1 h-1 rounded-full bg-[#1a7a1a]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout + footer */}
                <div className="px-3 py-4 border-t border-[#d4e8d4] space-y-1">
                    <button
                        onClick={() => {
                            logout();
                            window.location.href = "/login";
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium text-[#4a7a4a] hover:bg-[#f0f7f0] hover:text-[#0d1f0d] transition-colors duration-150"
                    >
                        <svg className="w-4 h-4 text-[#8aaa8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                    </button>
                    <p className="px-3 pt-2 text-[9px] tracking-widest uppercase text-[#b0c8b0]">
                        © 2026 Cashism
                    </p>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-white border-b border-[#d4e8d4] px-8 py-0 h-14 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-pulse" />
                        <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">
                            Live · Encrypted
                        </span>
                    </div>
                    <div className="text-[10px] tracking-widest uppercase text-[#b0c8b0]">
                        Cashism Financial
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-5xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
}