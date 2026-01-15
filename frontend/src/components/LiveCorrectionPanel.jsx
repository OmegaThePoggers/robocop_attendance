import { useState, useEffect } from 'react';
import { getUnknowns, resolveUnknown, getAbsentees } from '../api';

export default function LiveCorrectionPanel() {
    const [unknowns, setUnknowns] = useState([]);
    const [students, setStudents] = useState([]); // Candidates for assignment
    const [loading, setLoading] = useState(false);

    // For resolution selection
    const [selectedStudent, setSelectedStudent] = useState({});

    const fetchData = async () => {
        const u = await getUnknowns();
        setUnknowns(u);
        const s = await getAbsentees(); // We only care about absentees for assignment usually
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
            // Optimistic update
            setUnknowns(prev => prev.filter(u => u.id !== unknownId));
            setStudents(prev => prev.filter(s => s !== studentName));
        } catch (e) {
            alert('Failed to assign student');
        }
    }

    if (unknowns.length === 0) return null;

    return (
        <div className="bg-robocop-800 rounded-xl border border-robocop-700 shadow-lg p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-500/20 text-orange-400 p-2 rounded-lg">
                    ⚠️
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Unknown Faces Detected</h3>
                    <p className="text-sm text-robocop-400">Resolve these faces to mark attendance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unknowns.map(unknown => (
                    <div key={unknown.id} className="bg-robocop-900 border border-robocop-700 p-3 rounded-lg flex gap-3">
                        <img
                            src={`http://localhost:8000/static/${unknown.image_path}`}
                            alt="Unknown Face"
                            className="w-16 h-16 rounded object-cover border border-robocop-600"
                        />
                        <div className="flex-1 flex flex-col justify-between">
                            <span className="text-xs text-slate-500">
                                {new Date(unknown.timestamp).toLocaleTimeString()}
                            </span>

                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-robocop-800 border border-robocop-600 text-white text-xs rounded px-2 py-1 focus:outline-none"
                                    value={selectedStudent[unknown.id] || ''}
                                    onChange={(e) => setSelectedStudent({ ...selectedStudent, [unknown.id]: e.target.value })}
                                >
                                    <option value="">Select Student...</option>
                                    {students.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleAssign(unknown.id)}
                                    disabled={!selectedStudent[unknown.id]}
                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs px-2 rounded font-bold"
                                >
                                    ✓
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
