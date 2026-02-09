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
        } catch (e) {
            alert('Assignment Failed');
        }
    }

    if (unknowns.length === 0) return null;

    return (
        <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-4 mb-4 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
                <div className="text-yellow-500 animate-pulse">⚠️</div>
                <div>
                    <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wide">Unidentified Students</h3>
                    <p className="text-[10px] text-yellow-500/70">Please identify the following faces manually.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unknowns.map(unknown => (
                    <div key={unknown.id} className="bg-slate-900 border border-slate-700 rounded p-2 flex gap-3">
                        <img
                            src={`http://localhost:8000/static/${unknown.image_path}`}
                            alt="Unknown"
                            className="w-16 h-16 object-cover rounded border border-slate-600"
                        />

                        <div className="flex-1 flex flex-col justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(unknown.timestamp).toLocaleTimeString()}
                            </span>

                            <div className="relative">
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 text-white text-[10px] rounded px-2 py-1 focus:outline-none focus:border-yellow-500 appearance-none"
                                    value={selectedStudent[unknown.id] || ''}
                                    onChange={(e) => {
                                        const studentName = e.target.value;
                                        if (studentName) {
                                            handleAssign(unknown.id);
                                        }
                                        setSelectedStudent({ ...selectedStudent, [unknown.id]: studentName });
                                    }}
                                >
                                    <option value="">Identify Student...</option>
                                    {students.map(s => (
                                        <option key={s} value={s}>{s.replace('student_', '')}</option>
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
