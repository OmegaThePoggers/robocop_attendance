import { useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname === '/login';

    return (
        <div className="min-h-screen flex flex-col relative z-10 selection:bg-primary/30 selection:text-white">
            {!isLoginPage && (
                <header className="border-b border-primary/20 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-8 bg-primary/70"></div>
                            <h1 className="text-xl font-display font-bold text-white tracking-wider">
                                SMART<span className="text-primary">ATTEND</span> <span className="text-slate-500 text-xs font-mono align-top ml-1">v2.0</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-6 text-xs font-mono text-primary/70">
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded border border-primary/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                <span>SYSTEM ONLINE</span>
                            </div>
                            <div className="hidden sm:block text-slate-600">|</div>
                            <div className="hidden sm:block text-slate-400">
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </header>
            )}

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
                {children}
            </main>

            <footer className="border-t border-slate-800 bg-surface/90 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                        University Academic Services • Department of Computer Science
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
