import { useState } from 'react';
import DisputeList from './DisputeList';
import UserMapper from './UserMapper';
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
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono relative">
            <header className="mb-8 flex justify-between items-end border-b border-slate-800 pb-4">
                <div className="flex items-center gap-6">
                    <div className="h-12 w-12 bg-secondary/20 border border-secondary text-secondary flex items-center justify-center font-bold text-2xl rounded-lg">
                        A
                    </div>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-white uppercase tracking-wider">System Administration</h1>
                        <p className="text-secondary/70 text-xs mt-1">Academic Records & System Configuration</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider px-3 py-1"
                    >
                        Live Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold uppercase tracking-wide transition-all"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="flex gap-2 mb-8">
                <button
                    onClick={() => setActiveTab('disputes')}
                    className={`px-6 py-2 text-sm font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'disputes'
                            ? 'bg-secondary text-white shadow-lg'
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                >
                    Dispute Resolution
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2 text-sm font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'users'
                            ? 'bg-secondary text-white shadow-lg'
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                >
                    Biometric Mapping
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 min-h-[500px] shadow-xl">
                {activeTab === 'disputes' && <DisputeList />}
                {activeTab === 'users' && <UserMapper />}
            </div>
        </div>
    );
}
