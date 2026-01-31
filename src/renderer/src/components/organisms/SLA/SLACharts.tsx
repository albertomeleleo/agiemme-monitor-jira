import { useState, useEffect } from 'react'
import { Card, Typography } from '@design-system'
import { SLAIssue } from '../../../../../shared/sla-types'
import { parseDate } from './utils'
import { startOfMonth, endOfMonth, endOfDay, endOfWeek, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, isValid } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, ComposedChart, Line, ReferenceLine, CartesianGrid } from 'recharts'

interface SLAChartsProps {
    chartData: any[]
    tierStats: any[]
    rejectedStats: any[]
    complianceChartData: any[]
    validIssues: SLAIssue[]
    filteredIssues: SLAIssue[]
    COLORS: string[]
}

export function SLACharts({ chartData, tierStats, rejectedStats, complianceChartData, validIssues, filteredIssues, COLORS }: SLAChartsProps): JSX.Element {
    return (
        <div className="space-y-8">
            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* 1. Compliance */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80 flex flex-col">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Compliance Overview</Typography>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: 'white' }} />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 2. Priority BreakDown */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80 flex flex-col">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">SLA by Tier (Valid)</Typography>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tierStats} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                                <XAxis dataKey="name" stroke="#9CA3AF" interval={0} fontSize={10} />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: 'white' }} />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} height={36} />
                                <Bar dataKey="Met" stackId="a" fill="#10B981" />
                                <Bar dataKey="Missed" stackId="a" fill="#EF4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 3. Rejected Analysis */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80 flex flex-col">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Rejected Issues by Tier</Typography>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rejectedStats} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                                <XAxis dataKey="name" stroke="#9CA3AF" interval={0} fontSize={10} />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: 'white' }} />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} height={36} />
                                <Bar dataKey="Count" name="Rejected" fill="#F97316" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Trend Charts */}
            <TrendCharts issues={validIssues} />

            {/* Compliance Percentage Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reaction Percentage Compliance */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Reaction Compliance % vs Target (95%)</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={complianceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} interval={0} />
                            <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: 'white' }} />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="reactionActual" name="Actual %" fill="#10B981" barSize={40}>
                                {complianceChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.reactionActual >= entry.reactionTarget ? '#10B981' : '#EF4444'} />
                                ))}
                            </Bar>
                            <ReferenceLine y={95} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Target 95%', fill: '#F59E0B', fontSize: 10 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>

                {/* Resolution Percentage Compliance */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Resolution Compliance % vs Target</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={complianceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} interval={0} />
                            <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a262b', borderColor: '#374151', color: 'white' }} />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="resolutionActual" name="Actual %" fill="#10B981" barSize={40}>
                                {complianceChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.resolutionActual >= entry.resolutionTarget ? '#10B981' : '#EF4444'} />
                                ))}
                            </Bar>
                            <Line type="monotone" dataKey="resolutionTarget" name="Target %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Release History Chart */}
            <Card variant="glass" className="!p-6 border border-white/10 h-96">
                <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Daily Release History</Typography>
                <ReleaseChart issues={validIssues} />
            </Card>

            {/* Throughput Analysis (Open vs Close) */}
            <Card variant="glass" className="!p-6 border border-white/10">
                <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Throughput Analysis (Open vs Close)</Typography>
                <ThroughputChart issues={filteredIssues} />
            </Card>
        </div>
    )
}

// --- SUB COMPONENTS ---

export function TrendCharts({ issues }: { issues: any[] }): JSX.Element {
    const [period, setPeriod] = useState<'day' | 'month'>('day')

    const data = groupIssuesByPeriod(issues, period)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Typography variant="h3" className="uppercase !text-lg">Trend Analysis (Valid Issues)</Typography>
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button
                        onClick={() => setPeriod('day')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === 'day' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reaction Trend */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Reaction Time Trend</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={10} angle={-30} textAnchor="end" height={50} />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} cursor={{ fill: '#374151', opacity: 0.4 }} />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="total" name="Total Issues" fill="#3B82F6" />
                            <Bar dataKey="missedReaction" name="Missed Reaction SLA" fill="#EF4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Resolution Trend */}
                <Card variant="glass" className="!p-6 border border-white/10 h-80">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Resolution Time Trend</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={10} angle={-30} textAnchor="end" height={50} />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} cursor={{ fill: '#374151', opacity: 0.4 }} />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="total" name="Total Issues" fill="#3B82F6" />
                            <Bar dataKey="missedResolution" name="Missed Resolution SLA" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

        </div>

    )
}

