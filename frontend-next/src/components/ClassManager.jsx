"use client";

import { useState, useEffect } from 'react';
import { getClasses, createClass, getUnassignedStudents, assignStudentClass } from '../lib/api';

export default function ClassManager() {
    const [classes, setClasses] = useState([]);
    const [unassigned, setUnassigned] = useState([]);
    const [loading, setLoading] = useState(false);

    const [newClassName, setNewClassName] = useState('');
    const [newClassDesc, setNewClassDesc] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [clsData, usersData] = await Promise.all([
                getClasses(),
                getUnassignedStudents()
            ]);
            setClasses(clsData);
            setUnassigned(usersData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!newClassName) return;
        try {
            await createClass(newClassName, newClassDesc);
            setNewClassName('');
            setNewClassDesc('');
            loadData();
        } catch (e) {
            alert('Failed to create class');
        }
    };

    const handleAssign = async (userId, classId) => {
        try {
            await assignStudentClass(userId, classId);
            loadData();
        } catch (e) {
            alert('Assignment Failed');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 text-textMain animate-fade-in">
            {/* Create Class Panel */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-background border border-border rounded-sm p-4 relative overflow-hidden group">
                    <h3 className="text-xs font-mono font-bold text-textMain uppercase tracking-widest mb-4 flex items-center gap-2">
                        CREATE_CLASS
                    </h3>

                    <form onSubmit={handleCreateClass} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-textMuted font-mono uppercase tracking-widest">CLASS NAME *</label>
                            <input
                                type="text"
                                placeholder="CS101"
                                className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-textMain font-mono text-xs focus:outline-none focus:border-accent transition-none placeholder:text-textMuted/50"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-textMuted font-mono uppercase tracking-widest">DESCRIPTION</label>
                            <input
                                type="text"
                                placeholder="..."
                                className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-textMain font-mono text-xs focus:outline-none focus:border-accent transition-none placeholder:text-textMuted/50"
                                value={newClassDesc}
                                onChange={(e) => setNewClassDesc(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full bg-transparent hover:bg-accent text-textMain hover:text-background border border-border hover:border-accent py-2 text-xs font-mono uppercase tracking-widest transition-colors mt-2 rounded-sm">
                            [EXECUTE]
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-background border border-border rounded-sm flex flex-col">
                    <h3 className="text-xs font-mono font-bold text-textMain uppercase tracking-widest p-4 sticky top-0 bg-surface border-b border-border z-10 flex justify-between items-center">
                        EXISTING_CLASSES
                        <span className="bg-border text-textMain text-[10px] px-2 py-0.5 rounded-sm">{classes.length}</span>
                    </h3>

                    <div className="flex-1 p-2 space-y-2">
                        {classes.map((c, idx) => (
                            <div key={c.id} className="p-3 bg-surface border border-border rounded-sm group hover:border-accent transition-colors animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-mono font-bold text-textMain text-sm group-hover:text-accent transition-colors">{c.name}</h4>
                                    <span className="text-[10px] text-textMuted font-mono">ID: {c.id}</span>
                                </div>
                                <p className="text-[10px] font-mono text-textMuted mt-1 line-clamp-2">{c.description || <span className="opacity-50">NO DESCRIPTION</span>}</p>
                            </div>
                        ))}
                        {classes.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-8 text-textMuted">
                                <p className="text-[10px] font-mono uppercase tracking-widest">[NO CLASSES]</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assignment Panel */}
            <div className="flex-1 bg-background border border-border rounded-sm flex flex-col overflow-hidden relative">
                <div className="bg-surface px-4 py-3 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xs font-mono font-bold text-textMain uppercase tracking-widest">PENDING_ASSIGNMENTS</h3>
                    </div>
                    <span className="bg-border text-textMain text-[10px] px-2 py-0.5 rounded-sm uppercase font-mono tracking-widest">
                        {unassigned.length} PENDING
                    </span>
                </div>

                <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                    {unassigned.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-textMuted py-20 animate-fade-in">
                            <div className="text-[10px] font-mono uppercase tracking-widest">[ALL LOGGED]</div>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {unassigned.map((user, idx) => (
                                <div key={user.id} className="bg-surface border border-border rounded-sm p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-accent transition-colors group animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-border border border-border flex items-center justify-center font-mono font-bold text-sm text-textMain shrink-0">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <h4 className="text-textMain font-mono text-sm group-hover:text-accent transition-colors">{user.full_name || user.username}</h4>
                                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-textMuted font-mono">
                                                <span>SAP: {user.sap_id || 'N/A'}</span>
                                                <span className="border-l border-border pl-2">SYS: {user.username}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <div className="relative w-full sm:w-48">
                                            <select
                                                className="w-full appearance-none bg-background border border-border text-textMain px-2 py-1.5 text-[10px] font-mono uppercase rounded-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                                                onChange={(e) => handleAssign(user.id, e.target.value)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled className="text-textMuted">SELECT CLASS...</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id} className="bg-background py-1">{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
