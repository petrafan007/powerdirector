import { NextResponse } from 'next/server';
import { getService } from '../../../lib/agent-instance';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    try {
        const service = getService();
        const usageManager = service.usageManager;

        const daily = usageManager.getDailyStats(startDate, endDate);
        const sessions = usageManager.getSessionStats(startDate, endDate);
        const hourly = usageManager.getHourlyActivity(startDate, endDate);
        const weekly = usageManager.getWeekdayActivity(startDate, endDate);

        // Transform hourly/weekly to matching format
        // Ensure all 24 hours are present (0 default)
        const hourTotals = Array(24).fill(0);
        hourly.forEach(h => {
            if (h.hour >= 0 && h.hour < 24) hourTotals[h.hour] = h.count;
        });

        // Ensure all 7 days are present
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekdayTotals = daysMap.map((label, idx) => {
            const found = weekly.find(w => w.day === idx);
            return { label, tokens: found ? found.count : 0 };
        });

        const totalTokens = daily.reduce((acc, d) => acc + d.totalTokens, 0);

        return NextResponse.json({
            daily,
            sessions,
            stats: {
                totalTokens,
                hourTotals,
                weekdayTotals,
                hasData: totalTokens > 0
            }
        });
    } catch (error) {
        console.error('Usage API Error:', error);
        return NextResponse.json({
            daily: [],
            sessions: [],
            stats: {
                totalTokens: 0,
                hourTotals: Array(24).fill(0),
                weekdayTotals: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(label => ({ label, tokens: 0 })),
                hasData: false
            }
        });
    }
}
