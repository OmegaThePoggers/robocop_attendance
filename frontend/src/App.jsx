import { useState, useEffect, useRef } from 'react';
import AttendanceTable from './components/AttendanceTable';
import RecognitionPanel from './components/RecognitionPanel';
import AbsenteeList from './components/AbsenteeList';
import SessionHistory from './components/SessionHistory';
import { createSession, getActiveSession, endSession } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('history');
  const [session, setSession] = useState(null);
  const [newSessionName, setNewSessionName] = useState('');
  const prevSessionRef = useRef(null);

  const fetchSession = async () => {
    const s = await getActiveSession();
    setSession(s);
  }

  useEffect(() => {
    fetchSession();
    const i = setInterval(fetchSession, 5000);
    return () => clearInterval(i);
  }, []);

  // Watch for session changes to auto-switch tabs
  useEffect(() => {
    if (session && !prevSessionRef.current) {
      setActiveTab('live');
    }
    prevSessionRef.current = session;
  }, [session]);

  const handleStartSession = async () => {
    if (!newSessionName) return;
    await createSession(newSessionName);
    setNewSessionName('');
    await fetchSession();
    setActiveTab('live');
  }

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this session?')) {
      await endSession();
      await fetchSession();
      setActiveTab('history');
    }
  }

  return (
    <div className="min-h-screen bg-robocop-900 text-slate-200 p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-robocop-500 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.5)] flex items-center justify-center font-bold text-white text-xl">
            R
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Robocop Attendance</h1>
            <p className="text-robocop-400 text-sm">Automated Biometric Surveillance System</p>
          </div>
        </div>

        <div className="bg-robocop-800 p-2 rounded-lg border border-robocop-700 flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 text-green-400 font-mono font-bold animate-pulse">
                🟢 LIVE: {session.name}
              </div>
              <button
                onClick={handleEndSession}
                className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-700 px-4 py-1 rounded text-sm font-bold shadow-lg transition-all"
              >
                END SESSION
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Session Name (e.g. Math 101)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="bg-robocop-900 border border-robocop-700 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-robocop-500"
              />
              <button
                onClick={handleStartSession}
                className="bg-robocop-500 hover:bg-robocop-400 text-white px-4 py-1 rounded text-sm font-bold shadow-lg transition-all"
              >
                START SESSION
              </button>
            </>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        <div className="lg:col-span-5 h-full">
          <RecognitionPanel />
        </div>
        <div className="lg:col-span-7 h-full flex flex-col">
          <div className="flex gap-2 mb-4">
            {session && (
              <>
                <button
                  onClick={() => setActiveTab('live')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'live'
                    ? 'bg-robocop-700 text-white shadow-lg border border-robocop-500'
                    : 'text-slate-400 hover:text-white hover:bg-robocop-800'
                    }`}
                >
                  Live Log
                </button>
                <button
                  onClick={() => setActiveTab('absent')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'absent'
                    ? 'bg-red-900/40 text-red-200 shadow-lg border border-red-500/50'
                    : 'text-slate-400 hover:text-red-200 hover:bg-red-900/20'
                    }`}
                >
                  Absentees
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history'
                ? 'bg-robocop-800 text-robocop-200 shadow-lg border border-robocop-600'
                : 'text-slate-400 hover:text-white hover:bg-robocop-800'
                }`}
            >
              History
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'live' && session && <AttendanceTable />}
            {activeTab === 'absent' && session && <AbsenteeList />}
            {activeTab === 'history' && <SessionHistory />}
            {(!session && activeTab !== 'history') && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-robocop-800/30 rounded-xl border border-robocop-800 border-dashed">
                <p className="text-lg">No Active Session</p>
                <p className="text-sm">Start a session to view live data.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
