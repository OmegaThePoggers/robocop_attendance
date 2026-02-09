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
        <div className="h-full flex flex-col">
            <div className="bg-slate-900 p-3 border-b border-slate-700 flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">User Directory & Biometric Links</h3>
                <span className="bg-primary/10 text-primary text-[10px] px-2 rounded-full border border-primary/20">{users.length} Users</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800 bg-slate-950">
                            <th className="p-3 font-semibold">User Profile</th>
                            <th className="p-3 font-semibold">Role</th>
                            <th className="p-3 font-semibold">Biometric ID (Dataset Ref)</th>
                            <th className="p-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map(user => (
                            <tr key={user.username} className="hover:bg-slate-800/50 transition-colors">
                                <td className="p-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-sm">{user.full_name || user.username}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">@{user.username}</span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${user.role === 'admin'
                                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                                            : 'bg-primary/10 text-primary border-primary/20'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-3 font-mono text-xs text-slate-400">
                                    {editingUser?.username === user.username ? (
                                        <input
                                            autoFocus
                                            className="bg-slate-950 border border-primary text-white px-2 py-1 rounded w-full focus:outline-none"
                                            value={identityInput}
                                            onChange={(e) => setIdentityInput(e.target.value)}
                                            placeholder="Enter Dataset ID..."
                                        />
                                    ) : (
                                        user.face_identity || <span className="text-slate-600 italic">Not Linked</span>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    {editingUser?.username === user.username ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={handleSave}
                                                className="text-green-400 hover:text-green-300 text-[10px] uppercase font-bold border border-green-500/50 px-2 py-1 rounded hover:bg-green-500/10"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingUser(null)}
                                                className="text-slate-500 hover:text-slate-300 text-[10px] uppercase font-bold px-2 py-1"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setEditingUser(user); setIdentityInput(user.face_identity || ""); }}
                                            className="text-primary hover:text-white text-[10px] uppercase font-bold border border-primary/30 hover:border-white px-3 py-1 rounded transition-all hover:bg-primary/10"
                                        >
                                            Edit Link
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
