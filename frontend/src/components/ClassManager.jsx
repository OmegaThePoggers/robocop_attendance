import { useState, useEffect } from 'react';
import { getClasses, createClass, getUnassignedStudents, assignStudentClass } from '../api';

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
        <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in">
            {/* Create Class Panel */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-dark-bg/60 border border-dark-border/80 rounded-xl p-5 shadow-inner relative overflow-hidden group">
                    {/* Ambient hover glow */}
                    <div className="absolute inset-0 bg-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Create New Class
                    </h3>

                    <form onSubmit={handleCreateClass} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-dark-muted uppercase font-bold tracking-widest ml-1">Class Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. CS 101"
                                className="w-full bg-dark-bg/80 border border-dark-border/80 rounded-lg px-4 py-2.5 text-white text-sm focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500/50 transition-all placeholder:text-dark-muted/50"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-dark-muted uppercase font-bold tracking-widest ml-1">Description</label>
                            <input
                                type="text"
                                placeholder="Optional details..."
                                className="w-full bg-dark-bg/80 border border-dark-border/80 rounded-lg px-4 py-2.5 text-white text-sm focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500/50 transition-all placeholder:text-dark-muted/50"
                                value={newClassDesc}
                                onChange={(e) => setNewClassDesc(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full btn-secondary py-3 text-sm flex items-center justify-center gap-2 mt-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Create Class
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-dark-bg/40 border border-dark-border/50 rounded-xl p-5 shadow-inner flex flex-col">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 sticky top-0 bg-dark-bg/90 backdrop-blur pb-2 border-b border-dark-border/50 z-10 flex justify-between items-center">
                        Existing Classes
                        <span className="bg-dark-bg text-dark-muted text-[10px] px-2 py-0.5 rounded-full border border-dark-border/50">{classes.length}</span>
                    </h3>

                    <div className="space-y-3 flex-1">
                        {classes.map((c, idx) => (
                            <div key={c.id} className="p-4 bg-dark-bg/80 border border-dark-border/80 rounded-lg group hover:border-secondary-500/30 hover:shadow-[0_4px_20px_-4px_rgba(168,85,247,0.1)] transition-all animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-white text-base group-hover:text-secondary-400 transition-colors">{c.name}</h4>
                                    <span className="text-[10px] text-dark-muted font-mono bg-dark-bg px-2 py-0.5 rounded-md border border-dark-border/50">ID: {c.id}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{c.description || <span className="italic opacity-50">No description provided</span>}</p>
                            </div>
                        ))}
                        {classes.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-dark-muted">
                                <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <p className="text-xs uppercase tracking-widest font-bold">No Classes Found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assignment Panel */}
            <div className="flex-1 bg-dark-bg/40 border border-dark-border/50 rounded-xl flex flex-col overflow-hidden relative shadow-inner">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600/0 via-primary-500/50 to-primary-600/0 opacity-50"></div>

                <div className="bg-dark-bg/80 px-5 py-4 border-b border-dark-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-primary-500/10 rounded-lg shrink-0">
                            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pending Assignments</h3>
                    </div>
                    <span className="bg-primary-500/20 text-primary-400 text-[10px] px-3 py-1 rounded-full border border-primary-500/30 uppercase font-bold tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        {unassigned.length} Pending
                    </span>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {unassigned.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-dark-muted py-20 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-success/5 border border-success/10 flex items-center justify-center mb-4 text-success/60">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div className="text-sm font-bold text-slate-300 uppercase tracking-widest">All Caught Up</div>
                            <div className="text-xs opacity-60 mt-1">Every student is assigned to a class.</div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {unassigned.map((user, idx) => (
                                <div key={user.id} className="bg-dark-bg/60 border border-dark-border/80 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all group shadow-sm animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border/80 overflow-hidden flex items-center justify-center font-bold text-xl text-primary-400/50 shadow-inner group-hover:border-primary-500/30 transition-colors">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-white font-bold group-hover:text-primary-300 transition-colors">{user.full_name || user.username}</h4>
                                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-dark-muted font-mono">
                                                <span className="bg-dark-bg px-2 py-0.5 rounded border border-dark-border/50">SAP: <span className="text-secondary-400 font-bold">{user.sap_id || 'N/A'}</span></span>
                                                <span className="bg-dark-bg px-2 py-0.5 rounded border border-dark-border/50">SYS: {user.username}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <div className="relative w-full sm:w-48">
                                            <select
                                                className="w-full appearance-none bg-dark-bg border border-dark-border text-slate-200 px-4 py-2.5 text-xs font-medium rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all group-hover:border-primary-500/50 cursor-pointer pr-10"
                                                onChange={(e) => handleAssign(user.id, e.target.value)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled className="text-dark-muted">Select class to assign...</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id} className="bg-dark-bg py-2">{c.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-dark-muted">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
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
