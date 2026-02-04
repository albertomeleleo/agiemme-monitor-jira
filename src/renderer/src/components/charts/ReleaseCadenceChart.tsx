import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { parseISO, format, getWeek, getYear } from 'date-fns'
import { ReleaseData } from '../../types'

interface ChartProps {
    releases: ReleaseData[]
}

type Timeframe = 'year' | 'month' | 'week' | 'day'

export function ReleaseCadenceChart({ releases }: ChartProps): JSX.Element {
    const [timeframe, setTimeframe] = useState<Timeframe>('month')

    const barData = useMemo(() => {
        const aggregated = releases.reduce((acc, release) => {
            if (!release.date) return acc

            let key = ''
            const date = parseISO(release.date)

            switch (timeframe) {
                case 'year':
                    key = format(date, 'yyyy')
                    break
                case 'month':
                    key = format(date, 'yyyy-MM')
                    break
                case 'week':
                    key = `${getYear(date)}-W${getWeek(date, { weekStartsOn: 1 }).toString().padStart(2, '0')}`
                    break
                case 'day':
                    key = format(date, 'yyyy-MM-dd')
                    break
            }

            acc[key] = (acc[key] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        return Object.entries(aggregated)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([label, count]) => ({ label, count }))

    }, [releases, timeframe])

    return (
        <div className="glass-panel p-6 rounded-xl border border-white/10 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white dropdown-[0_0_5px_rgba(255,255,255,0.3)]">Release Cadence</h3>
                <div className="flex bg-brand-deep/50 rounded-lg p-1 gap-1 border border-white/10">
                    {(['year', 'month', 'week', 'day'] as Timeframe[]).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${timeframe === tf
                                ? 'bg-brand-cyan text-brand-deep font-bold shadow-lg '
                                : 'text-brand-text-sec hover:text-white hover:bg-brand-card/50'
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
