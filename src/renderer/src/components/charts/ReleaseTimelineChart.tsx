import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { parseISO, format } from 'date-fns'
import { ReleaseData } from '../../types'

interface ChartProps {
    releases: ReleaseData[]
}

export function ReleaseTimelineChart({ releases }: ChartProps): JSX.Element {
    const lineData = useMemo(() => {
        // Sort releases by date
        const sorted = [...releases].sort((a, b) => {
            const da = new Date(a.date || '1970-01-01').getTime()
            const db = new Date(b.date || '1970-01-01').getTime()
            return da - db
        })

        return sorted.map(r => ({
            date: r.date,
            totalItems: r.bugfixCount + r.evolutiveCount
        })).filter(r => r.date) // Basic filtering
    }, [releases])

    return (
        <div className="glass-panel p-6 rounded-xl border border-white/10 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 dropdown-[0_0_5px_rgba(255,255,255,0.3)]">Items per Release</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(str) => format(parseISO(str), 'MMM d')} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Line type="monotone" dataKey="totalItems" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3, fill: '#22d3ee' }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
