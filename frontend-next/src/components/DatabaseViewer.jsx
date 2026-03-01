"use client";

import { useState, useEffect } from 'react';
import { getDatabaseTables, getTableData } from '../lib/api';

export default function DatabaseViewer() {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const rowsPerPage = 50;

    useEffect(() => {
        loadTables();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            loadTableData(selectedTable, page);
        }
    }, [selectedTable, page]);

    const loadTables = async () => {
        setLoading(true);
        try {
            const data = await getDatabaseTables();
            setTables(data);
            if (data.length > 0) {
                setSelectedTable(data[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadTableData = async (tableName, pageIndex) => {
        setLoading(true);
        try {
            const result = await getTableData(tableName, rowsPerPage, pageIndex * rowsPerPage);
            setTableData(result.data || []);
            setTotalRows(result.total || 0);
        } catch (e) {
            console.error(e);
            setTableData([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (e) => {
        setPage(0);
        setSelectedTable(e.target.value);
    };

    if (loading && !tables.length) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in relative z-10 p-6 max-w-7xl mx-auto w-full">
            {/* Header Settings */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        Database Inspector
                    </h2>
                    <p className="text-sm text-dark-muted mt-1">Raw, read-only view of PostgreSQL tables.</p>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-dark-muted uppercase tracking-wider">Select Table</label>
                    <div className="relative">
                        <select
                            value={selectedTable || ''}
                            onChange={handleTableChange}
                            className="input-field py-2 pl-4 pr-10 text-sm bg-dark-bg/80 appearance-none font-mono"
                        >
                            {tables.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    <button onClick={() => loadTableData(selectedTable, page)} className="p-2 ml-2 rounded-lg bg-dark-bg/60 border border-dark-border hover:border-primary-500/50 hover:text-primary-400 transition-colors" title="Refresh Data">
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin text-primary-500' : 'text-dark-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </div>

            {/* Data Table Area */}
            <div className="glass-panel flex-1 flex flex-col min-h-[500px] overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {loading && tableData.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-12">
                            <div className="flex flex-col items-center gap-4 text-dark-muted">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                                <span className="font-mono text-sm tracking-wider">FETCHING {selectedTable}...</span>
                            </div>
                        </div>
                    ) : tableData.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-12 text-dark-muted font-mono text-sm">
                            Table is empty.
                        </div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur shadow-sm">
                                <tr>
                                    {Object.keys(tableData[0]).map((key) => (
                                        <th key={key} className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-primary-400 border-b border-dark-border font-mono bg-dark-bg/50">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border/50">
                                {tableData.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        {Object.entries(row).map(([key, value], j) => (
                                            <td key={j} className="px-6 py-3 font-mono text-[13px] border-r border-dark-border/20 last:border-r-0 max-w-[300px] truncate group-hover:text-white text-slate-300">
                                                {value === null ? (
                                                    <span className="text-slate-600 italic">null</span>
                                                ) : typeof value === 'boolean' ? (
                                                    <span className={value ? 'text-emerald-400' : 'text-rose-400'}>{value.toString()}</span>
                                                ) : typeof value === 'object' ? (
                                                    JSON.stringify(value)
                                                ) : (
                                                    String(value)
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-dark-border/50 bg-dark-bg/40 flex justify-between items-center text-sm font-mono text-dark-muted shrink-0 z-20">
                    <div>
                        Showing {Math.min(totalRows, page * rowsPerPage + 1)} - {Math.min(totalRows, (page + 1) * rowsPerPage)} of <span className="text-white font-bold">{totalRows}</span> rows
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0 || loading}
                            className="p-1 rounded bg-black/50 border border-dark-border hover:border-primary-500/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="px-3 py-1 bg-black/50 border border-dark-border rounded min-w-[3rem] text-center text-white">
                            {page + 1}
                        </span>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={(page + 1) * rowsPerPage >= totalRows || loading}
                            className="p-1 rounded bg-black/50 border border-dark-border hover:border-primary-500/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
