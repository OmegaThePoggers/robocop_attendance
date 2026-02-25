import { useState } from 'react';
import DisputeList from './DisputeList';
import UserMapper from './UserMapper';
import ClassManager from './ClassManager';
import DatabaseViewer from './DatabaseViewer';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('disputes');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    }

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-dark-bg text-slate-200 p-0 sm:p-4 md:p-8 font-sans relative">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[-1]">
                {/* primary ambient glow */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]"></div>
                {/* secondary ambient glow */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-600/10 blur-[120px]"></div>
                {/* Modern subtle grid */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-dark-border/50 pb-6 gap-6 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-14 bg-secondary-500/10 border border-secondary-500/30 text-secondary-400 flex items-center justify-center font-bold text-3xl rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        A
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide flex items-center gap-3">
                            System Administration
                            <span className="bg-secondary-500/20 text-secondary-400 text-[10px] px-2 py-0.5 rounded-full border border-secondary-500/30 tracking-widest uppercase font-mono shadow-[0_0_10px_rgba(168,85,247,0.2)]">Root</span>
                        </h1>
                        <p className="text-secondary-400/70 text-sm mt-1 font-medium tracking-wide">Academic Records & System Configuration</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-dark-muted hover:text-white text-xs font-bold uppercase tracking-widest px-3 py-2 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Live Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-outline px-5 py-2 text-xs border-dark-border text-dark-muted hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Logout
                    </button>
                </div>
            </header>

            <div className="flex overflow-x-auto gap-2 mb-8 border-b border-dark-border/50 pb-2 custom-scrollbar relative z-10 w-full">
                <button
                    onClick={() => setActiveTab('disputes')}
                    className={`px-6 py-3 text-xs md:text-sm font-bold uppercase tracking-widest rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'disputes'
                        ? 'bg-secondary-500/10 text-secondary-400 border-b-2 border-secondary-500 shadow-[inset_0_-20px_20px_-20px_rgba(168,85,247,0.3)]'
                        : 'text-dark-muted hover:bg-white/5 hover:text-slate-300'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Dispute Resolution
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 text-xs md:text-sm font-bold uppercase tracking-widest rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'users'
                        ? 'bg-secondary-500/10 text-secondary-400 border-b-2 border-secondary-500 shadow-[inset_0_-20px_20px_-20px_rgba(168,85,247,0.3)]'
                        : 'text-dark-muted hover:bg-white/5 hover:text-slate-300'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Biometric Mapping
                </button>
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`px-6 py-3 text-xs md:text-sm font-bold uppercase tracking-widest rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'classes'
                        ? 'bg-secondary-500/10 text-secondary-400 border-b-2 border-secondary-500 shadow-[inset_0_-20px_20px_-20px_rgba(168,85,247,0.3)]'
                        : 'text-dark-muted hover:bg-white/5 hover:text-slate-300'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Class Management
                </button>
                <button
                    onClick={() => setActiveTab('database')}
                    className={`px-6 py-3 text-xs md:text-sm font-bold uppercase tracking-widest rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'database'
                        ? 'bg-secondary-500/10 text-secondary-400 border-b-2 border-secondary-500 shadow-[inset_0_-20px_20px_-20px_rgba(168,85,247,0.3)]'
                        : 'text-dark-muted hover:bg-white/5 hover:text-slate-300'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    Database Viewer
                </button>
            </div>

            <div className={`${activeTab === 'database' ? '' : 'glass-panel p-6 md:p-8'} min-h-[500px] border-dark-border/60 relative z-10 animate-fade-in`}>
                {activeTab === 'disputes' && <div className="animate-fade-in"><DisputeList /></div>}
                {activeTab === 'users' && <div className="animate-fade-in"><UserMapper /></div>}
                {activeTab === 'classes' && <div className="animate-fade-in"><ClassManager /></div>}
                {activeTab === 'database' && <div className="animate-fade-in"><DatabaseViewer /></div>}
            </div>
        </div>
    );
}
