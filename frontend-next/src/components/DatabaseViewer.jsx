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
            <div className="h-full flex items-center justify-center text-textMain">
                <span className="font-mono text-xs uppercase tracking-widest animate-pulse">[LOADING DB_SCHEMA...]</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in relative z-10 w-full text-textMain">
            {/* Header Settings */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-sm font-mono font-bold text-textMain uppercase tracking-widest flex items-center gap-2">
                        DATABASE_INSPECTOR
                    </h2>
                    <p className="text-[10px] text-textMuted font-mono mt-0.5">RAW PGTABLES READ-ONLY VIEW</p>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-[10px] text-textMuted font-mono uppercase tracking-widest">TABLE</label>
                    <div className="relative">
                        <select
                            value={selectedTable || ''}
                            onChange={handleTableChange}
                            className="w-48 bg-surface border border-border text-textMain px-2 py-1.5 text-xs font-mono uppercase rounded-sm focus:outline-none focus:border-accent transition-none appearance-none cursor-pointer"
                        >
                            {tables.map(t => (
                                <option key={t} value={t} className="bg-background py-1">{t}</option>
                            ))}
                        </select>
                    </div>

                    <button onClick={() => loadTableData(selectedTable, page)} className="px-3 py-1.5 text-xs font-mono rounded-sm bg-surface border border-border hover:border-accent hover:text-accent transition-colors" title="Refresh Data">
                        [REFRESH]
                    </button>
                </div>
            </div>

            {/* Data Table Area */}
            <div className="bg-background border border-border rounded-sm flex-1 flex flex-col min-h-[500px] overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {loading && tableData.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-12">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-textMuted animate-pulse">[FETCHING_DATA...]</span>
                        </div>
                    ) : tableData.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-12 text-textMuted font-mono text-[10px] uppercase">
                            [TABLE_EMPTY]
                        </div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap text-xs border-collapse font-mono">
                            <thead className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_var(--border)]">
                                <tr>
                                    {Object.keys(tableData[0]).map((key) => (
                                        <th key={key} className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-textMuted border-b border-border bg-surface">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {tableData.map((row, i) => (
                                    <tr key={i} className="hover:bg-surfaceHover transition-colors group">
                                        {Object.entries(row).map(([key, value], j) => (
                                            <td key={j} className="px-4 py-2 text-[11px] border-r border-border/30 last:border-r-0 max-w-[300px] truncate group-hover:text-accent text-textMain transition-colors">
                                                {value === null ? (
                                                    <span className="text-textMuted italic">null</span>
                                                ) : typeof value === 'boolean' ? (
                                                    <span className={value ? 'text-success' : 'text-danger'}>{value.toString()}</span>
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
                <div className="p-3 border-t border-border bg-surface flex justify-between items-center text-[10px] font-mono text-textMuted shrink-0 z-20">
                    <div className="uppercase tracking-widest">
                        SHOWING {Math.min(totalRows, page * rowsPerPage + 1)} - {Math.min(totalRows, (page + 1) * rowsPerPage)} / <span className="text-textMain font-bold">{totalRows}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0 || loading}
                            className="px-2 py-1 rounded-sm bg-background border border-border hover:border-accent hover:text-textMain disabled:opacity-50 disabled:cursor-not-allowed transition-colors disabled:hover:border-border"
                        >
                            [PREV]
                        </button>
                        <span className="px-3 py-1 bg-background border border-border rounded-sm min-w-[3rem] text-center text-textMain">
                            PAGE_{page + 1}
                        </span>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={(page + 1) * rowsPerPage >= totalRows || loading}
                            className="px-2 py-1 rounded-sm bg-background border border-border hover:border-accent hover:text-textMain disabled:opacity-50 disabled:cursor-not-allowed transition-colors disabled:hover:border-border"
                        >
                            [NEXT]
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