function groupIssuesByPeriod(issues: any[], period: 'day' | 'month') {
    const grouped = new Map<string, { date: string, displayDate: string, total: number, missedReaction: number, missedResolution: number }>()

    issues.forEach(i => {
        const d = parseDate(i.created)
        if (!d) return

        let key = ''
        let displayDate = ''

        if (period === 'day') {
            key = d.toISOString().split('T')[0] // YYYY-MM-DD
            displayDate = `${d.getDate()}/${d.getMonth() + 1}`
        } else {
            key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}` // YYYY-MM
            displayDate = d.toLocaleString('default', { month: 'short', year: '2-digit' })
        }

        if (!grouped.has(key)) {
            grouped.set(key, { date: key, displayDate, total: 0, missedReaction: 0, missedResolution: 0 })
        }

        const entry = grouped.get(key)!
        entry.total++
        if (!i.reactionSLAMet) entry.missedReaction++
        if (!i.resolutionSLAMet) entry.missedResolution++
    })

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function ThroughputChart({ issues }: { issues: any[] }): JSX.Element {
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' })

    // Initialize Date Range on mount
    useEffect(() => {
        if (issues.length > 0 && !dateRange.start) {
            const now = new Date()
            const start = startOfMonth(now)
            const end = endOfMonth(now)

            setDateRange({
                start: format(start, 'yyyy-MM-dd'),
                end: format(end, 'yyyy-MM-dd')
            })
        }
    }, [issues])

    const data = useThroughputData(issues, granularity, dateRange)

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                {/* Granularity */}
                <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-600">
                    {['day', 'week', 'month'].map((g) => (
                        <button
                            key={g}
                            onClick={() => setGranularity(g as any)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors uppercase ${granularity === g ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Chart */}
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={10} angle={-30} textAnchor="end" height={50} minTickGap={30} />
                        <YAxis stroke="#9CA3AF" allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                            cursor={{ fill: '#374151', opacity: 0.2 }}
                            labelStyle={{ color: '#9CA3AF', marginBottom: '0.5rem' }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="opened" name="Opened" fill="#3B82F6" barSize={granularity === 'day' ? 5 : 20} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="closed" name="Closed" fill="#10B981" barSize={granularity === 'day' ? 5 : 20} radius={[4, 4, 0, 0]} />
                        {/* Net Flow Line (Optional but cool: closed - opened cumulative? No, let's keep simple) */}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function useThroughputData(issues: any[], granularity: 'day' | 'week' | 'month', dateRange: { start: string, end: string }) {
    if (!dateRange.start || !dateRange.end) return []

    const start = parseISO(dateRange.start)
    const end = endOfDay(parseISO(dateRange.end))

    if (!isValid(start) || !isValid(end)) return []

    // 1. Generate Intervals
    let intervals: Date[] = []
    try {
        if (granularity === 'day') intervals = eachDayOfInterval({ start, end })
        else if (granularity === 'week') intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        else intervals = eachMonthOfInterval({ start, end })
    } catch (e) {
        console.warn('Invalid interval generation', e)
        return []
    }

    // 2. Initialize Buckets
    const buckets = intervals.map(date => {
        let key = ''
        let displayDate = ''
        let periodStart = date
        let periodEnd = date

        if (granularity === 'day') {
            key = format(date, 'yyyy-MM-dd')
            displayDate = format(date, 'dd MMM')
            periodEnd = endOfDay(date)
        } else if (granularity === 'week') {
            key = format(date, 'yyyy-Iw') // ISO Week
            displayDate = `W${format(date, 'w')} ${format(date, 'MMM')}`
            periodEnd = endOfWeek(date, { weekStartsOn: 1 })
        } else {
            key = format(date, 'yyyy-MM')
            displayDate = format(date, 'MMM yyyy')
            periodEnd = endOfMonth(date)
        }

        return { key, displayDate, start: periodStart, end: periodEnd, opened: 0, closed: 0 }
    })


    // 3. Populate Buckets
    issues.forEach(i => {
        const created = parseDate(i.created)
        const resolved = i.resolutionDate ? parseDate(i.resolutionDate) : null

        // Count Opened
        if (created && isWithinInterval(created, { start, end })) {
            const bucket = buckets.find(b => isWithinInterval(created, { start: b.start, end: b.end }))
            if (bucket) bucket.opened++
        }

        // Count Closed
        if (resolved && isWithinInterval(resolved, { start, end })) {
            const bucket = buckets.find(b => isWithinInterval(resolved, { start: b.start, end: b.end }))
            if (bucket) bucket.closed++
        }
    })

    return buckets
}

export function ReleaseChart({ issues }: { issues: any[] }): JSX.Element {
    const data = useReleaseData(issues)

    if (data.length === 0) {
        return <div className="h-full flex items-center justify-center text-gray-500">No release data available for current filter</div>
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                                <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs text-white">
                                    <div className="font-bold border-b border-gray-700 pb-1 mb-2">{data.fullDate}</div>
                                    <div className="mb-2 font-bold text-blue-400">Total: {data.count} issues</div>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {data.keys.map((k: string) => (
                                            <div key={k}>{k}</div>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

function useReleaseData(issues: any[]) {
    // 1. Filter issues with resolution date
    const released = issues.filter(i => i.resolutionDate)

    // 2. Group by Date (YYYY-MM-DD)
    const grouped = new Map<string, { date: string, fullDate: string, count: number, keys: string[] }>()

    released.forEach(i => {
        const d = parseDate(i.resolutionDate)
        if (!d) return

        const key = d.toISOString().split('T')[0]
        if (!grouped.has(key)) {
            grouped.set(key, {
                date: `${d.getDate()}/${d.getMonth() + 1}`,
                fullDate: d.toLocaleDateString(),
                count: 0,
                keys: []
            })
        }
        const entry = grouped.get(key)!
        entry.count++
        entry.keys.push(i.key)
    })

    // 3. Sort by Date
    return Array.from(grouped.values()).sort((a, b) => {
        return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    })
}
