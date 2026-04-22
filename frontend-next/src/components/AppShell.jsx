"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// ── Icon components ────────────────────────────────────────────────────────
const Icon = ({ d, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

const ICONS = {
    dashboard:    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    attendance:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    doubts:       "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    assignments:  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    results:      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    schedule:     "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    library:      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    notifications:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    profile:      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    chat:         "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    sessions:     "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    admin:        "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    analytics:    "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    marks:        "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    accounts:     "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    logout:       "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    menu:         "M4 6h16M4 12h16M4 18h16",
    close:        "M6 18L18 6M6 6l12 12",
    face:         "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

const NAV_LINKS = {
    student: [
        { href: "/student",               label: "Dashboard",      icon: "dashboard" },
        { href: "/student/attendance",    label: "Attendance",     icon: "attendance" },
        { href: "/student/doubts",        label: "My Doubts",      icon: "doubts" },
        { href: "/student/assignments",   label: "Assignments",    icon: "assignments" },
        { href: "/student/results",       label: "Results",        icon: "results" },
        { href: "/student/schedule",      label: "Schedule",       icon: "schedule" },
        { href: "/student/library",       label: "Library",        icon: "library" },
        { href: "/student/chat",          label: "Chat",           icon: "chat" },
        { href: "/student/notifications", label: "Notifications",  icon: "notifications" },
        { href: "/student/profile",       label: "Profile",        icon: "profile" },
    ],
    teacher: [
        { href: "/dashboard",             label: "Dashboard",      icon: "dashboard" },
        { href: "/teacher/doubts",        label: "Doubts",         icon: "doubts" },
        { href: "/teacher/assignments",   label: "Assignments",    icon: "assignments" },
        { href: "/teacher/marks",         label: "Marks",          icon: "marks" },
        { href: "/teacher/schedule",      label: "Schedule",       icon: "schedule" },
        { href: "/teacher/chat",          label: "Chat",           icon: "chat" },
        { href: "/teacher/profile",       label: "Profile",        icon: "profile" },
    ],
    admin: [
        { href: "/dashboard",             label: "Dashboard",      icon: "dashboard" },
        { href: "/admin",                 label: "Admin Panel",    icon: "admin" },
        { href: "/admin/accounts",        label: "Accounts",       icon: "accounts" },
        { href: "/admin/analytics",       label: "Analytics",      icon: "analytics" },
        { href: "/teacher/doubts",        label: "All Doubts",     icon: "doubts" },
        { href: "/teacher/assignments",   label: "Assignments",    icon: "assignments" },
        { href: "/teacher/marks",         label: "Marks",          icon: "marks" },
    ],
};

function NavLink({ href, label, icon, active, onClick }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${active
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm shadow-primary-500/10'
                    : 'text-dark-muted hover:text-white hover:bg-dark-border/40 border border-transparent'
                }`}
        >
            <span className={`flex-shrink-0 transition-colors ${active ? 'text-primary-400' : 'text-dark-muted group-hover:text-primary-400'}`}>
                <Icon d={ICONS[icon]} />
            </span>
            <span>{label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />}
        </Link>
    );
}

const AppShell = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [role, setRole] = useState(null);
    const [username, setUsername] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (isAuthPage) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setRole(decoded.role);
            setUsername(decoded.sub || '');
        } catch (_) {}
    }, [pathname, isAuthPage]);

    // Poll unread notifications
    useEffect(() => {
        if (!role || isAuthPage) return;
        const fetchUnread = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/notifications`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.filter(n => !n.is_read).length);
                }
            } catch (_) {}
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [role, isAuthPage]);

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (_) {}
        localStorage.removeItem('token');
        router.push('/login');
    };

    const navLinks = NAV_LINKS[role] || [];

    // Auth pages: simple centered layout
    if (isAuthPage) {
        return (
            <div className="min-h-screen flex flex-col relative selection:bg-primary-500/30 selection:text-white bg-dark-bg text-dark-text font-sans">
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-900/20 blur-[120px]" />
                </div>
                <main className="flex-grow flex flex-col relative z-10 animate-fade-in">
                    {children}
                </main>
            </div>
        );
    }

    // Authenticated layout: sidebar + content
    return (
        <div className="min-h-screen flex bg-dark-bg text-dark-text font-sans selection:bg-primary-500/30 selection:text-white">
            {/* Sidebar overlay on mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full z-50 w-64 bg-dark-card border-r border-dark-border flex flex-col
                transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:static lg:z-auto
            `}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-dark-border/60">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
                        <Icon d={ICONS.face} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white leading-tight">SmartAttend</h1>
                        <p className="text-[10px] text-primary-400 font-medium">+ Cogni v3.0</p>
                    </div>
                </div>

                {/* User chip */}
                <div className="px-4 py-3 border-b border-dark-border/40">
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-dark-bg/60 rounded-xl border border-dark-border/50">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600/30 to-primary-800/30 flex items-center justify-center text-primary-400 font-bold text-sm border border-primary-500/20 flex-shrink-0">
                            {username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{username}</p>
                            <p className="text-[10px] text-dark-muted capitalize">{role}</p>
                        </div>
                        <div className="ml-auto flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="flex-grow overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
                    {navLinks.map(link => {
                        const isActive = link.href === '/student' || link.href === '/dashboard' || link.href === '/admin'
                            ? pathname === link.href
                            : pathname.startsWith(link.href);
                        const isNotif = link.href.includes('notifications');
                        return (
                            <div key={link.href} className="relative">
                                <NavLink
                                    href={link.href}
                                    label={link.label}
                                    icon={link.icon}
                                    active={isActive}
                                    onClick={() => setSidebarOpen(false)}
                                />
                                {isNotif && unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom: Logout */}
                <div className="px-3 py-4 border-t border-dark-border/40">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
                    >
                        <Icon d={ICONS.logout} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar (mobile hamburger + breadcrumb) */}
                <header className="sticky top-0 z-30 bg-dark-bg/80 backdrop-blur-xl border-b border-dark-border/40 flex items-center gap-3 px-4 py-3 lg:px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-border/50 transition-colors"
                    >
                        <Icon d={ICONS.menu} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark-muted truncate">
                            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
                                <span key={seg}>
                                    <span className={i === arr.length - 1 ? 'text-white font-medium' : ''}>
                                        {seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')}
                                    </span>
                                    {i < arr.length - 1 && <span className="mx-1 text-dark-border">/</span>}
                                </span>
                            ))}
                        </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-border/30 rounded-full border border-dark-border/50 text-xs font-medium text-dark-muted">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        System Online
                    </div>

                    {unreadCount > 0 && (
                        <Link href={role === 'student' ? '/student/notifications' : '/student/notifications'}
                              className="relative p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-border/50 transition-colors">
                            <Icon d={ICONS.notifications} />
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </Link>
                    )}
                </header>

                {/* Page content */}
                <main className="flex-grow overflow-auto p-4 lg:p-6 animate-fade-in">
                    {/* Ambient background */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/5 blur-[120px]" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-900/10 blur-[120px]" />
                    </div>
                    <div className="relative z-10 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppShell;
