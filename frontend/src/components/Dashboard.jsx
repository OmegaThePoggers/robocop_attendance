import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RecognitionPanel from './RecognitionPanel';
import AttendanceTable from './AttendanceTable';
import AbsenteeList from './AbsenteeList';
import LiveCorrectionPanel from './LiveCorrectionPanel';
import SessionHistory from './SessionHistory';
import { createSession, endSession, getActiveSession } from '../api';

export default function Dashboard() {
    const [sessionName, setSessionName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [classes, setClasses] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [activeTab, setActiveTab] = useState('live');
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    const fetchSession = async () => {
        const sess = await getActiveSession();
        setActiveSession(sess);
    };

    const fetchClasses = async () => {
        // Need to import getClasses from api in a moment
        import('../api').then(({ getClasses }) => {
            getClasses().then(setClasses).catch(console.error);
        });
    };

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role === 'student') {
            navigate('/student');
            return;
        }
        if (role === 'admin') {
            setIsAdmin(true);
        }

        fetchSession();
        fetchClasses();
        const interval = setInterval(fetchSession, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    // Auto-switch tabs based on session state
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
        <div className="h-full flex flex-col space-y-6 max-w-[1600px] mx-auto w-full animate-fade-in relative z-10">
            {/* Header / Command Bar */}
            <div className="glass-panel p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 transition-all">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-dark-bg/50 border border-dark-border/50 shrink-0">
                        {activeSession ? (
                            <>
                                <span className="absolute inset-0 rounded-xl bg-success/20 animate-pulse"></span>
                                <span className="relative w-3 h-3 rounded-full bg-success shadow-[0_0_15px_rgba(52,211,153,0.8)]"></span>
                            </>
                        ) : (
                            <span className="w-3 h-3 rounded-full bg-dark-muted shadow-inner"></span>
                        )}
                    </div>
                    <div>
                        <h2 className={`text-base sm:text-lg font-bold uppercase tracking-widest ${activeSession ? 'text-success' : 'text-slate-300'}`}>
                            {activeSession ? `LIVE: ${activeSession.name}` : 'SYSTEM STANDBY'}
                        </h2>
                        <p className="text-xs text-dark-muted font-mono mt-0.5">
                            {activeSession ? `Session started at ${new Date(activeSession.created_at).toLocaleTimeString()}` : 'No active session running'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center xl:justify-end">
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/30 px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
                        >
                            Admin Console
                        </button>
                    )}

                    {!activeSession ? (
                        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto items-center bg-dark-bg/40 p-1.5 rounded-xl border border-dark-border/50">
                            <select
                                className="input-field py-2 text-sm max-w-[180px] bg-dark-bg text-white border-transparent focus:border-primary-500 rounded-lg"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                            >
                                <option value="" className="text-dark-muted">Select Class</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Session Name (e.g. Week 1)"
                                className="input-field py-2 text-sm w-full sm:w-48 bg-dark-bg text-white border-transparent focus:border-primary-500 rounded-lg"
                                value={sessionName}
                                onChange={(e) => setSessionName(e.target.value)}
                            />
                            <button
                                onClick={handleCreateSession}
                                disabled={!selectedClass || !sessionName}
                                className="btn-primary py-2 px-6 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                            >
                                Start Session
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleEndSession}
                            className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 px-8 py-2.5 font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                        >
                            End Session
                        </button>
                    )}

                    <div className="w-px h-8 bg-dark-border/50 mx-1 hidden sm:block"></div>

                    <button
                        onClick={handleLogout}
                        className="btn-secondary px-4 py-2.5 text-xs text-dark-muted hover:text-white"
                        title="Sign Out"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className={`grid grid-cols-1 ${activeSession ? 'lg:grid-cols-12' : ''} gap-6 flex-grow min-h-[500px]`}>

                {/* Visual Recognition Panel (Only visible when active) */}
                {activeSession && (
                    <div className="lg:col-span-5 flex flex-col h-[60vh] lg:h-auto min-h-[500px]">
                        <div className="glass-panel-heavy flex-grow flex flex-col overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-secondary-500 z-20"></div>

                            {/* Panel Header */}
                            <div className="px-5 py-3 border-b border-dark-border/50 bg-dark-bg/60 flex justify-between items-center backdrop-blur-md relative z-10">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live Recognition Feed</span>
                                </div>
                                <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                </div>
                            </div>

                            <div className="flex-grow relative bg-black">
                                <RecognitionPanel activeSession={activeSession} />

                                {/* Overlay gradient for premium feel */}
                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data & Controls Panel */}
                <div className={`${activeSession ? 'lg:col-span-7' : 'col-span-1'} flex flex-col h-[60vh] lg:h-auto min-h-[500px]`}>

                    {/* Modern Tabs */}
                    <div className="flex gap-2 mb-2 px-1">
                        {activeSession && (
                            <>
                                <button
                                    onClick={() => setActiveTab('live')}
                                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all relative overflow-hidden group ${activeTab === 'live'
                                        ? 'bg-dark-bg/80 text-primary-400 border-t border-x border-dark-border/50 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.3)]'
                                        : 'text-dark-muted hover:text-white hover:bg-dark-bg/40 border-t border-x border-transparent'
                                        }`}
                                >
                                    {activeTab === 'live' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Live Attendance
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('targets')}
                                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all relative overflow-hidden group ${activeTab === 'targets'
                                        ? 'bg-dark-bg/80 text-rose-400 border-t border-x border-dark-border/50 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.3)]'
                                        : 'text-dark-muted hover:text-white hover:bg-dark-bg/40 border-t border-x border-transparent'
                                        }`}
                                >
                                    {activeTab === 'targets' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>}
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Absentees
                                    </span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all relative overflow-hidden group ${activeTab === 'history'
                                ? 'bg-dark-bg/80 text-secondary-400 border-t border-x border-dark-border/50 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.3)]'
                                : 'text-dark-muted hover:text-white hover:bg-dark-bg/40 border-t border-x border-transparent'
                                }`}
                        >
                            {activeTab === 'history' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>}
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                Archives
                            </span>
                        </button>
                    </div>

                    {/* Tab Content Container */}
                    <div className="glass-panel-heavy flex-grow rounded-b-xl rounded-tr-xl flex flex-col overflow-hidden shadow-2xl relative">
                        {/* Soft top border connecting the active tab */}
                        <div className="absolute top-0 left-0 w-full h-px bg-dark-border/50 z-10"></div>

                        <div className="flex-grow overflow-auto custom-scrollbar p-1">
                            {activeSession && activeTab === 'live' && (
                                <div className="h-full flex flex-col gap-4 p-4 animate-fade-in">
                                    <LiveCorrectionPanel />
                                    <div className="flex-grow bg-dark-bg/30 border border-dark-border/30 rounded-xl overflow-hidden">
                                        <AttendanceTable />
                                    </div>
                                </div>
                            )}

                            {activeSession && activeTab === 'targets' && (
                                <div className="h-full animate-fade-in">
                                    <AbsenteeList />
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="h-full animate-fade-in p-2 sm:p-4">
                                    <SessionHistory />
                                </div>
                            )}

                            {/* Empty State Fallback */}
                            {!activeSession && activeTab !== 'history' && (
                                <div className="h-full flex flex-col items-center justify-center text-dark-muted p-8 text-center animate-fade-in">
                                    <div className="w-20 h-20 rounded-full bg-dark-bg/50 border border-dark-border/50 flex items-center justify-center mb-4">
                                        <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 tracking-wide">Ready for Session</h3>
                                    <p className="max-w-md text-sm">Select a class and enter a session name above to begin capturing attendance, or navigate to Archives to view past data.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
