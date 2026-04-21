"use client";
import { useState, useEffect } from 'react';
import AppShell from '../../../components/AppShell';
import { getResources } from '../../../lib/api';

const TYPE_ICONS = {
    ebook: { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'text-blue-400 bg-blue-400/10' },
    paper: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-amber-400 bg-amber-400/10' },
    video: { icon: 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'text-red-400 bg-red-400/10' },
    pdf: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'text-orange-400 bg-orange-400/10' },
    link: { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', color: 'text-primary-400 bg-primary-400/10' },
};

const SUBJECTS = ["All", "Mathematics", "Physics", "Chemistry", "Computer Science", "Electronics", "Data Structures", "Machine Learning", "Other"];
const TYPES = ["All", "ebook", "paper", "video", "pdf", "link"];
const DIFF_COLORS = { beginner: 'text-emerald-400', intermediate: 'text-amber-400', advanced: 'text-red-400' };

export default function StudentLibraryPage() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterType, setFilterType] = useState('All');

    useEffect(() => {
        (async () => {
            const data = await getResources();
            setResources(data || []);
            setLoading(false);
        })();
    }, []);

    const filtered = resources.filter(r => {
        const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.subject.toLowerCase().includes(search.toLowerCase());
        const matchSubject = filterSubject === 'All' || r.subject === filterSubject;
        const matchType = filterType === 'All' || r.resource_type === filterType;
        return matchSearch && matchSubject && matchType;
    });

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Digital Library</h1>
                    <p className="text-dark-muted text-sm mt-1">Browse academic resources, ebooks, papers, and videos</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search resources..."
                        className="flex-1 min-w-[200px] px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500" />
                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                        className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border rounded-xl text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500/50 capitalize">
                        {TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-dark-muted">Loading resources...</div>
                ) : filtered.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <svg className="w-12 h-12 text-dark-border mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <p className="text-dark-muted text-sm">{search || filterSubject !== 'All' || filterType !== 'All' ? 'No resources match your filters.' : 'No resources available yet.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(r => {
                            const typeInfo = TYPE_ICONS[r.resource_type] || TYPE_ICONS.link;
                            return (
                                <div key={r.id} className="glass-panel p-5 flex flex-col gap-3 hover:border-primary-500/30 transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.color}`}>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeInfo.icon} /></svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-semibold text-sm leading-tight">{r.title}</h3>
                                            {r.author && <p className="text-xs text-dark-muted mt-0.5">{r.author}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">{r.subject}</span>
                                        <span className={`text-xs capitalize px-2 py-0.5 rounded-full bg-dark-border/30 ${typeInfo.color.split(' ')[0]}`}>{r.resource_type}</span>
                                        {r.difficulty && <span className={`text-xs capitalize ${DIFF_COLORS[r.difficulty] || 'text-dark-muted'}`}>{r.difficulty}</span>}
                                    </div>
                                    {r.description && <p className="text-xs text-dark-muted line-clamp-2">{r.description}</p>}
                                    {r.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {r.tags.slice(0, 3).map(t => (
                                                <span key={t} className="text-[10px] text-dark-muted bg-dark-border/20 px-2 py-0.5 rounded-full">#{t}</span>
                                            ))}
                                        </div>
                                    )}
                                    {r.url && (
                                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                                            className="mt-auto text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1.5 transition-colors"
                                            onClick={e => e.stopPropagation()}>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            Open Resource
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
