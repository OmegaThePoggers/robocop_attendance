import { useState, useEffect } from 'react';
import { getUnknowns, resolveUnknown, getAbsentees } from '../api';

export default function LiveCorrectionPanel() {
    const [unknowns, setUnknowns] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState({});

    const fetchData = async () => {
        const u = await getUnknowns();
        setUnknowns(u);
        const s = await getAbsentees();
        setStudents(s);
    }

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleAssign = async (unknownId) => {
        const studentName = selectedStudent[unknownId];
        if (!studentName) return;

        try {
            await resolveUnknown(unknownId, studentName);
            setUnknowns(prev => prev.filter(u => u.id !== unknownId));
            setStudents(prev => prev.filter(s => s !== studentName));
            setSelectedStudent(prev => {
                const newState = { ...prev };
                delete newState[unknownId];
                return newState;
            });
        } catch (e) {
            alert('Assignment Failed');
        }
    }

    if (unknowns.length === 0) return null;

    return (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-2 relative overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.1)] backdrop-blur-sm animate-fade-in">
            {/* Warning gradient top border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600"></div>

            <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
                        Unidentified Students <span className="bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded-full">{unknowns.length}</span>
                    </h3>
                    <p className="text-xs text-amber-500/70 mt-0.5">Please identify the following faces manually.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unknowns.map(unknown => (
                    <div key={unknown.id} className="bg-dark-bg/60 border border-dark-border/80 rounded-lg p-3 flex gap-4 hover:border-amber-500/50 transition-colors group">
                        <div className="relative shrink-0 w-20 h-20">
                            <img
                                src={`http://localhost:8000/static/${unknown.image_path}`}
                                alt="Unknown"
                                className="w-full h-full object-cover rounded-md border border-dark-border"
                            />
                            {/* Scanning line animation */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-[scanline_2s_ease-in-out_infinite]"></div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-dark-muted font-mono bg-dark-bg px-2 py-0.5 rounded border border-dark-border/50">
                                    {new Date(unknown.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="relative mt-auto">
                                <select
                                    className="w-full bg-dark-bg border border-dark-border text-slate-200 text-xs rounded-md px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 appearance-none transition-all"
                                    value={selectedStudent[unknown.id] || ''}
                                    onChange={(e) => {
                                        const studentName = e.target.value;
                                        setSelectedStudent({ ...selectedStudent, [unknown.id]: studentName });
                                        if (studentName) {
                                            // Optional: auto-assign when selected, or wait for explicit button clik. 
                                            // The original code auto-assigned.
                                            handleAssign(unknown.id);
                                        }
                                    }}
                                >
                                    <option value="" className="text-dark-muted">Identify Student...</option>
                                    {students.map(s => (
                                        <option key={s} value={s}>{s.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-dark-muted group-focus-within:text-amber-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
