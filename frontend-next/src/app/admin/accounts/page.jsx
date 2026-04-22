"use client";

import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { 
    getAllUsers, adminCreateUser, adminBatchCreate, 
    adminDeleteUser, adminBatchDelete, adminUpdateRole, adminResetPassword 
} from '../../../lib/api';

export default function AccountsPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    
    // Add User Form State
    const [newUser, setNewUser] = useState({ username: '', full_name: '', role: 'student', department: '', email: '' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [batchText, setBatchText] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data || []);
            setSelectedIds([]);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await adminCreateUser(newUser);
            setShowAddModal(false);
            setNewUser({ username: '', full_name: '', role: 'student', department: '', email: '' });
            loadUsers();
            alert("User created successfully with default password 'robocop'");
        } catch (error) {
            alert(error.message);
        }
    };

    const handleBatchCreate = async () => {
        try {
            const usernames = batchText.split('\n').map(u => u.trim()).filter(Boolean);
            if (usernames.length === 0) return;
            
            const batchUsers = usernames.map(u => ({ username: u, role: 'student' }));
            const res = await adminBatchCreate(batchUsers);
            
            alert(`Created: ${res.created.length}. Skipped (already exist): ${res.skipped.length}`);
            setShowBatchModal(false);
            setBatchText('');
            loadUsers();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (id, username) => {
        if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;
        try {
            await adminDeleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } catch (error) {
            alert(error.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} selected accounts? This will also remove all their associated data.`)) return;
        
        try {
            await adminBatchDelete(selectedIds);
            setUsers(users.filter(u => !selectedIds.includes(u.id)));
            setSelectedIds([]);
            alert("Selected accounts deleted successfully.");
        } catch (error) {
            alert(error.message);
        }
    };

    const handleResetPassword = async (id, username) => {
        if (!confirm(`Reset password for '${username}' to 'robocop'?`)) return;
        try {
            await adminResetPassword(id);
            alert(`Password reset for ${username}`);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await adminUpdateRole(id, newRole);
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (error) {
            alert(error.message);
        }
    };

    const handleToggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredUsers.map(u => u.id));
        } else {
            setSelectedIds([]);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <AppShell>
            <ProtectedRoute allowedRoles={['admin']}>
                <div className="max-w-7xl mx-auto p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Account Management</h1>
                            <p className="text-zinc-400 text-sm">Manage users, roles, and access credentials.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowBatchModal(true)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors border border-zinc-700">
                                Batch Create
                            </button>
                            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
                                + Add User
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden">
                        {/* Status Overlay for Selection */}
                        {selectedIds.length > 0 && (
                            <div className="absolute inset-0 bg-indigo-600/10 flex items-center px-4 justify-between animate-fade-in border-l-4 border-indigo-500">
                                <span className="text-sm font-medium text-indigo-300 font-mono">
                                    {selectedIds.length} ACCOUNTS SELECTED
                                </span>
                                <div className="flex gap-4">
                                    <button onClick={handleBulkDelete} className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-widest">
                                        Mass Remove
                                    </button>
                                    <button onClick={() => setSelectedIds([])} className="text-xs font-bold text-zinc-400 hover:text-zinc-300 uppercase tracking-widest">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Roles</option>
                            <option value="student">Students</option>
                            <option value="teacher">Teachers</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-300">
                                <thead className="text-xs uppercase bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium w-10">
                                            <input 
                                                type="checkbox" 
                                                onChange={handleSelectAll}
                                                checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                                                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-offset-zinc-900"
                                            />
                                        </th>
                                        <th className="px-6 py-4 font-medium">Username</th>
                                        <th className="px-6 py-4 font-medium">Full Name</th>
                                        <th className="px-6 py-4 font-medium">Role</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-8 text-zinc-500 font-mono text-xs uppercase tracking-widest">Initialising Database...</td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-8 text-zinc-500 font-mono text-xs uppercase tracking-widest">No matching accounts</td></tr>
                                    ) : filteredUsers.map((user) => (
                                        <tr key={user.id} className={`transition-colors group ${selectedIds.includes(user.id) ? 'bg-indigo-500/5' : 'hover:bg-zinc-800/20'}`}>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(user.id)}
                                                    onChange={() => handleToggleSelect(user.id)}
                                                    className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-offset-zinc-900"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                            <td className="px-6 py-4">{user.full_name || '-'}</td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="teacher">Teacher</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-3">
                                                <button onClick={() => handleResetPassword(user.id, user.username)} className="text-xs text-indigo-400 hover:text-indigo-300">
                                                    Reset Pass
                                                </button>
                                                <button onClick={() => handleDelete(user.id, user.username)} className="text-xs text-red-500 hover:text-red-400">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Add User Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                            <h2 className="text-xl font-bold text-white mb-6">Add New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Username *</label>
                                    <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name</label>
                                    <input type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Role</label>
                                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm">
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="mt-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                    <p className="text-xs text-indigo-300">Default password will be set to: <strong>robocop</strong></p>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800 transition">Cancel</button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition">Create User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Batch Create Modal */}
                {showBatchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
                            <h2 className="text-xl font-bold text-white mb-2">Batch Create Students</h2>
                            <p className="text-zinc-400 text-sm mb-4">Paste usernames, one per line. They will be created as students with password 'robocop'.</p>
                            <textarea 
                                value={batchText} 
                                onChange={(e) => setBatchText(e.target.value)}
                                rows={8}
                                placeholder="john_doe&#10;jane_smith&#10;student_001"
                                className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono"
                            />
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowBatchModal(false)} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800 transition">Cancel</button>
                                <button type="button" onClick={handleBatchCreate} className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition">Process List</button>
                            </div>
                        </div>
                    </div>
                )}
            </ProtectedRoute>
        </AppShell>
    );
}
