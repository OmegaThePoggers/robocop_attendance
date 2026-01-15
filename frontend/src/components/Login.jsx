import { useState } from 'react';
import { loginUser } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await loginUser(username, password);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);
            if (data.role === 'student') {
                navigate('/student');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-robocop-900 flex items-center justify-center p-4">
            <div className="bg-robocop-800 p-8 rounded-xl border border-robocop-700 shadow-2xl w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="h-16 w-16 bg-robocop-500 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.5)] flex items-center justify-center font-bold text-white text-3xl">
                        R
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-6 tracking-tight">System Access</h2>

                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-robocop-300 text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-robocop-900 border border-robocop-700 rounded px-3 py-2 text-white focus:outline-none focus:border-robocop-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-robocop-300 text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-robocop-900 border border-robocop-700 rounded px-3 py-2 text-white focus:outline-none focus:border-robocop-500 transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-robocop-500 hover:bg-robocop-400 text-white font-bold py-2 px-4 rounded transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'INITIALIZE SESSION'}
                    </button>
                </form>
            </div>
        </div>
    );
}
