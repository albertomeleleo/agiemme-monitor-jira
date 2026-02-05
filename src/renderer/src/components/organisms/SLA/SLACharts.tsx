import { useState, useEffect, useMemo } from 'react'
import { Card, Typography } from '@design-system'
import { SLAIssue } from '../../../../../shared/sla-types'
import { getThroughputData, getReleaseData, groupIssuesByPeriod } from './utils'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, ComposedChart, Line, ReferenceLine, CartesianGrid } from 'recharts'

// --- CHART THEME ---
const CHART_CONFIG = {
    tooltip: {
        contentStyle: { backgroundColor: '#1a262b', borderColor: '#374151', color: 'white' },
        itemStyle: { color: 'white' }
    },
    legend: {
        wrapperStyle: { paddingTop: '10px' },
        height: 36
    },
    axis: {
        stroke: '#9CA3AF',
        fontSize: 10
    }
}

interface SLAChartsProps {
    chartData: any[]
    tierStats: any[]
    rejectedStats: any[]
    complianceChartData: any[] // Legacy/Fallback
    reactionData?: any[] // New: Aggregated or Tier-specific
    resolutionData?: any[] // New
    validIssues: SLAIssue[]
    filteredIssues: SLAIssue[]
    COLORS: string[]
}

export function SLACharts(props: SLAChartsProps): JSX.Element {
    const { chartData, tierStats, rejectedStats, complianceChartData, reactionData, resolutionData, validIssues, filteredIssues, COLORS } = props

    // Use specific data if provided, else fallback to complianceChartData
    const finalReactionData = reactionData || complianceChartData
    const finalResolutionData = resolutionData || complianceChartData

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ComplianceOverviewChart data={chartData} colors={COLORS} />
                <PriorityBreakdownChart data={tierStats} />
                <RejectedAnalysisChart data={rejectedStats} />
            </div>

            <TrendCharts issues={validIssues} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ReactionComplianceChart data={finalReactionData} />
                <ResolutionComplianceChart data={finalResolutionData} />
            </div>

            <Card variant="glass" className="!p-6 border border-white/10 h-96">
                <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Daily Release History</Typography>
                <ReleaseChart issues={validIssues} />
            </Card>

            <Card variant="glass" className="!p-6 border border-white/10">
                <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Throughput Analysis (Open vs Close)</Typography>
                <ThroughputChart issues={filteredIssues} />
            </Card>
        </div>
    )
}

function ComplianceOverviewChart({ data, colors }: { data: any[], colors: string[] }) {
    return (
        <Card variant="glass" className="!p-6 border border-white/10 h-80 flex flex-col">
            <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Compliance Overview</Typography>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip {...CHART_CONFIG.tooltip} />
                        <Legend {...CHART_CONFIG.legend} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

function PriorityBreakdownChart({ data }: { data: any[] }) {
    return (
        <Card variant="glass" className="!p-6 border border-white/10 h-80 flex flex-col">
            <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">SLA by Tier (Valid)</Typography>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                        <XAxis dataKey="name" {...CHART_CONFIG.axis} interval={0} />
                        <YAxis stroke={CHART_CONFIG.axis.stroke} />
                        <Tooltip {...CHART_CONFIG.tooltip} />
                        <Legend {...CHART_CONFIG.legend} />
                        <Bar dataKey="Met" stackId="a" fill="#10B981" />
                        <Bar dataKey="Missed" stackId="a" fill="#EF4444" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

function RejectedAnalysisChart({ data }: { data: any[] }) {
    return (
        <Card variant="glass" className="!p-6 border border-white/10 h-80 flex flex-col">
            <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Rejected Issues by Tier</Typography>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                        <XAxis dataKey="name" {...CHART_CONFIG.axis} interval={0} />
                        <YAxis stroke={CHART_CONFIG.axis.stroke} />
                        <Tooltip {...CHART_CONFIG.tooltip} />
                        <Legend {...CHART_CONFIG.legend} />
                        <Bar dataKey="Count" name="Rejected" fill="#F97316" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

function ReactionComplianceChart({ data }: { data: any[] }) {
    return (
        <Card variant="glass" className="!p-6 border border-white/10 h-80">
            <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Reaction Compliance % vs Target (95%)</Typography>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" {...CHART_CONFIG.axis} interval={0} />
                    <YAxis stroke={CHART_CONFIG.axis.stroke} domain={[0, 100]} />
                    <Tooltip {...CHART_CONFIG.tooltip} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="reactionActual" name="Actual %" fill="#10B981" barSize={40}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.reactionActual >= entry.reactionTarget ? '#10B981' : '#EF4444'} />
                        ))}
                    </Bar>
                    <ReferenceLine y={95} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Target 95%', fill: '#F59E0B', fontSize: 10 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </Card>
    )
}

function ResolutionComplianceChart({ data }: { data: any[] }) {
    return (
        <Card variant="glass" className="!p-6 border border-white/10 h-80">
            <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Resolution Compliance % vs Target</Typography>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" {...CHART_CONFIG.axis} interval={0} />
                    <YAxis stroke={CHART_CONFIG.axis.stroke} domain={[0, 100]} />
                    <Tooltip {...CHART_CONFIG.tooltip} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="resolutionActual" name="Actual %" fill="#10B981" barSize={40}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.resolutionActual >= entry.resolutionTarget ? '#10B981' : '#EF4444'} />
                        ))}
                    </Bar>
                    <Line type="monotone" dataKey="resolutionTarget" name="Target %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </Card>
    )
}

