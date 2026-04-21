"use client";

import { useState, useEffect } from 'react';
import { getAllUsers, mapUserIdentity } from '../lib/api';

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
        <div className="h-full flex flex-col bg-background border border-border rounded-sm overflow-hidden relative text-textMain">
            <div className="bg-surface px-4 py-3 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-xs font-mono font-bold text-textMain uppercase tracking-tight leading-tight">Biometric Mapping</h3>
                        <p className="text-[10px] text-textMuted font-mono mt-0.5">LINK SYS IDENTITIES WITH FACIAL DATA</p>
                    </div>
                </div>
                <span className="bg-border text-textMain text-[10px] px-2 py-0.5 rounded-sm uppercase font-mono tracking-widest flex items-center gap-1.5">
                    {users.length} RECORDS
                </span>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface z-10 border-b border-border">
                        <tr className="text-textMuted text-[10px] uppercase font-mono tracking-widest border-b border-border">
                            <th className="py-2 pl-4">Profile Details</th>
                            <th className="py-2 px-3">Access Level</th>
                            <th className="py-2 px-3">Biometric Link</th>
                            <th className="py-2 pr-4 text-right">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {users.map((user, idx) => (
                            <tr key={user.username} className="hover:bg-surfaceHover transition-colors group animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                                <td className="py-2 pl-4 pr-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-border border border-border flex items-center justify-center font-mono font-bold text-xs text-textMain shrink-0">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-mono text-textMain text-sm group-hover:text-accent transition-colors truncate max-w-[150px]">{user.full_name || user.username}</span>
                                            <span className="text-[10px] text-textMuted font-mono">@{user.username}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-3">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-mono inline-block
                                        ${user.role === 'admin'
                                            ? 'bg-danger/20 text-danger border border-danger/30'
                                            : user.role === 'teacher'
                                                ? 'bg-accent/20 text-accent border border-accent/30'
                                                : 'bg-surface text-textMuted border border-border'
                                        }`}
                                    >
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-2 px-3">
                                    {editingUser?.username === user.username ? (
                                        <div className="relative w-full max-w-[200px] animate-fade-in text-textMain">
                                            <input
                                                autoFocus
                                                className="bg-background border border-accent/50 text-textMain px-2 py-1 text-xs rounded-sm w-full focus:outline-none focus:border-accent font-mono transition-none"
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
                                                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                                    <span className="text-xs text-textMain font-mono tracking-wide">{user.face_identity}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                                                    <span className="text-xs text-textMuted font-mono italic">[UNLINKED]</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="py-2 pr-4 text-right w-[180px]">
                                    {editingUser?.username === user.username ? (
                                        <div className="flex justify-end gap-2 animate-fade-in">
                                            <button
                                                onClick={() => setEditingUser(null)}
                                                className="bg-transparent text-textMuted hover:text-danger text-[10px] font-mono border border-border px-2 py-1 transition-colors rounded-sm"
                                            >
                                                [X]
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="bg-transparent hover:bg-success hover:border-success hover:text-background text-[10px] font-mono text-textMain border border-border px-3 py-1 transition-colors rounded-sm uppercase"
                                            >
                                                [SAVE]
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setEditingUser(user); setIdentityInput(user.face_identity || ""); }}
                                            className="text-textMuted hover:text-accent font-mono text-[10px] uppercase transition-colors"
                                        >
                                            [{user.face_identity ? 'REASSIGN' : 'LINK'}]
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-20">
                    <p className="text-xs text-textMuted font-mono uppercase tracking-widest">[NO USERS FOUND]</p>
                </div>
            )}
        </div>
    );
}
