import { useState } from 'react';
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
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegistering) {
                await registerUser(username, password, fullName, faceIdentity);
                // Auto login or switch to login logic?
                // Let's just alert and switch to login for simplicity/security
                setIsRegistering(false);
                setLoading(false);
                alert("Account created! Please login.");
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
            setError(isRegistering ? 'Registration failed (Username might be taken)' : 'Invalid credentials');
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
                <h2 className="text-2xl font-bold text-white text-center mb-6 tracking-tight">
                    {isRegistering ? 'New Recruit' : 'System Access'}
                </h2>

                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-robocop-300 text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-robocop-900 border border-robocop-700 rounded px-3 py-2 text-white focus:outline-none focus:border-robocop-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-robocop-300 text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-robocop-900 border border-robocop-700 rounded px-3 py-2 text-white focus:outline-none focus:border-robocop-500 transition-colors"
                        />
                    </div>

                    {isRegistering && (
                        <>
                            <div>
                                <label className="block text-robocop-300 text-sm font-medium mb-1">
                                    Full Name <span className="text-robocop-600">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-robocop-900 border border-robocop-700 rounded px-3 py-2 text-white focus:outline-none focus:border-robocop-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-robocop-300 text-sm font-medium mb-1">
                                    Face Alias <span className="text-robocop-600">(e.g. "student_1_marie_curie")</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Matches your filename in dataset"
                                    value={faceIdentity}
                                    onChange={(e) => setFaceIdentity(e.target.value)}
                                    className="w-full bg-robocop-900 border border-robocop-700 rounded px-3 py-2 text-white focus:outline-none focus:border-robocop-500 transition-colors"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    If your dataset image is named "student_1_marie_curie.jpg", enter "student_1_marie_curie" here to link your face.
                                </p>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-robocop-500 hover:bg-robocop-400 text-white font-bold py-2 px-4 rounded transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isRegistering ? 'CREATE ACCOUNT' : 'INITIALIZE SESSION')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                        }}
                        className="text-sm text-robocop-400 hover:text-white underline"
                    >
                        {isRegistering ? 'Already have an account? Login' : 'Need an account? Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
