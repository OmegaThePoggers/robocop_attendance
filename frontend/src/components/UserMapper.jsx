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

    const handleEdit = (user) => {
        setEditingUser(user);
        setIdentityInput(user.face_identity || "");
    }

    const handleSave = async () => {
        if (!editingUser) return;
        try {
            await mapUserIdentity(editingUser.username, identityInput);
            setEditingUser(null);
            loadUsers();
        } catch (e) {
            alert("Failed to map identity");
        }
    }

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 overflow-hidden">
            <div className="p-4 border-b border-robocop-700 flex justify-between items-center bg-robocop-900/50">
                <h3 className="font-bold text-white">User Identity Mapping</h3>
                <button onClick={loadUsers} className="text-sm text-robocop-400 hover:text-white">Refresh</button>
            </div>

            <table className="w-full text-left">
                <thead className="bg-robocop-900/50 text-robocop-400 uppercase text-xs">
                    <tr>
                        <th className="p-4">Username</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Mapped Face Identity</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-robocop-700">
                    {users.map(user => (
                        <tr key={user.username} className="hover:bg-robocop-700/30">
                            <td className="p-4 font-mono text-white">{user.username}</td>
                            <td className="p-4 text-slate-400">{user.role}</td>
                            <td className="p-4">
                                {editingUser?.username === user.username ? (
                                    <input
                                        type="text"
                                        className="bg-robocop-900 border border-robocop-600 rounded px-2 py-1 text-white text-sm w-full"
                                        value={identityInput}
                                        onChange={(e) => setIdentityInput(e.target.value)}
                                        placeholder="e.g. student_1_albert_einstein"
                                    />
                                ) : (
                                    <span className={user.face_identity ? "text-green-400 font-mono" : "text-slate-500 italic"}>
                                        {user.face_identity || "Unmapped"}
                                    </span>
                                )}
                            </td>
                            <td className="p-4">
                                {editingUser?.username === user.username ? (
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} className="text-green-400 hover:text-white font-bold">Save</button>
                                        <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">Cancel</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="text-robocop-400 hover:text-white"
                                    >
                                        Edit
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
