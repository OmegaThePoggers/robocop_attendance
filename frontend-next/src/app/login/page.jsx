"use client";

import { useState } from 'react';
import { loginUser } from '../../lib/api';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await loginUser(username, password);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);
            if (data.role === 'student') {
                router.push('/student');
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Login Failed: Invalid Credentials');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AppShell>
            <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative z-10 w-full animate-fade-in">
                {/* Ambient Lighting specific to login */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full max-h-lg bg-primary-600/10 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-md w-full glass-panel-heavy p-8 sm:p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary-500 to-primary-600"></div>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20 mb-6 mx-auto">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-dark-muted text-sm font-medium">Please enter your credentials to access the portal.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg flex items-start gap-2 animate-fade-in">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="label-text">Username / ID</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-dark-muted">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="input-field pl-11"
                                        placeholder="Enter your ID"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="label-text !mb-0">Password</label>
                                    <a href="#" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">Forgot password?</a>
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-dark-muted">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field pl-11"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3.5 text-base shadow-primary-500/25 flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Authenticating
                                    </>
                                ) : 'Sign In'}
                            </button>
                        </div>

                        <p className="text-center text-sm text-dark-muted mt-6">
                            Don&apos;t have an account?{' '}
                            <button type="button" onClick={() => router.push('/register')} className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Register now
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </AppShell>
    );
}
