"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RecognitionPanel from './RecognitionPanel';
import AttendanceTable from './AttendanceTable';
import AbsenteeList from './AbsenteeList';
import LiveCorrectionPanel from './LiveCorrectionPanel';
import SessionHistory from './SessionHistory';
import { createSession, endSession, getActiveSession } from '../lib/api';

export default function Dashboard() {
    const [sessionName, setSessionName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [classes, setClasses] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [activeTab, setActiveTab] = useState('live');
    const [isAdmin, setIsAdmin] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0); // Add global refresh trigger
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    const fetchSession = async () => {
        const sess = await getActiveSession();
        setActiveSession(sess);
    };

    const fetchClasses = async () => {
        import('../lib/api').then(({ getClasses }) => {
            getClasses().then(setClasses).catch(console.error);
        });
    };

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role === 'student') {
            router.push('/student');
            return;
        }
        if (role === 'admin') {
            setIsAdmin(true);
        }

        fetchSession();
        fetchClasses();
        const interval = setInterval(fetchSession, 5000);
        return () => clearInterval(interval);
    }, [router]);

    useEffect(() => {
        if (activeSession) {
            setActiveTab('live');
        } else {
            setActiveTab('history');
        }
    }, [activeSession]);

    const handleCreateSession = async () => {
        if (!sessionName || !selectedClass) return;
        try {
            await createSession(sessionName, parseInt(selectedClass));
            setSessionName('');
            setSelectedClass('');
            fetchSession();
        } catch (error) {
            alert('Failed to start session');
        }
    };

    const handleEndSession = async () => {
        if (!activeSession) return;
        if (confirm("End current class session?")) {
            await endSession(activeSession.id);
            fetchSession();
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 max-w-[1600px] mx-auto w-full p-4 md:p-6 lg:p-8 animate-fade-in relative z-10">
            {/* Header / Command Bar */}
            <div className="surface-panel p-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 transition-colors">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                        {activeSession ? (
                            <span className="w-3 h-3 rounded-full bg-success"></span>
                        ) : (
                            <span className="w-3 h-3 rounded-full bg-border"></span>
                        )}
                    </div>
                    <div>
                        <h2 className={`text-base sm:text-lg font-mono font-medium tracking-tight ${activeSession ? 'text-success' : 'text-textMuted'}`}>
                            {activeSession ? `[LIVE] ${activeSession.name}` : '[SYSTEM STANDBY]'}
                        </h2>
                        <p className="text-xs text-textMuted font-mono mt-0.5">
                            {activeSession ? `Uptime start: ${new Date(activeSession.created_at).toLocaleTimeString()}` : 'No active tracking session'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center xl:justify-end">
                    {isAdmin && (
                        <button
                            onClick={() => router.push('/admin')}
                            className="bg-transparent hover:bg-surfaceHover text-textMain border border-border px-4 py-2 font-mono text-xs uppercase tracking-tight rounded transition-colors"
                        >
                            Admin Console
                        </button>
                    )}

                    {!activeSession ? (
                        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto items-center">
                            <select
                                className="input-field py-2 text-sm max-w-[180px] bg-background text-textMain rounded"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                            >
                                <option value="" className="text-textMuted">Select Course</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Session ID (e.g. LAB-01)"
                                className="input-field py-2 text-sm w-full sm:w-48 bg-background text-textMain rounded"
                                value={sessionName}
                                onChange={(e) => setSessionName(e.target.value)}
                            />
                            <button
                                onClick={handleCreateSession}
                                disabled={!selectedClass || !sessionName}
                                className="btn-primary py-2 px-6 flex-shrink-0"
                            >
                                Init Session
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleEndSession}
                            className="btn-danger py-2 px-6 font-mono text-xs uppercase tracking-wider rounded"
                        >
                            Terminate Session
                        </button>
                    )}

                    <div className="w-px h-6 bg-border mx-2 hidden sm:block"></div>

                    <button
                        onClick={handleLogout}
                        className="text-textMuted hover:text-danger text-sm font-mono transition-colors"
                        title="Sign Out"
                    >
                        [LOGOUT]
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className={`grid grid-cols-1 ${activeSession ? 'lg:grid-cols-12' : ''} gap-6 flex-grow min-h-[500px]`}>

                {/* Visual Recognition Panel (Only visible when active) */}
                {activeSession && (
                    <div className="lg:col-span-5 flex flex-col h-[60vh] lg:h-auto min-h-[500px]">
                        <div className="surface-panel flex-grow flex flex-col overflow-hidden relative">
                            {/* Panel Header */}
                            <div className="px-4 py-2 border-b border-border bg-surface flex justify-between items-center">
                                <span className="text-xs font-mono text-textMuted uppercase tracking-tight">Camera Feed [ACTIVE]</span>
                                <div className="flex gap-2">
                                    <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
                                </div>
                            </div>

                            <div className="flex-grow bg-background relative flex items-center justify-center p-2">
                                <RecognitionPanel
                                    activeSession={activeSession}
                                    onUpdate={() => setUpdateTrigger(prev => prev + 1)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Data & Controls Panel */}
                <div className={`${activeSession ? 'lg:col-span-7' : 'col-span-1'} flex flex-col h-[60vh] lg:h-auto min-h-[500px]`}>

                    {/* Standard Minimal Tabs */}
                    <div className="flex gap-1 mb-2 border-b border-border px-2">
                        {activeSession && (
                            <>
                                <button
                                    onClick={() => setActiveTab('live')}
                                    className={`px-4 py-2 text-xs font-mono uppercase tracking-tight transition-colors ${activeTab === 'live'
                                        ? 'text-textMain border-b-2 border-accent'
                                        : 'text-textMuted hover:text-textMain border-b-2 border-transparent'
                                        }`}
                                >
                                    Log Stream
                                </button>
                                <button
                                    onClick={() => setActiveTab('targets')}
                                    className={`px-4 py-2 text-xs font-mono uppercase tracking-tight transition-colors ${activeTab === 'targets'
                                        ? 'text-danger border-b-2 border-danger'
                                        : 'text-textMuted hover:text-danger border-b-2 border-transparent'
                                        }`}
                                >
                                    Missing
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-xs font-mono uppercase tracking-tight transition-colors ${activeTab === 'history'
                                ? 'text-textMain border-b-2 border-accent'
                                : 'text-textMuted hover:text-textMain border-b-2 border-transparent'
                                }`}
                        >
                            Database
                        </button>
                    </div>

                    {/* Tab Content Container */}
                    <div className="surface-panel flex-grow flex flex-col overflow-hidden">
                        <div className="flex-grow overflow-auto custom-scrollbar p-2">
                            {activeSession && activeTab === 'live' && (
                                <div className="h-full flex flex-col gap-4 animate-fade-in">
                                    <LiveCorrectionPanel updateTrigger={updateTrigger} />
                                    <div className="flex-grow bg-background border border-border rounded overflow-hidden">
                                        <AttendanceTable activeSession={activeSession} updateTrigger={updateTrigger} />
                                    </div>
                                </div>
                            )}

                            {activeSession && activeTab === 'targets' && (
                                <div className="h-full animate-fade-in">
                                    <AbsenteeList updateTrigger={updateTrigger} />
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="h-full animate-fade-in p-2">
                                    <SessionHistory />
                                </div>
                            )}

                            {/* Empty State Fallback - Now shows universal logs */}
                            {!activeSession && activeTab !== 'history' && (
                                <div className="h-full flex flex-col pt-2 px-2 pb-2 animate-fade-in">
                                    <div className="mb-4 p-3 bg-surface border border-border rounded flex items-center justify-between text-sm text-textMuted">
                                        <p className="font-mono">System dormant. Select a course to initialize tracking sequence.</p>
                                    </div>
                                    <div className="flex-grow bg-background border border-border rounded overflow-hidden h-[400px]">
                                        <AttendanceTable activeSession={null} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
