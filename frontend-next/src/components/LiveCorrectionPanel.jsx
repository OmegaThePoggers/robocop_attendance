"use client";

import { useState, useEffect } from 'react';
import { getUnknowns, resolveUnknown, getAbsentees, STATIC_URL } from '../lib/api';

export default function LiveCorrectionPanel({ updateTrigger }) {
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
    }, [updateTrigger]);

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
        <div className="bg-surface border-l-2 border-l-danger border-y border-r border-border rounded-sm p-4 mb-2 animate-fade-in text-textMain">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-danger text-white font-mono font-bold text-xs shrink-0 rounded-sm">
                    !
                </div>
                <div>
                    <h3 className="text-sm font-mono font-medium text-danger uppercase tracking-tight flex items-center gap-2">
                        Unidentified Targets <span className="bg-danger/20 text-danger px-2 text-[10px] rounded-sm">{unknowns.length}</span>
                    </h3>
                    <p className="text-xs text-textMuted font-mono mt-0.5">Manual identification required for the following captures.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unknowns.map(unknown => (
                    <div key={unknown.id} className="bg-background border border-border rounded-sm p-2 flex gap-3 hover:border-danger transition-colors group">
                        <div className="relative shrink-0 w-16 h-16">
                            <img
                                src={`${STATIC_URL}/${unknown.image_path}`}
                                alt="Unknown"
                                className="w-full h-full object-cover rounded-sm border border-border grayscale hover:grayscale-0 transition-all duration-300"
                            />
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-textMuted font-mono uppercase">
                                    {new Date(unknown.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="relative mt-auto">
                                <select
                                    className="w-full bg-surface border border-border text-textMain text-xs font-mono rounded-sm px-2 py-1.5 outline-none focus:border-danger transition-colors appearance-none"
                                    value={selectedStudent[unknown.id] || ''}
                                    onChange={(e) => {
                                        const studentName = e.target.value;
                                        setSelectedStudent({ ...selectedStudent, [unknown.id]: studentName });
                                        if (studentName) handleAssign(unknown.id);
                                    }}
                                >
                                    <option value="" className="text-textMuted">Identify...</option>
                                    {students.map(s => (
                                        <option key={s} value={s}>{s.replace('student_', '').replace(/^\d+_/, '').replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
