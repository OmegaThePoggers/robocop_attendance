import { useState, useEffect } from 'react';
import { loginUser, registerUser } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [faceIdentity, setFaceIdentity] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [scanLine, setScanLine] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => setScanLine(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegistering) {
                await registerUser(username, password, fullName, faceIdentity);
                setIsRegistering(false);
                setLoading(false);
                alert("Registration Successful. Please Login.");
                return;
            }

            const data = await loginUser(username, password);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);

            if (data.role === 'student') {
                navigate('/student');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(isRegistering ? 'Registration Failed: ID Conflict' : 'Login Failed: Invalid Credentials');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020617]">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

            <div className={`relative z-10 w-full max-w-md transition-all duration-700 ${scanLine ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="bg-slate-950 p-6 border-b border-slate-700 text-center">
                        <div className="inline-block p-3 rounded-full bg-primary/10 mb-3">
                            <div className="text-2xl text-primary">🎓</div>
                        </div>
                        <h2 className="text-xl font-display font-bold text-white tracking-wide uppercase">
                            {isRegistering ? 'Student Registration' : 'Portal Login'}
                        </h2>
                        <p className="text-slate-500 text-xs font-mono mt-1">
                            {isRegistering ? 'Create New Profile' : 'Access Your Dashboard'}
                        </p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username / NetID</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                                    placeholder="Enter ID..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                                    placeholder="••••••••"
                                />
                            </div>

                            {isRegistering && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-top-2 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                                            placeholder="Student Name..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biometric ID (Optional)</label>
                                        <input
                                            type="text"
                                            value={faceIdentity}
                                            onChange={(e) => setFaceIdentity(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-700"
                                            placeholder="Dataset Filename..."
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-bold text-sm py-3 px-4 rounded transition-all uppercase tracking-widest ${isRegistering
                                        ? 'bg-primary hover:bg-primary/90 text-slate-950'
                                        : 'bg-primary hover:bg-primary/90 text-slate-950'
                                    }`}
                            >
                                {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
                            </button>
                        </form>

                        <div className="mt-6 flex justify-between items-center text-xs">
                            <span className="text-slate-500">{isRegistering ? "Have an account?" : "Need an account?"}</span>
                            <button
                                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                                className="text-primary hover:text-white uppercase tracking-wider hover:underline"
                            >
                                {isRegistering ? "Sign In" : "Register"}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-xs rounded flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-[10px] text-slate-600 font-mono">SECURE ACADEMIC PORTAL ACCESS</p>
                </div>
            </div>
        </div>
    );
}
