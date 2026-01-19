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
        <div className="min-h-screen bg-robocop-900 text-slate-200 p-8">
            <header className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg">
                        A
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Console</h1>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/dashboard')} className="text-robocop-400 hover:text-white">
                        Back to Live Dashboard
                    </button>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-white">Logout</button>
                </div>
            </header>

            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('disputes')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'disputes' ? 'bg-robocop-700 text-white shadow-lg' : 'text-slate-400 hover:bg-robocop-800'
                        }`}
                >
                    Disputes
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'users' ? 'bg-robocop-700 text-white shadow-lg' : 'text-slate-400 hover:bg-robocop-800'
                        }`}
                >
                    User Mapping
                </button>
            </div>

            {activeTab === 'disputes' && <DisputeList />}
            {activeTab === 'users' && <UserMapper />}
        </div>
    );
}
