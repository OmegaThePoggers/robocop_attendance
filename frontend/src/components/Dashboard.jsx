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
        if (!sessionName) return;
        try {
            await createSession(sessionName);
            setSessionName('');
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
        <div className="h-full flex flex-col space-y-6">
            {/* Command Bar */}
            <div className="bg-slate-900 border border-slate-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-lg shadow-lg">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${activeSession ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-600'}`}></div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            {activeSession ? `SESSION ACTIVE: ${activeSession.name}` : 'NO ACTIVE SESSION'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-mono">
                            {activeSession ? `STARTED: ${new Date(activeSession.created_at).toLocaleTimeString()}` : 'SYSTEM STANDBY'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto items-center">
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded transition-all whitespace-nowrap"
                        >
                            Admin Console
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded transition-all whitespace-nowrap"
                    >
                        Logout
                    </button>
                    {!activeSession ? (
                        <div className="flex gap-2 w-full">
                            <input
                                type="text"
                                placeholder="Class Name (e.g. CS101)"
                                className="bg-slate-950 border border-slate-700 text-white px-3 py-2 text-sm font-mono rounded focus:border-primary focus:outline-none flex-grow"
                                value={sessionName}
                                onChange={(e) => setSessionName(e.target.value)}
                            />
                            <button
                                onClick={handleCreateSession}
                                className="bg-primary hover:bg-primary/80 text-slate-950 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded transition-all whitespace-nowrap"
                            >
                                Start Class
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleEndSession}
                            className="w-full md:w-auto bg-slate-800 hover:bg-red-900/30 text-red-400 border border-red-900/50 hover:border-red-500 px-6 py-2 font-bold text-xs uppercase tracking-wider rounded transition-all"
                        >
                            End Class
                        </button>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
                {/* Left Panel: Camera Feed (Only visible when session active) */}
                {activeSession && (
                    <div className="lg:col-span-5 flex flex-col h-[600px] lg:h-auto min-h-[500px]">
                        <div className="flex-grow bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative shadow-lg">
                            {/* Header */}
                            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Camera Feed</span>
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                </div>
                            </div>
                            <RecognitionPanel activeSession={activeSession} />
                        </div>
                    </div>
                )}

                {/* Right Panel: Data Tabs */}
                <div className={`${activeSession ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col h-full space-y-4`}>
                    <div className="flex border-b border-slate-800 space-x-1">
                        {activeSession && (
                            <>
                                <button
                                    onClick={() => setActiveTab('live')}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'live'
                                        ? 'bg-slate-800 text-primary border-t border-x border-slate-700'
                                        : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    Live Attendance
                                </button>
                                <button
                                    onClick={() => setActiveTab('targets')}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'targets'
                                        ? 'bg-slate-800 text-red-400 border-t border-x border-slate-700'
                                        : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    Absentees
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'history'
                                ? 'bg-slate-800 text-purple-400 border-t border-x border-slate-700'
                                : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            Archives
                        </button>
                    </div>

                    <div className="flex-grow bg-slate-900/50 border border-slate-800 rounded-b-lg rounded-tr-lg p-1 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 overflow-auto custom-scrollbar p-2">
                            {activeSession && activeTab === 'live' && (
                                <div className="h-full flex flex-col gap-4">
                                    <LiveCorrectionPanel />
                                    <div className="flex-grow">
                                        <AttendanceTable />
                                    </div>
                                </div>
                            )}
                            {activeSession && activeTab === 'targets' && <AbsenteeList />}
                            {activeTab === 'history' && <SessionHistory />}
                            {/* Fallback if tab is active but session ended */}
                            {!activeSession && activeTab !== 'history' && (
                                <div className="h-full flex items-center justify-center text-slate-500">
                                    Select Archives to view past sessions.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