function TrendCharts({ issues }: { issues: any[] }): JSX.Element {
    const [period, setPeriod] = useState<'day' | 'month'>('day')
    const data = useMemo(() => groupIssuesByPeriod(issues, period), [issues, period])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Typography variant="h3" className="uppercase !text-lg">Trend Analysis (Valid Issues)</Typography>
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    {(['day', 'month'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors uppercase ${period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {p === 'day' ? 'Daily' : 'Monthly'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card variant="glass" className="!p-6 border border-white/10 h-80">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Reaction Time Trend</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <XAxis dataKey="displayDate" {...CHART_CONFIG.axis} angle={-30} textAnchor="end" height={50} />
                            <YAxis stroke={CHART_CONFIG.axis.stroke} />
                            <Tooltip {...CHART_CONFIG.tooltip} cursor={{ fill: '#374151', opacity: 0.4 }} />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="total" name="Total Issues" fill="#3B82F6" />
                            <Bar dataKey="missedReaction" name="Missed Reaction SLA" fill="#EF4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card variant="glass" className="!p-6 border border-white/10 h-80">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-xs uppercase">Resolution Time Trend</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <XAxis dataKey="displayDate" {...CHART_CONFIG.axis} angle={-30} textAnchor="end" height={50} />
                            <YAxis stroke={CHART_CONFIG.axis.stroke} />
                            <Tooltip {...CHART_CONFIG.tooltip} cursor={{ fill: '#374151', opacity: 0.4 }} />
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

function ThroughputChart({ issues }: { issues: any[] }): JSX.Element {
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' })

    useEffect(() => {
        if (issues.length > 0 && !dateRange.start) {
            const start = startOfMonth(new Date())
            const end = endOfMonth(new Date())
            setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') })
        }
    }, [issues])

    const data = useMemo(() => getThroughputData(issues, granularity, dateRange), [issues, granularity, dateRange])

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-600">
                    {(['day', 'week', 'month'] as const).map(g => (
                        <button
                            key={g}
                            onClick={() => setGranularity(g)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors uppercase ${granularity === g ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
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

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="displayDate" {...CHART_CONFIG.axis} angle={-30} textAnchor="end" height={50} minTickGap={30} />
                        <YAxis stroke={CHART_CONFIG.axis.stroke} allowDecimals={false} />
                        <Tooltip {...CHART_CONFIG.tooltip} cursor={{ fill: '#374151', opacity: 0.2 }} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="opened" name="Opened" fill="#3B82F6" barSize={granularity === 'day' ? 5 : 20} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="closed" name="Closed" fill="#10B981" barSize={granularity === 'day' ? 5 : 20} radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function ReleaseChart({ issues }: { issues: any[] }): JSX.Element {
    const data = useMemo(() => getReleaseData(issues), [issues])

    if (data.length === 0) {
        return <div className="h-full flex items-center justify-center text-gray-500">No release data available for current filter</div>
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <XAxis dataKey="date" {...CHART_CONFIG.axis} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke={CHART_CONFIG.axis.stroke} allowDecimals={false} />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload?.length) {
                            const d = payload[0].payload
                            return (
                                <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs text-white">
                                    <div className="font-bold border-b border-gray-700 pb-1 mb-2">{d.fullDate}</div>
                                    <div className="mb-2 font-bold text-blue-400">Total: {d.count} issues</div>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {d.keys.map((k: string) => <div key={k}>{k}</div>)}
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
