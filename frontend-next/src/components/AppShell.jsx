"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const AppShell = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthPage = pathname === '/login' || pathname === '/register';

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex flex-col relative z-10 selection:bg-primary-500/30 selection:text-white bg-dark-bg text-dark-text font-sans">
            {/* Background ambient lighting */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-900/20 blur-[120px]" />
            </div>

            {!isAuthPage && (
                <header className="border-b border-dark-border/50 bg-dark-bg/80 backdrop-blur-xl sticky top-0 z-50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-white flex items-baseline gap-1">
                                SmartAttend
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 align-text-top">2.0</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-border/30 rounded-full border border-dark-border/50 text-xs font-medium text-dark-muted">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                System Online
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-sm font-medium text-dark-muted hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-dark-border/50"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>
            )}

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 animate-fade-in">
                {children}
            </main>

            <footer className="border-t border-dark-border/40 bg-dark-bg/90 py-6 mt-auto relative z-10">
                <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-dark-muted">
                    <p>© {new Date().getFullYear()} University Academic Services</p>
                    <div className="flex gap-4">
                        <span className="hover:text-primary-400 cursor-pointer transition-colors">Help & Support</span>
                        <span className="hover:text-primary-400 cursor-pointer transition-colors">Privacy Policy</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default AppShell;
