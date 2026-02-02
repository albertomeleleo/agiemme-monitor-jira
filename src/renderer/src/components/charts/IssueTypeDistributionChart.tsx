import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ReleaseData } from '../../types'

interface ChartProps {
    releases: ReleaseData[]
}

export function IssueTypeDistributionChart({ releases }: ChartProps): JSX.Element {
    const totalBugfixes = releases.reduce((acc, r) => acc + (r.bugfixCount || 0), 0)
    const totalEvolutives = releases.reduce((acc, r) => acc + (r.evolutiveCount || 0), 0)

    const pieData = [
        { name: 'Bugfixes', value: totalBugfixes, color: '#ef4444' }, // Red-500
        { name: 'Evolutives', value: totalEvolutives, color: '#00f2ff' } // Brand Cyan
    ]

    return (
        <div className="glass-panel p-6 rounded-xl border border-white/10 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 dropdown-[0_0_5px_rgba(255,255,255,0.3)]">Workload Distribution</h3>
            <div className="h-64 flex items-center justify-center relative">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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
    )
}
