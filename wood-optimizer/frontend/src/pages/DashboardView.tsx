import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const DashboardView: React.FC = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/stats');
                setStats(res.data);
            } catch (e) {
                console.error("Failed to load stats", e);
            }
        };
        fetchStats();
    }, []);

    if (!stats) return <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento Dashboard...</div>;

    return (
        <div className="flex-col fade-in">
            <div className="flex-row" style={{ alignItems: 'stretch' }}>
                <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <h3 className="text-muted" style={{ marginBottom: '0.5rem' }}>Ordini Totali</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.kpi.total_orders}</div>
                </div>
                <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <h3 className="text-muted" style={{ marginBottom: '0.5rem' }}>Ordini Completati</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>{stats.kpi.completed_orders}</div>
                </div>
                <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <h3 className="text-muted" style={{ marginBottom: '0.5rem' }}>Pezzi a Magazzino</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.kpi.total_stock_qty}</div>
                </div>
                <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <h3 className="text-muted" style={{ marginBottom: '0.5rem' }}>Scarto Medio</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.kpi.scrap_percent}</div>
                </div>
            </div>

            <div className="card mt-4" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Andamento Ordini Mensili</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={stats.chart_data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                        <Legend />
                        <Bar dataKey="ordini" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
