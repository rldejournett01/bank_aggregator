"use client";

import { useState } from "react";
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
    const [mobileOpen, setMobileOpen] = useState(false);

    const signOut = async () => {
        await logout();
        window.location.href = "/login";
    };

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
        {
            href: "/analysis",
            label: "Analysis",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
        {
            href: "/advisor",
            label: "AI Advisor",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
                </svg>
            ),
        },
        {
            href: "/settings",
            label: "Settings",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                        onClick={signOut}
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
                <header className="bg-white border-b border-[#d4e8d4] px-4 md:px-8 py-0 h-14 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="md:hidden text-[#4a7a4a] hover:text-[#0d1f0d]"
                            aria-label="Toggle navigation"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                {mobileOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                            </svg>
                        </button>
                        <span className="md:hidden text-sm font-semibold tracking-widest uppercase text-[#0d1f0d]">
                            Cashism
                        </span>
                        <div className="hidden md:flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-pulse" />
                            <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">
                                Live · Encrypted
                            </span>
                        </div>
                    </div>
                    <div className="text-[10px] tracking-widest uppercase text-[#b0c8b0]">
                        Cashism Financial
                    </div>
                </header>

                {/* Mobile nav menu */}
                {mobileOpen && (
                    <div className="md:hidden bg-white border-b border-[#d4e8d4] px-3 py-3 space-y-0.5">
                        {navLinks.map((link) => {
                            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${active
                                        ? "bg-[#eaf4ea] text-[#1a7a1a]"
                                        : "text-[#4a7a4a] hover:bg-[#f0f7f0] hover:text-[#0d1f0d]"
                                        }`}
                                >
                                    <span className={active ? "text-[#1a7a1a]" : "text-[#8aaa8a]"}>{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                        <button
                            onClick={signOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium text-[#4a7a4a] hover:bg-[#f0f7f0] hover:text-[#0d1f0d] transition-colors"
                        >
                            <svg className="w-4 h-4 text-[#8aaa8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                        </button>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-5xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
}