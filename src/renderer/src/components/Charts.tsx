import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { parseISO, format, getWeek, getYear } from 'date-fns'
import { ReleaseData } from '../types'

interface ChartsProps {
    releases: ReleaseData[]
}

type Timeframe = 'year' | 'month' | 'week' | 'day'

export function Charts({ releases }: ChartsProps): JSX.Element {
    const [timeframe, setTimeframe] = useState<Timeframe>('month')

    // Process Data for Bar Chart based on Timeframe
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
                    // Week of Year (e.g., 2026-W01)
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


    // Process Data for Pie Chart (Bugfix vs Evolutive)
    const totalBugfixes = releases.reduce((acc, r) => acc + r.bugfixCount, 0)
    const totalEvolutives = releases.reduce((acc, r) => acc + r.evolutiveCount, 0)

    const pieData = [
        { name: 'Bugfixes', value: totalBugfixes, color: '#ef4444' }, // Red-500
        { name: 'Evolutives', value: totalEvolutives, color: '#00f2ff' } // Brand Cyan
    ]

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="glass-panel p-6 rounded-xl border border-white/10 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-white dropdown-[0_0_5px_rgba(255,255,255,0.3)]">Releases Timeline</h3>
                    <div className="flex bg-brand-deep/50 rounded-lg p-1 gap-1 border border-white/10">
                        {(['year', 'month', 'week', 'day'] as Timeframe[]).map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${timeframe === tf
                                    ? 'bg-brand-cyan text-brand-deep font-bold shadow-lg shadow-brand-cyan/20'
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

            <div className="glass-panel p-6 rounded-xl border border-white/10 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4 dropdown-[0_0_5px_rgba(255,255,255,0.3)]">Workload Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center pointer-events-none">
                        <span className="text-xs text-brand-text-sec">Total Items</span>
                        <span className="text-xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">{totalBugfixes + totalEvolutives}</span>
                    </div>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                    {pieData.map(item => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-brand-text-sec">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
