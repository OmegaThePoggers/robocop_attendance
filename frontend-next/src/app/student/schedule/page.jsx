"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getSchedule } from '../../../lib/api';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPE_COLORS = {
    lecture: 'bg-primary-500/10 border-primary-500/30 text-primary-400',
    lab: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    tutorial: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

export default function StudentSchedulePage() {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [today] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 0=Mon

    useEffect(() => {
        (async () => {
            const data = await getSchedule();
            setSchedule(data || []);
            setLoading(false);
        })();
    }, []);

    const groupedByDay = DAYS.reduce((acc, _, i) => {
        acc[i] = schedule.filter(e => e.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return acc;
    }, {});

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Weekly Schedule</h1>
                    <p className="text-dark-muted text-sm mt-1">Your class timetable</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading schedule...</div>
                ) : schedule.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-dark-muted text-sm">No schedule entries yet. Your teacher will add timetable entries.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {DAYS.map((day, i) => (
                            <div key={day} className={`glass-panel overflow-hidden ${i === today ? 'border-primary-500/40 shadow-glow' : ''}`}>
                                <div className={`px-5 py-3 border-b border-dark-border/40 flex items-center justify-between ${i === today ? 'bg-primary-600/10' : ''}`}>
                                    <h3 className={`font-semibold text-sm ${i === today ? 'text-primary-400' : 'text-white'}`}>
                                        {day}
                                        {i === today && <span className="ml-2 text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">Today</span>}
                                    </h3>
                                    <span className="text-xs text-dark-muted">{groupedByDay[i].length} class{groupedByDay[i].length !== 1 ? 'es' : ''}</span>
                                </div>
                                {groupedByDay[i].length === 0 ? (
                                    <p className="px-5 py-4 text-xs text-dark-muted">No classes</p>
                                ) : (
                                    <div className="divide-y divide-dark-border/30">
                                        {groupedByDay[i].map(e => (
                                            <div key={e.id} className="px-5 py-3 flex items-center gap-4">
                                                <div className="text-xs text-dark-muted w-24 flex-shrink-0 font-mono">
                                                    {e.start_time} – {e.end_time}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white">{e.subject}</p>
                                                    {e.room && <p className="text-xs text-dark-muted">Room {e.room}</p>}
                                                </div>
                                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${TYPE_COLORS[e.schedule_type] || TYPE_COLORS.lecture}`}>
                                                    {e.schedule_type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
