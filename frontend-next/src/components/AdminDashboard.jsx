"use client";

import { useState } from 'react';
import DisputeList from './DisputeList';
import UserMapper from './UserMapper';
import ClassManager from './ClassManager';
import DatabaseViewer from './DatabaseViewer';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('disputes');
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    }

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-background text-textMain p-4 md:p-8 font-sans relative">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-6 gap-6 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="h-12 w-12 bg-accent text-background flex items-center justify-center font-mono font-bold text-2xl rounded-sm">
                        _A
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-mono font-bold text-textMain tracking-tight flex items-center gap-3">
                            SYSTEM IDENT
                            <span className="bg-surface text-accent text-[10px] px-2 py-0.5 rounded-sm border border-border tracking-widest uppercase font-mono">ROOT</span>
                        </h1>
                        <p className="text-textMuted text-xs mt-1 font-mono tracking-wide">ACADEMIC RECORDS & CONFIGURATION</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-textMuted hover:text-textMain text-xs font-mono uppercase tracking-widest px-3 py-2 transition-colors flex items-center gap-2"
                    >
                        Live Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-danger px-4 py-2 text-xs font-mono flex items-center gap-2 rounded-sm"
                    >
                        [LOGOUT]
                    </button>
                </div>
            </header>

            <div className="flex overflow-x-auto gap-2 mb-8 border-b border-border pb-0 custom-scrollbar relative z-10 w-full">
                <button
                    onClick={() => setActiveTab('disputes')}
                    className={`px-6 py-3 text-xs md:text-sm font-mono uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'disputes'
                        ? 'bg-surface text-textMain border-b-2 border-accent'
                        : 'text-textMuted hover:bg-surfaceHover hover:text-textMain border-b-2 border-transparent'
                        }`}
                >
                    Dispute Resolution
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 text-xs md:text-sm font-mono uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users'
                        ? 'bg-surface text-textMain border-b-2 border-accent'
                        : 'text-textMuted hover:bg-surfaceHover hover:text-textMain border-b-2 border-transparent'
                        }`}
                >
                    Biometric Mapping
                </button>
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`px-6 py-3 text-xs md:text-sm font-mono uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'classes'
                        ? 'bg-surface text-textMain border-b-2 border-accent'
                        : 'text-textMuted hover:bg-surfaceHover hover:text-textMain border-b-2 border-transparent'
                        }`}
                >
                    Class Management
                </button>
                <button
                    onClick={() => setActiveTab('database')}
                    className={`px-6 py-3 text-xs md:text-sm font-mono uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'database'
                        ? 'bg-surface text-textMain border-b-2 border-accent'
                        : 'text-textMuted hover:bg-surfaceHover hover:text-textMain border-b-2 border-transparent'
                        }`}
                >
                    Database Viewer
                </button>
            </div>

            <div className={`${activeTab === 'database' ? '' : 'surface-panel p-4 md:p-6'} min-h-[500px] border-border relative z-10 animate-fade-in`}>
                {activeTab === 'disputes' && <div className="animate-fade-in"><DisputeList /></div>}
                {activeTab === 'users' && <div className="animate-fade-in"><UserMapper /></div>}
                {activeTab === 'classes' && <div className="animate-fade-in"><ClassManager /></div>}
                {activeTab === 'database' && <div className="animate-fade-in"><DatabaseViewer /></div>}
            </div>
        </div>
    );
}
