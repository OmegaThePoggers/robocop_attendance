import { useState, useEffect } from 'react';
import { getAllUsers, mapUserIdentity } from '../api';

export default function UserMapper() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [identityInput, setIdentityInput] = useState("");

    const loadUsers = async () => {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSave = async () => {
        if (!editingUser) return;
        try {
            await mapUserIdentity(editingUser.username, identityInput);
            setEditingUser(null);
            loadUsers();
        } catch (e) {
            alert("Mapping Failed");
        }
    }

    return (
        <div className="h-full flex flex-col bg-dark-bg/40 border-none rounded-xl overflow-hidden relative shadow-inner">
            {/* Top glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary-600/0 via-secondary-500/50 to-secondary-600/0 opacity-50"></div>

            <div className="bg-dark-bg/80 px-5 py-4 border-b border-dark-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-secondary-500/10 rounded-lg shrink-0">
                        <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest leading-tight">Biometric Database</h3>
                        <p className="text-[10px] text-dark-muted font-mono mt-0.5">Map system identities with facial data</p>
                    </div>
                </div>
                <span className="bg-secondary-500/20 text-secondary-400 text-[10px] px-3 py-1 rounded-full border border-secondary-500/30 uppercase font-bold tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.2)] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-400 animate-pulse-slow"></span>
                    {users.length} Users Total
                </span>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-bg/95 backdrop-blur-md z-10 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)]">
                        <tr className="text-dark-muted text-[10px] uppercase font-bold tracking-widest border-b border-dark-border/50">
                            <th className="py-3 pl-5 bg-dark-bg/50">Profile Details</th>
                            <th className="py-3 px-3 bg-dark-bg/50">Access Level</th>
                            <th className="py-3 px-3 bg-dark-bg/50">Biometric Reference</th>
                            <th className="py-3 pr-5 text-right bg-dark-bg/50">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/30">
                        {users.map((user, idx) => (
                            <tr key={user.username} className="hover:bg-secondary-500/5 transition-colors group animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                                <td className="py-3 pl-5 pr-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-dark-bg border border-dark-border/80 overflow-hidden flex items-center justify-center font-bold text-sm text-slate-500 group-hover:border-secondary-500/30 transition-colors shrink-0">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{user.full_name || user.username}</span>
                                            <span className="text-[10px] text-dark-muted font-mono bg-dark-bg px-1.5 py-0.5 rounded border border-dark-border/30 w-fit mt-1">@{user.username}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-3">
                                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider inline-block
                                        ${user.role === 'admin'
                                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.1)]'
                                            : user.role === 'teacher'
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                                                : 'bg-primary-500/10 text-primary-400 border border-primary-500/30 shadow-[0_0_8px_rgba(168,85,247,0.1)]'
                                        }`}
                                    >
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-3 px-3">
                                    {editingUser?.username === user.username ? (
                                        <div className="relative w-full max-w-[200px] animate-fade-in">
                                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-dark-muted">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                            </div>
                                            <input
                                                autoFocus
                                                className="bg-dark-bg border border-secondary-500/50 text-white pl-8 pr-3 py-1.5 text-xs rounded-md w-full focus:outline-none focus:ring-1 focus:ring-secondary-500 shadow-[0_0_10px_rgba(168,85,247,0.1)] font-mono transition-all"
                                                value={identityInput}
                                                onChange={(e) => setIdentityInput(e.target.value)}
                                                placeholder="e.g. student_001"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {user.face_identity ? (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-success/80 shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span>
                                                    <span className="text-xs text-slate-300 font-mono tracking-wide">{user.face_identity}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-dark-muted/40"></span>
                                                    <span className="text-xs text-dark-muted italic">Unlinked Identity</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="py-3 pr-5 text-right w-[180px]">
                                    {editingUser?.username === user.username ? (
                                        <div className="flex justify-end gap-2 animate-fade-in">
                                            <button
                                                onClick={() => setEditingUser(null)}
                                                className="btn-outline px-3 py-1.5 border-dark-border text-dark-muted hover:text-white"
                                            >
                                                ✕
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white bg-success/80 hover:bg-success hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] rounded transition-all flex items-center gap-1.5"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setEditingUser(user); setIdentityInput(user.face_identity || ""); }}
                                            className="btn-outline border-dark-border/60 hover:border-secondary-500/50 hover:text-secondary-400 hover:bg-secondary-500/10 group-hover:opacity-100 opacity-70 transition-all text-[10px] flex items-center justify-center gap-1.5 ml-auto"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            {user.face_identity ? 'Reassign' : 'Link Identity'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-bg/80 backdrop-blur-sm z-20">
                    <svg className="w-10 h-10 text-dark-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    <p className="text-sm text-slate-300 font-bold uppercase tracking-widest">No Users Found</p>
                    <p className="text-xs text-dark-muted mt-1">The system currently has no registered users.</p>
                </div>
            )}
        </div>
    );
}
