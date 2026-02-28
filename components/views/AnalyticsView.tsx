import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

interface TopSession {
    session_id: number;
    title: string;
    checkins: number;
}

interface TopExhibitor {
    exhibitor_id: number;
    name: string;
    visits: number;
}

interface PeakHour {
    activity_hour: string;
    activity_count: number;
}

export const AnalyticsView: React.FC = () => {
    const [topSessions, setTopSessions] = useState<TopSession[]>([]);
    const [topExhibitors, setTopExhibitors] = useState<TopExhibitor[]>([]);
    const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchAnalytics = async () => {
            setLoading(true);

            const [
                { data: sessionsData },
                { data: exhibitorsData },
                { data: hoursData }
            ] = await Promise.all([
                supabase.from('top_sessions').select('*').limit(5),
                supabase.from('top_exhibitors').select('*').limit(5),
                supabase.rpc('get_peak_activity_hours')
            ]);

            if (mounted) {
                if (sessionsData) setTopSessions(sessionsData as TopSession[]);
                if (exhibitorsData) setTopExhibitors(exhibitorsData as TopExhibitor[]);
                if (hoursData) {
                    // Keep only the most recent/active 10 hours for chart readability
                    setPeakHours((hoursData as PeakHour[]).slice(-10));
                }
                setLoading(false);
            }
        };

        fetchAnalytics();

        // Optional: Refresh data every 30 seconds if admin stays on the page
        const interval = setInterval(fetchAnalytics, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    const maxCheckins = Math.max(...topSessions.map(s => s.checkins), 1);
    const maxVisits = Math.max(...topExhibitors.map(e => e.visits), 1);
    const maxActivity = Math.max(...peakHours.map(h => h.activity_count), 1);

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-xl font-bold text-brand-primary mb-1">Analíticas del Evento</h2>
                <p className="text-gray-500 text-sm mb-4">Métricas de interacción en tiempo real</p>

                {/* Top Sesiones Chart */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 border-b pb-1">Top Sesiones (Check-ins)</h3>
                    {topSessions.length === 0 ? <p className="text-gray-400 text-sm italic">No hay datos aún.</p> : (
                        <div className="space-y-3 mt-3">
                            {topSessions.map(session => (
                                <div key={session.session_id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-slate-600 truncate mr-2">{session.title}</span>
                                        <span className="text-brand-accent font-bold">{session.checkins}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-brand-accent h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${(session.checkins / maxCheckins) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Expositores Chart */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 border-b pb-1">Stands Más Visitados</h3>
                    {topExhibitors.length === 0 ? <p className="text-gray-400 text-sm italic">No hay datos aún.</p> : (
                        <div className="space-y-3 mt-3">
                            {topExhibitors.map(exhibitor => (
                                <div key={exhibitor.exhibitor_id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-slate-600 truncate mr-2">{exhibitor.name}</span>
                                        <span className="text-green-600 font-bold">{exhibitor.visits}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${(exhibitor.visits / maxVisits) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Peak Hours Chart */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 border-b pb-1">Picos de Actividad (Interacciones)</h3>
                    {peakHours.length === 0 ? <p className="text-gray-400 text-sm italic">No hay datos aún.</p> : (
                        <div className="flex items-end h-32 gap-2 mt-4 overflow-x-auto pb-4 pt-2">
                            {peakHours.map((hour, idx) => {
                                const date = new Date(hour.activity_hour);
                                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const height = `${(hour.activity_count / maxActivity) * 100}%`;

                                return (
                                    <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group relative">
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
                                            {hour.activity_count} interacciones
                                        </div>
                                        {/* Bar */}
                                        <div
                                            className="w-full max-w-[30px] bg-brand-primary rounded-t-sm transition-all duration-1000 hover:bg-brand-accent cursor-crosshair"
                                            style={{ height }}
                                        ></div>
                                        {/* Label */}
                                        <span className="text-[10px] text-slate-500 mt-1 origin-top-left -rotate-45 whitespace-nowrap">
                                            {timeStr}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
