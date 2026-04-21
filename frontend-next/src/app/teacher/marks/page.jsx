"use client";
import { useState } from 'react';
import AppShell from '../../../components/AppShell';
import { getAllUsers, getStudentMarks, upsertMark } from '../../../lib/api';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Economics', 'Statistics', 'Data Structures', 'Algorithms'];

const GRADE_COLORS = {
    'A+': 'text-emerald-400', 'A': 'text-emerald-400',
    'B+': 'text-blue-400', 'B': 'text-blue-400',
    'C': 'text-amber-400', 'D': 'text-orange-400', 'F': 'text-red-400',
};

export default function TeacherMarksPage() {
    const [students, setStudents] = useState(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [marks, setMarks] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ subject: SUBJECTS[0], semester: 1, internal_marks: '', external_marks: '', practical_marks: '', max_marks: 100 });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const loadStudents = async () => {
        setLoading(true);
        const users = await getAllUsers();
        setStudents(users.filter(u => u.role === 'student'));
        setLoading(false);
    };

    const selectStudent = async (student) => {
        setSelected(student);
        setMarks(null);
        setMsg('');
        const data = await getStudentMarks(student.username);
        setMarks(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selected) return;
        setSaving(true);
        setMsg('');
        try {
            await upsertMark({
                student_username: selected.username,
                subject: form.subject,
                semester: parseInt(form.semester),
                internal_marks: form.internal_marks !== '' ? parseFloat(form.internal_marks) : null,
                external_marks: form.external_marks !== '' ? parseFloat(form.external_marks) : null,
                practical_marks: form.practical_marks !== '' ? parseFloat(form.practical_marks) : null,
                max_marks: parseFloat(form.max_marks),
            });
            const data = await getStudentMarks(selected.username);
            setMarks(data);
            setMsg('Marks saved successfully.');
        } catch {
            setMsg('Failed to save marks.');
        }
        setSaving(false);
    };

    const filtered = students ? students.filter(s =>
        (s.full_name || s.username).toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase())
    ) : [];

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Marks Management</h1>
                    <p className="text-dark-muted text-sm mt-1">Enter or update student academic marks</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Student selector */}
                    <div className="glass-panel p-5 space-y-3">
                        <h2 className="text-sm font-bold text-white">Select Student</h2>
                        <div className="flex gap-2">
                            <input
                                className="input-field flex-1 text-sm"
                                placeholder="Search students..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onFocus={() => { if (!students) loadStudents(); }}
                            />
                        </div>
                        {loading && <p className="text-xs text-dark-muted">Loading...</p>}
                        {students && (
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {filtered.map(s => (
                                    <button
                                        key={s.username}
                                        onClick={() => selectStudent(s)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected?.username === s.username ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' : 'text-dark-muted hover:text-white hover:bg-dark-border/40'}`}
                                    >
                                        <p className="font-medium">{s.full_name || s.username}</p>
                                        <p className="text-xs opacity-60">{s.username} · {s.department || 'No dept'}</p>
                                    </button>
                                ))}
                                {filtered.length === 0 && <p className="text-xs text-dark-muted text-center py-4">No students found</p>}
                            </div>
                        )}
                        {!students && !loading && (
                            <button onClick={loadStudents} className="btn-secondary w-full text-sm">Load Students</button>
                        )}
                    </div>

                    {/* Mark entry form */}
                    <div className="glass-panel p-5">
                        <h2 className="text-sm font-bold text-white mb-4">
                            {selected ? `Enter Marks — ${selected.full_name || selected.username}` : 'Select a student first'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-3">
                            <div>
                                <label className="block text-xs text-dark-muted mb-1">Subject</label>
                                <select className="input-field w-full text-sm" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} disabled={!selected}>
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-dark-muted mb-1">Semester</label>
                                <input type="number" min={1} max={8} className="input-field w-full text-sm" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} disabled={!selected} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[['internal_marks', 'Internal'], ['external_marks', 'External'], ['practical_marks', 'Practical']].map(([field, label]) => (
                                    <div key={field}>
                                        <label className="block text-xs text-dark-muted mb-1">{label}</label>
                                        <input type="number" min={0} step={0.5} className="input-field w-full text-sm" placeholder="—" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} disabled={!selected} />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-xs text-dark-muted mb-1">Max Marks</label>
                                <input type="number" min={1} className="input-field w-full text-sm" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} disabled={!selected} />
                            </div>
                            {msg && <p className={`text-xs ${msg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
                            <button type="submit" className="btn-primary w-full text-sm" disabled={!selected || saving}>
                                {saving ? 'Saving...' : 'Save Marks'}
                            </button>
                        </form>
                    </div>

                    {/* Current marks view */}
                    <div className="glass-panel p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-white">Current Marks</h2>
                            {marks && <span className="text-xs font-bold text-primary-400">CGPA: {marks.cgpa}</span>}
                        </div>
                        {!selected && <p className="text-xs text-dark-muted">No student selected</p>}
                        {selected && !marks && <p className="text-xs text-dark-muted">Loading marks...</p>}
                        {marks && marks.semesters.length === 0 && <p className="text-xs text-dark-muted">No marks recorded yet</p>}
                        {marks && marks.semesters.map(sem => (
                            <div key={sem.semester} className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-white">Semester {sem.semester}</span>
                                    <span className="text-xs text-dark-muted">SGPA: <span className="text-white font-medium">{sem.sgpa}</span></span>
                                </div>
                                <div className="space-y-1">
                                    {sem.subjects.map(s => (
                                        <div key={s.subject} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-dark-bg/50 hover:bg-dark-border/30 cursor-pointer transition-colors"
                                            onClick={() => setForm({ subject: s.subject, semester: sem.semester, internal_marks: s.internal_marks ?? '', external_marks: s.external_marks ?? '', practical_marks: s.practical_marks ?? '', max_marks: s.max_marks })}>
                                            <span className="text-dark-muted truncate flex-1">{s.subject}</span>
                                            <span className="text-white font-medium mx-2">{s.total}/{s.max_marks}</span>
                                            <span className={`font-bold ${GRADE_COLORS[s.grade] || 'text-white'}`}>{s.grade}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
