import { useState, useRef, useEffect } from 'react'
import { SLAReport } from '../../../shared/sla-types'
import { startOfMonth, endOfMonth, endOfDay, endOfWeek, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, isValid } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, ComposedChart, Line, ReferenceLine, CartesianGrid } from 'recharts'

interface SLADashboardProps {
    currentProject: string
}

export function SLADashboard({ currentProject }: SLADashboardProps): JSX.Element {
    const [report, setReport] = useState<SLAReport | null>(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [filterMode, setFilterMode] = useState<'all' | 'failed'>('all')
    const [excludeRejected, setExcludeRejected] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
    const [selectedPriority, setSelectedPriority] = useState<string>('All')
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
    const [hoveredIssue, setHoveredIssue] = useState<any | null>(null)
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
    const [activeTab, setActiveTab] = useState<'overview' | 'issues'>('overview')

    // Sticky Header Logic
    const [isSticky, setIsSticky] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsSticky(!entry.isIntersecting)
            },
            { threshold: [1], rootMargin: '-10px 0px 0px 0px' }
        )

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current)
        }

        return () => {
            if (sentinelRef.current) observer.unobserve(sentinelRef.current)
        }
    }, [])

    const storageKey = `sla_csv_content_${currentProject}`

    // Load persisted data when project changes
    useEffect(() => {
        setReport(null)
        setSelectedMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
        const savedData = localStorage.getItem(storageKey)
        if (savedData) {
            setLoading(true)
            window.api.parseSLA(savedData)
                .then(result => setReport(result))
                .catch(err => {
                    console.error('Failed to load persisted data', err)
                    localStorage.removeItem(storageKey)
                })
                .finally(() => setLoading(false))
        }
    }, [currentProject])

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const text = await file.text()
            localStorage.setItem(storageKey, text) // Persist per project
            const result = await window.api.parseSLA(text)
            setReport(result)
            setSelectedMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
        } catch (error) {
            console.error(error)
            alert('Failed to parse CSV')
        } finally {
            setLoading(false)
        }
    }

    const handleClearData = () => {
        localStorage.removeItem(storageKey)
        setReport(null)
    }

    const COLORS = ['#10B981', '#EF4444', '#00f2ff']

    if (!report && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center glass-panel rounded-3xl border-2 border-dashed border-white/10 hover:border-brand-cyan/50 hover:bg-brand-card/80 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                />
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-2xl font-bold text-white mb-2">Upload Jira CSV</h3>
                <p className="text-gray-400">Export your issues from Jira and drop the CSV here to analyze SLA compliance.</p>
            </div>
        )
    }

    if (loading) return <div className="text-white text-center p-12">Analyzing SLAs...</div>

    // Extract available months and priorities
    const availableMonths = uniqueMonths(report?.issues || [])
    const availablePriorities = ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']

    // 1. FILTERING
    const filteredIssues = report?.issues.filter(i => {
        // Filter by Month
        if (selectedMonth !== 'All') {
            const d = parseDate(i.created)
            if (d) {
                const issueMonth = d.toLocaleString('default', { month: 'long', year: 'numeric' })
                if (issueMonth !== selectedMonth) return false
            }
        }

        // Filter by Priority (Tier)
        if (selectedPriority !== 'All') {
            if (i.slaTier !== selectedPriority) return false
        }

        // Filter Exclude Rejected
        if (excludeRejected && i.status.toLowerCase() === 'rejected') return false

        // Filter by Status
        if (filterMode === 'failed') return !i.resolutionSLAMet || !i.reactionSLAMet

        return true
    }) || []

    // 2. SEPARATION (Valid vs Rejected)
    const validIssues = filteredIssues.filter(i => i.status.toLowerCase() !== 'rejected')
    const rejectedIssues = filteredIssues.filter(i => i.status.toLowerCase() === 'rejected')

    // 3. STATS (Based on Valid Issues ONLY)
    const chartData = [
        { name: 'Met SLA', value: validIssues.filter(i => i.resolutionSLAMet && i.reactionSLAMet).length },
        { name: 'Missed SLA', value: validIssues.filter(i => !i.resolutionSLAMet || !i.reactionSLAMet).length },
    ]

    // Aggregating by TIER for Charts (Valid Issues Only)
    const tierStats = availablePriorities.map(tier => {
        const tierIssues = validIssues.filter(i => i.slaTier === tier)
        const met = tierIssues.filter(i => i.resolutionSLAMet && i.reactionSLAMet).length
        const missed = tierIssues.length - met
        return { name: tier, Met: met, Missed: missed }
    })

    // Aggregating Rejected by TIER
    const rejectedStats = availablePriorities.map(tier => {
        return {
            name: tier,
            Count: rejectedIssues.filter(i => i.slaTier === tier).length
        }
    })

    const getComplianceStats = (tier: string) => {
        const tierIssues = validIssues.filter(i => i.slaTier === tier)
        if (tierIssues.length === 0) return { reaction: 100, resolution: 100 }

        const reactionMet = tierIssues.filter(i => i.reactionSLAMet).length
        const resolutionMet = tierIssues.filter(i => i.resolutionSLAMet).length

        return {
            reaction: (reactionMet / tierIssues.length) * 100,
            resolution: (resolutionMet / tierIssues.length) * 100
        }
    }

    // Prepare Data for Compliance Charts
    const complianceChartData = availablePriorities.map(tier => {
        const stats = getComplianceStats(tier)
        return {
            name: tier,
            reactionActual: stats.reaction,
            reactionTarget: 95,
            resolutionActual: stats.resolution,
            resolutionTarget: tier === 'Expedite' ? 90 : 80
        }
    })

    const renderComplianceCell = (tier: string, type: 'reaction' | 'resolution', target: number) => {
        const stats = getComplianceStats(tier)
        const value = type === 'reaction' ? stats.reaction : stats.resolution
        const isMet = value >= target

        return (
            <span className={`font-bold ${isMet ? 'text-green-400' : 'text-red-400'}`}>
                {value.toFixed(1)}%
            </span>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-brand-text-sec text-sm font-bold uppercase">Active Issues</h3>
                    <div className="text-4xl font-bold text-white mt-2">{validIssues.length}</div>
                    {rejectedIssues.length > 0 && <div className="text-xs text-orange-400 mt-1"> +{rejectedIssues.length} Rejected</div>}
                </div>
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-brand-text-sec text-sm font-bold uppercase">Compliance</h3>
                    <div className={`text-4xl font-bold mt-2 ${calculateCompliance(validIssues) >= 90 ? 'text-green-400' : calculateCompliance(validIssues) >= 75 ? 'text-yellow-400' : 'text-red-400'} drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                        {calculateCompliance(validIssues).toFixed(1)}%
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-brand-text-sec text-sm font-bold uppercase">Met SLA</h3>
                    <div className="text-4xl font-bold text-green-400 mt-2 hover:drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] transition-all">{validIssues.filter(i => i.resolutionSLAMet && i.reactionSLAMet).length}</div>
                </div>
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-brand-text-sec text-sm font-bold uppercase">Missed SLA</h3>
                    <div className="text-4xl font-bold text-red-400 mt-2 hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)] transition-all">{validIssues.filter(i => !i.resolutionSLAMet || !i.reactionSLAMet).length}</div>
                </div>
            </div>



            {/* Scroll Sentinel for Sticky Detection */}
            <div ref={sentinelRef} className="h-px w-full absolute -mt-4 opacity-0 pointer-events-none" />

            {/* Filters */}
            <div className={`flex flex-wrap gap-4 items-center p-4 transition-all duration-300 sticky top-0 z-20 ${isSticky
                ? 'bg-brand-deep/95 backdrop-blur-md border-b-2 border-brand-cyan shadow-2xl shadow-brand-cyan/20 rounded-b-xl mx-0'
                : 'glass-panel mx-0'
                }`}>
                <span className="text-gray-400 font-bold text-sm uppercase">Filter By:</span>

                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="glass-panel text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-cyan hover:bg-brand-card"
                >
                    <option value="All">All Months</option>
                    {availableMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

                <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="glass-panel text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-cyan hover:bg-brand-card"
                >
                    <option value="All">All Priorities</option>
                    {availablePriorities.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                <div className="h-6 w-px bg-gray-700 mx-2"></div>

                <div className="flex bg-brand-deep/50 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setFilterMode('all')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${filterMode === 'all' ? 'bg-brand-cyan text-brand-deep font-bold shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white'}`}
                    >
                        All Issues
                    </button>
                    <button
                        onClick={() => setFilterMode('failed')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${filterMode === 'failed' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-brand-text-sec hover:text-white'}`}
                    >
                        Missed SLA Only
                    </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={excludeRejected}
                            onChange={(e) => setExcludeRejected(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-gray-800"
                        />
                        Exclude Rejected
                    </label>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 glass-panel p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-brand-cyan text-brand-deep shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white hover:bg-brand-card'}`}
                    >
                        📊 Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('issues')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'issues' ? 'bg-brand-cyan text-brand-deep shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white hover:bg-brand-card'}`}
                    >
                        📋 Issue List
                    </button>
                </div>
            </div>

            {
                activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* SLA Legend */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10">
                            <h3 className="text-white font-bold mb-4 text-sm uppercase">SLA Legend</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-brand-text-sec">
                                    <thead className="text-brand-text-sec border-b border-white/10">
                                        <tr>
                                            <th className="pb-2">Tier</th>
                                            <th className="pb-2">Priority (Jira)</th>
                                            <th className="pb-2 text-right">Reaction (95%)</th>
                                            <th className="pb-2 text-right">Actual (React.)</th>
                                            <th className="pb-2 text-right">Resolution (Target %)</th>
                                            <th className="pb-2 text-right">Actual (Res.)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        <tr>
                                            <td className="py-2 text-purple-300 font-bold">Expedite</td>
                                            <td className="py-2">Highest / Critical</td>
                                            <td className="py-2 text-right font-mono">00:15</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Expedite', 'reaction', 95)}</td>
                                            <td className="py-2 text-right font-mono">04:00 (90%)</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Expedite', 'resolution', 90)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-red-300 font-bold">Critical</td>
                                            <td className="py-2">High</td>
                                            <td className="py-2 text-right font-mono">00:15</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Critical', 'reaction', 95)}</td>
                                            <td className="py-2 text-right font-mono">08:00 (80%)</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Critical', 'resolution', 80)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-orange-300 font-bold">Major</td>
                                            <td className="py-2">Medium</td>
                                            <td className="py-2 text-right font-mono">00:15</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Major', 'reaction', 95)}</td>
                                            <td className="py-2 text-right font-mono">16:00 (80%)</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Major', 'resolution', 80)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-blue-300 font-bold">Minor</td>
                                            <td className="py-2">Low</td>
                                            <td className="py-2 text-right font-mono">00:15</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Minor', 'reaction', 95)}</td>
                                            <td className="py-2 text-right font-mono">32:00 (80%)</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Minor', 'resolution', 80)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-gray-300 font-bold">Trivial</td>
                                            <td className="py-2">Lowest</td>
                                            <td className="py-2 text-right font-mono">00:15</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Trivial', 'reaction', 95)}</td>
                                            <td className="py-2 text-right font-mono">40:00 (80%)</td>
                                            <td className="py-2 text-right font-mono">{renderComplianceCell('Trivial', 'resolution', 80)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* 1. Compliance */}
                            <div className="glass-panel p-6 rounded-xl border border-white/10 h-80 flex flex-col">
                                <h3 className="text-white font-bold mb-4">Compliance Overview</h3>
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
                            </div>

                            {/* 2. Priority BreakDown */}
                            <div className="glass-panel p-6 rounded-xl border border-white/10 h-80 flex flex-col">
                                <h3 className="text-white font-bold mb-4">SLA by Tier (Valid)</h3>
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
                            </div>

                            {/* 3. Rejected Analysis */}
                            <div className="glass-panel p-6 rounded-xl border border-white/10 h-80 flex flex-col">
                                <h3 className="text-white font-bold mb-4">Rejected Issues by Tier</h3>
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
                            </div>
                        </div>

                        {/* Trend Charts */}
                        <TrendCharts issues={validIssues} />

                        {/* Compliance Percentage Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Reaction Percentage Compliance */}
                            <div className="glass-panel p-6 rounded-xl border border-white/10 h-80">
                                <h3 className="text-white font-bold mb-4 text-sm">Reaction Compliance % vs Target (95%)</h3>
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
                            </div>

                            {/* Resolution Percentage Compliance */}
                            <div className="glass-panel p-6 rounded-xl border border-white/10 h-80">
                                <h3 className="text-white font-bold mb-4 text-sm">Resolution Compliance % vs Target</h3>
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
                            </div>
                        </div>

                        {/* Release History Chart */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10 h-96">
                            <h3 className="text-white font-bold mb-4 uppercase">Daily Release History</h3>
                            <ReleaseChart issues={validIssues} />
                        </div>

                        {/* Throughput Analysis (Open vs Close) */}
                        <div className="glass-panel p-6 rounded-xl border border-white/10">
                            <h3 className="text-white font-bold mb-4 uppercase">Throughput Analysis (Open vs Close)</h3>
                            <ThroughputChart issues={filteredIssues} />
                        </div>
                    </div>
                )
            }

            {/* Detailed Table */}
            {
                activeTab === 'issues' && (
                    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">Analysis Details</h3>
                            <button
                                onClick={handleClearData}
                                className="text-sm text-red-400 hover:text-red-300 font-medium border border-red-900/50 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
                            >
                                🗑 Reset / Upload New
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-brand-text-sec">
                                <thead className="bg-brand-deep/80 text-white uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Key</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center border-l border-white/10">Reaction (Target: 00:15)</th>
                                        <th className="px-6 py-4 text-center border-l border-white/10" colSpan={3}>Resolution (hh:mm)</th>
                                    </tr>
                                    <tr className="bg-brand-deep/30 text-xs">
                                        <th className="px-6 py-2"></th>
                                        <th className="px-6 py-2"></th>
                                        <th className="px-6 py-2"></th>
                                        <th className="px-6 py-2 text-center border-l border-white/10">Actual</th>
                                        <th className="px-6 py-2 text-right border-l border-white/10">Target</th>
                                        <th className="px-6 py-2 text-right">Actual (Net)</th>
                                        <th className="px-6 py-2 text-right">Paused</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredIssues.map((issue) => {
                                        const isRejected = issue.status.toLowerCase() === 'rejected'
                                        return (
                                            <tr key={issue.key}
                                                onClick={() => setSelectedIssue(issue)}
                                                onMouseEnter={(e) => {
                                                    setHoveredIssue(issue)
                                                    setTooltipPos({ x: e.clientX, y: e.clientY })
                                                }}
                                                onMouseMove={(e) => {
                                                    setTooltipPos({ x: e.clientX, y: e.clientY })
                                                }}
                                                onMouseLeave={() => setHoveredIssue(null)}
                                                className={`cursor-pointer transition-colors
                                            ${isRejected ? 'bg-orange-900/20 hover:bg-orange-900/30'
                                                        : !issue.resolutionSLAMet || !issue.reactionSLAMet ? 'bg-red-900/10 hover:bg-red-900/20'
                                                            : 'hover:bg-gray-750'}`
                                                }
                                            >
                                                <td className={`px-6 py-4 font-mono font-medium ${isRejected ? 'text-orange-200' : 'text-white'}`}>
                                                    <div className="flex items-center gap-2">
                                                        {isRejected && <span className="text-orange-500">⚠</span>}
                                                        <div>
                                                            <div>{issue.key}</div>
                                                            <div className="text-[10px] opacity-70">{issue.issueType}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold border w-fit ${issue.slaTier === 'Expedite' ? 'bg-purple-900/30 text-purple-300 border-purple-900' :
                                                            issue.slaTier === 'Critical' ? 'bg-red-900/30 text-red-300 border-red-900' :
                                                                issue.slaTier === 'Major' ? 'bg-orange-900/30 text-orange-300 border-orange-900' :
                                                                    issue.slaTier === 'Minor' ? 'bg-blue-900/30 text-blue-300 border-blue-900' :
                                                                        'bg-gray-700 text-gray-300 border-gray-600'
                                                            }`}>
                                                            {issue.slaTier}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 mt-1">Jira: {issue.priority}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium">
                                                    {isRejected ? <span className="text-orange-400">REJECTED</span> : issue.status}
                                                </td>

                                                {/* Reaction Time */}
                                                <td className="px-6 py-4 text-center border-l border-gray-700">
                                                    {isRejected ? <span className="text-gray-600">-</span> : (
                                                        <div className="flex flex-col items-center">
                                                            <span className={`font-mono ${issue.reactionSLAMet ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                                                                {formatDuration(issue.reactionTime)}
                                                            </span>
                                                            {!issue.reactionSLAMet && (
                                                                <span className="text-[10px] text-red-400 bg-red-900/20 px-1 rounded mt-1 border border-red-900/50">
                                                                    FAILED (+{formatDuration(issue.reactionTime - 15)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Resolution Time */}
                                                <td className="px-6 py-4 text-right border-l border-gray-700 font-mono text-gray-500">{formatDuration(issue.slaTargetResolution)}</td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    {isRejected ? <span className="text-gray-600">-</span> : (
                                                        <div className="flex flex-col items-end">
                                                            <span className={issue.resolutionSLAMet ? 'text-green-400' : 'text-red-400 font-bold'}>
                                                                {formatDuration(issue.resolutionTime)}
                                                            </span>
                                                            {!issue.resolutionSLAMet && (
                                                                <span className="text-[10px] text-red-400 bg-red-900/20 px-1 rounded mt-1 border border-red-900/50">
                                                                    FAILED
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-500">
                                                    {isRejected ? <span className="text-gray-600">-</span> : formatDuration(issue.timeInPause)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div >
                    </div >
                )
            }

            {/* Tooltip */}
            {
                hoveredIssue && (
                    <div
                        className="fixed z-50 bg-gray-900 border border-gray-600 shadow-xl rounded-lg p-3 text-xs text-white pointer-events-none"
                        style={{ top: tooltipPos.y + 16, left: tooltipPos.x + 16 }}
                    >
                        <div className="font-bold mb-2 text-gray-300 border-b border-gray-700 pb-1">
                            SLA Targets ({hoveredIssue.slaTier})
                        </div>
                        {hoveredIssue.status.toLowerCase() === 'rejected' ? (
                            <div className="text-orange-400 italic">Rejected Issue</div>
                        ) : (
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                                <span className="text-gray-400">Reaction:</span>
                                <span className="font-mono text-right font-medium text-blue-300">
                                    {formatDuration(hoveredIssue.slaTargetReaction)}
                                </span>

                                <span className="text-gray-400">Resolution:</span>
                                <span className="font-mono text-right font-medium text-blue-300">
                                    {formatDuration(hoveredIssue.slaTargetResolution)}
                                </span>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Detail Modal */}
            {
                selectedIssue && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedIssue(null)}>
                        <div className={`bg-gray-900 border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${selectedIssue.status.toLowerCase() === 'rejected' ? 'border-orange-500' : 'border-gray-700'}`} onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-800 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        {selectedIssue.key}
                                        {selectedIssue.status.toLowerCase() === 'rejected' && <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded">REJECTED</span>}
                                    </h2>
                                    <p className="text-gray-400 mt-1">{selectedIssue.summary}</p>
                                </div>
                                <button onClick={() => setSelectedIssue(null)} className="text-gray-500 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <div className="text-sm text-gray-500 uppercase font-bold">Priority</div>
                                        <div className="text-white font-medium mt-1">{selectedIssue.priority} ({selectedIssue.slaTier})</div>
                                    </div>
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <div className="text-sm text-gray-500 uppercase font-bold">Created</div>
                                        <div className="text-white font-medium mt-1">{selectedIssue.created}</div>
                                    </div>
                                </div>

                                {selectedIssue.status.toLowerCase() !== 'rejected' ? (
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold border-b border-gray-800 pb-2">SLA Performance</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Reaction */}
                                            <div className={`p-4 rounded-xl border ${selectedIssue.reactionSLAMet ? 'bg-green-900/10 border-green-900' : 'bg-red-900/10 border-red-900'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-bold text-gray-300">Reaction Time</span>
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${selectedIssue.reactionSLAMet ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                                        {selectedIssue.reactionSLAMet ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="text-2xl font-mono text-white">{formatDuration(selectedIssue.reactionTime)}</div>
                                                    <div className="text-xs text-gray-500">Target: 00:15</div>
                                                </div>
                                            </div>

                                            {/* Resolution */}
                                            <div className={`p-4 rounded-xl border ${selectedIssue.resolutionSLAMet ? 'bg-green-900/10 border-green-900' : 'bg-red-900/10 border-red-900'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-bold text-gray-300">Resolution Time</span>
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${selectedIssue.resolutionSLAMet ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                                        {selectedIssue.resolutionSLAMet ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="text-2xl font-mono text-white">{formatDuration(selectedIssue.resolutionTime)}</div>
                                                    <div className="text-xs text-gray-500">Target: {formatDuration(selectedIssue.slaTargetResolution)}</div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-400">
                                                    Actual work time. Excludes {formatDuration(selectedIssue.timeInPause)} of pause.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-orange-900/20 border border-orange-500/50 rounded-xl text-center">
                                        <h3 className="text-xl font-bold text-orange-400 mb-2">Issue Rejected</h3>
                                        <p className="text-gray-300">This issue was rejected and does not count towards SLA statistics.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    )
}


function ThroughputChart({ issues }: { issues: any[] }): JSX.Element {
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

function ReleaseChart({ issues }: { issues: any[] }): JSX.Element {
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
        // Fix sorting: We need the original sort key.
        // Let's cheat and trust the "date" field is display only.
        // Actually, let's just sort by fullDate parsing
        return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    })
}

function TrendCharts({ issues }: { issues: any[] }): JSX.Element {
    const [period, setPeriod] = useState<'day' | 'month'>('day')

    const data = groupIssuesByPeriod(issues, period)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-bold text-lg uppercase">Trend Analysis (Valid Issues)</h3>
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
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-80">
                    <h3 className="text-white font-bold mb-4 text-sm">Reaction Time Trend</h3>
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
                </div>

                {/* Resolution Trend */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-80">
                    <h3 className="text-white font-bold mb-4 text-sm">Resolution Time Trend</h3>
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
                </div>
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

function formatDuration(minutes: number): string {
    if (isNaN(minutes)) return '00:00'
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function uniqueMonths(issues: any[]): string[] {
    const months = new Set<string>()
    issues.forEach(i => {
        const d = parseDate(i.created)
        if (d) {
            const m = d.toLocaleString('default', { month: 'long', year: 'numeric' })
            months.add(m)
        }
    })
    // Sort by date ideally, but simple sort for now
    return Array.from(months)
}

function calculateCompliance(issues: any[]): number {
    if (issues.length === 0) return 100
    const met = issues.filter(i => i.resolutionSLAMet && i.reactionSLAMet).length
    return (met / issues.length) * 100
}

function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null

    // Try Standard Date Parse first
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d

    // Try DD/MM/YYYY HH:MM or DD/MM/YYYY
    // Regex: (\d{1,2})[/-](\d{1,2})[/-](\d{4})
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (ddmmyyyy) {
        const day = parseInt(ddmmyyyy[1])
        const month = parseInt(ddmmyyyy[2]) - 1
        const year = parseInt(ddmmyyyy[3])
        return new Date(year, month, day)
    }

    return null
}
