import { useState, useRef, useEffect } from 'react'
import { SLAReport, SLAIssue } from '../../../shared/sla-types'
import { Project } from '../../../shared/project-types'
import { parseDate, formatDuration } from './organisms/SLA/utils'
import { SLAStatsGrid } from './organisms/SLA/SLAStatsGrid'
import { SLAFilters } from './organisms/SLA/SLAFilters'
import { SLATable } from './organisms/SLA/SLATable'
import { SLALegend } from './organisms/SLA/SLALegend'
import { SLACharts } from './organisms/SLA/SLACharts'
import { JiraFetchModal } from './organisms/SLA/JiraFetchModal'
import { IssueDetailModal } from './organisms/SLA/IssueDetailModal'
import { Card, Typography, Button } from '@design-system'

interface SLADashboardProps {
    currentProject: Project
}

export function SLADashboard({ currentProject }: SLADashboardProps): JSX.Element {
    const DEFAULT_ISSUE_TYPES = [
        { raw: 'Bug', label: '🐞 Bugs' },
        { raw: '[System] Service request', label: '🤖 System' }
    ]

    const issueTypes = currentProject.config?.issueTypes || DEFAULT_ISSUE_TYPES

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
    const [selectedIssueType, setSelectedIssueType] = useState<string>(issueTypes[0]?.raw || 'Bug')

    // Jira Fetch Modal
    const [showJiraModal, setShowJiraModal] = useState(false)
    const [lastJql, setLastJql] = useState<string | null>(null)
    const [lastMaxResults, setLastMaxResults] = useState<number>(1000)

    // Reset selected issue type if it's not valid for current project
    useEffect(() => {
        const types = currentProject.config?.issueTypes || DEFAULT_ISSUE_TYPES
        const currentTypeExists = types.some(t => t.raw === selectedIssueType)
        if (!currentTypeExists && types.length > 0) {
            setSelectedIssueType(types[0].raw)
        }
    }, [currentProject, selectedIssueType])

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

    const storageKey = `sla_csv_content_${currentProject.name}`
    const jiraStorageKey = `sla_jira_data_${currentProject.name}`
    const lastJqlKey = `sla_last_jql_${currentProject.name}`
    const lastMaxResultsKey = `sla_last_max_results_${currentProject.name}`

    // Load persisted data when project changes
    useEffect(() => {
        setReport(null)
        setSelectedMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))

        const savedJiraData = localStorage.getItem(jiraStorageKey)
        const savedCsvData = localStorage.getItem(storageKey)
        const savedJql = localStorage.getItem(lastJqlKey)
        const savedMaxResults = localStorage.getItem(lastMaxResultsKey)

        if (savedJql) setLastJql(savedJql)
        if (savedMaxResults) setLastMaxResults(Number(savedMaxResults))

        if (savedJiraData) {
            setLoading(true)
            try {
                const issues = JSON.parse(savedJiraData)
                window.api.jiraParseApiIssues(issues, currentProject.config)
                    .then(result => {
                        setReport(result)
                        // Restore selected month if possible? Defaulting to current for now
                    })
                    .catch(err => {
                        console.error('Failed to load persisted Jira data', err)
                        localStorage.removeItem(jiraStorageKey)
                    })
                    .finally(() => setLoading(false))
            } catch (e) {
                console.error('Failed to parse saved Jira data', e)
                setLoading(false)
            }
        } else if (savedCsvData) {
            setLoading(true)
            window.api.parseSLA(savedCsvData, currentProject.config)
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
            localStorage.removeItem(jiraStorageKey) // Clear Jira cache
            // Pass config to parser
            const result = await window.api.parseSLA(text, currentProject.config)
            setReport(result)
            setSelectedMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
        } catch (error) {
            console.error(error)
            alert('Failed to parse CSV')
        } finally {
            setLoading(false)
        }
    }

    const handleJiraFetch = async (jql: string, maxResults: number) => {
        setLoading(true)
        try {
            const data = await window.api.jiraSearchIssues(jql, {
                maxResults,
                expand: ['changelog'], // Crucial for SLA calculation
                fields: ['summary', 'status', 'issuetype', 'created', 'priority', 'resolutiondate']
            })

            // Handle pagination if needed? For now just one page as per maxResults
            let issues = data.issues || []
            if (issues.length === 0) {
                alert('No issues found')
                return
            }

            const result = await window.api.jiraParseApiIssues(issues, currentProject.config)
            setReport(result)
            setSelectedMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))

            // Persist
            try {
                localStorage.setItem(jiraStorageKey, JSON.stringify(issues))
                localStorage.setItem(lastJqlKey, jql)
                localStorage.setItem(lastMaxResultsKey, maxResults.toString())
                setLastJql(jql)
                setLastMaxResults(maxResults)
                localStorage.removeItem(storageKey) // Clear CSV cache
            } catch (e) {
                console.error('Failed to save to localStorage', e)
            }

        } catch (e: any) {
            console.error(e)
            alert(`Jira Fetch Error: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        if (lastJql) {
            await handleJiraFetch(lastJql, lastMaxResults)
        }
    }

    const handleReset = () => {
        setReport(null)
        localStorage.removeItem(storageKey)
        setSelectedIssue(null)
        setHoveredIssue(null)
    }

    const handleExport = async () => {
        if (!filteredIssues.length) return

        const headers = [
            'Key', 'Issue Type', 'Priority', 'Status', 'Created', 'Resolution Date',
            'SLA Tier', 'Reaction Time (min)', 'Reaction SLA Met',
            'Resolution Time (min)', 'Resolution SLA Met', 'Time in Pause (min)',
            'SLA Target Reaction', 'SLA Target Resolution'
        ]

        const rows = filteredIssues.map(i => [
            i.key,
            i.issueType,
            i.priority,
            i.status,
            i.created,
            i.resolutionDate || '',
            i.slaTier,
            i.reactionTime,
            i.reactionSLAMet ? 'YES' : 'NO',
            i.resolutionTime,
            i.resolutionSLAMet ? 'YES' : 'NO',
            i.timeInPause,
            i.slaTargetReaction,
            i.slaTargetResolution
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        const filename = `SLA_Export_${currentProject.name}_${new Date().toISOString().split('T')[0]}.csv`
        const success = await window.api.saveFile(currentProject.name, filename, csvContent)

        if (success) {
            alert(`Exported to Documents/ReleaseAnalyzer/${currentProject.name}/${filename}`)
        } else {
            alert('Export failed.')
        }
    }

    const uniqueMonths = (issues: any[]): string[] => {
        const months = new Set<string>()
        issues.forEach(i => {
            const d = parseDate(i.created)
            if (d) {
                const m = d.toLocaleString('default', { month: 'long', year: 'numeric' })
                months.add(m)
            }
        })
        return Array.from(months)
    }

    const COLORS = ['#10B981', '#EF4444', '#00f2ff']

    if (!report && !loading) {
        return (
            <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card variant="glass" className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/10 hover:border-brand-cyan/50 hover:bg-brand-card/80 transition-all cursor-pointer group h-96 relative overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                    >

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileUpload}
                        />
                        <div className="text-6xl mb-6 grayscale group-hover:grayscale-0 transition-all scale-90 group-hover:scale-100 duration-300">📊</div>
                        <Typography variant="h3" className="text-white mb-2">Upload CSV</Typography>
                        <Typography variant="body" className="text-gray-400 max-w-xs">Drop your Jira CSV export here manually.</Typography>
                    </Card>

                    <Card variant="glass" className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/10 hover:border-brand-cyan/50 hover:bg-brand-card/80 transition-all cursor-pointer group h-96 relative overflow-hidden"
                        onClick={() => setShowJiraModal(true)}
                    >

                        <div className="text-6xl mb-6 grayscale group-hover:grayscale-0 transition-all scale-90 group-hover:scale-100 duration-300">⚡</div>
                        <Typography variant="h3" className="text-white mb-2">Fetch from Jira</Typography>
                        <Typography variant="body" className="text-gray-400 max-w-xs mb-4">Connect directly to Jira Cloud to analyze real-time data.</Typography>

                        {lastJql && !loading && (
                            <div className="mt-4 pt-4 border-t border-white/10 w-full animate-in fade-in slide-in-from-top-2 duration-500">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full gap-2 shadow-lg shadow-brand-cyan/20 px-6"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRefresh()
                                    }}
                                >
                                    <span>🔄</span> Quick Sync Last Query
                                </Button>
                                <Typography variant="caption" className="text-gray-500 mt-2 block truncate px-2 italic">
                                    {lastJql}
                                </Typography>
                            </div>
                        )}
                    </Card>
                </div>

                {showJiraModal && (
                    <JiraFetchModal
                        onClose={() => setShowJiraModal(false)}
                        onFetch={handleJiraFetch}
                    />
                )}
            </div>
        )
    }

    if (loading) return <div className="text-white text-center p-12">Analyzing SLAs...</div>

    // Extract available months and priorities
    const availableMonths = uniqueMonths(report?.issues || [])
    const availablePriorities = currentProject.config?.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']

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

        // Filter by Priority
        if (selectedPriority !== 'All') {
            if (i.slaTier !== selectedPriority) return false
        }

        // Filter Exclude Rejected
        if (excludeRejected && i.status.toLowerCase() === 'rejected') return false

        // Filter by Status
        if (filterMode === 'failed') return !i.resolutionSLAMet || !i.reactionSLAMet

        // Dynamic Issue Type Filter
        if (selectedIssueType !== 'All' && i.issueType !== selectedIssueType) return false

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

    const getComplianceStatsForIssues = (issuesSubset: SLAIssue[]) => {
        if (issuesSubset.length === 0) return { reaction: 100, resolution: 100 }
        const reactionMet = issuesSubset.filter(i => i.reactionSLAMet).length
        const resolutionMet = issuesSubset.filter(i => i.resolutionSLAMet).length
        return {
            reaction: (reactionMet / issuesSubset.length) * 100,
            resolution: (resolutionMet / issuesSubset.length) * 100
        }
    }

    // --- REACTION DATA ---
    const reactionGroups = currentProject.config?.sla?.aggregation?.reaction || []
    const reactionChartData = reactionGroups.length > 0
        ? reactionGroups.map(g => {
            const groupIssues = validIssues.filter(i => g.tiers.includes(i.slaTier))
            const stats = getComplianceStatsForIssues(groupIssues)
            return {
                name: g.name,
                reactionActual: stats.reaction,
                reactionTarget: 100 - g.tolerance,
                resolutionActual: 0, resolutionTarget: 0 // Type safety filler
            }
        })
        : availablePriorities.map(tier => {
            const issues = validIssues.filter(i => i.slaTier === tier)
            const stats = getComplianceStatsForIssues(issues)
            const tol = currentProject.config?.sla?.tolerances?.reaction?.[tier] ?? 5
            return {
                name: tier,
                reactionActual: stats.reaction,
                reactionTarget: 100 - tol,
                resolutionActual: 0, resolutionTarget: 0
            }
        })

    // --- RESOLUTION DATA ---
    const resolutionGroups = currentProject.config?.sla?.aggregation?.resolution || []
    const resolutionChartData = resolutionGroups.length > 0
        ? resolutionGroups.map(g => {
            const groupIssues = validIssues.filter(i => g.tiers.includes(i.slaTier))
            const stats = getComplianceStatsForIssues(groupIssues)
            return {
                name: g.name,
                resolutionActual: stats.resolution,
                resolutionTarget: 100 - g.tolerance,
                reactionActual: 0, reactionTarget: 0
            }
        })
        : availablePriorities.map(tier => {
            const issues = validIssues.filter(i => i.slaTier === tier)
            const stats = getComplianceStatsForIssues(issues)
            const defaultTol = tier === 'Expedite' ? 10 : 20
            const tol = currentProject.config?.sla?.tolerances?.resolution?.[tier] ?? defaultTol
            return {
                name: tier,
                resolutionActual: stats.resolution,
                resolutionTarget: 100 - tol,
                reactionActual: 0, reactionTarget: 0
            }
        })

    const complianceChartData: any[] = [] // Legacy placeholder

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
            {/* Header Stats */}
            <SLAStatsGrid validIssues={validIssues} rejectedIssues={rejectedIssues} />

            {/* Scroll Sentinel for Sticky Detection */}
            <div ref={sentinelRef} className="h-px w-full absolute -mt-4 opacity-0 pointer-events-none" />

            {/* Filters */}
            <SLAFilters
                isSticky={isSticky}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={availableMonths}
                selectedPriority={selectedPriority}
                onPriorityChange={setSelectedPriority}
                availablePriorities={availablePriorities}
                filterMode={filterMode}
                onFilterModeChange={setFilterMode}
                excludeRejected={excludeRejected}
                onExcludeRejectedChange={setExcludeRejected}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                selectedIssueType={selectedIssueType}
                onIssueTypeChange={setSelectedIssueType}
                issueTypes={issueTypes}
                onReset={handleReset}
                onExport={handleExport}
                onRefresh={lastJql ? handleRefresh : undefined}
                isRefreshing={loading}
            />

            {
                activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Legend */}
                        <SLALegend validIssues={validIssues} config={currentProject.config} />

                        {/* Charts */}
                        <SLACharts
                            chartData={chartData}
                            tierStats={tierStats}
                            rejectedStats={rejectedStats}
                            complianceChartData={complianceChartData}
                            reactionData={reactionChartData}
                            resolutionData={resolutionChartData}
                            validIssues={validIssues}
                            filteredIssues={filteredIssues}
                            COLORS={COLORS}
                        />
                    </div>
                )
            }

            {/* Detailed Table */}
            {
                activeTab === 'issues' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SLATable
                            issues={filteredIssues}
                            onSelectIssue={setSelectedIssue}
                            onHoverIssue={(issue, x, y) => {
                                setHoveredIssue(issue)
                                setTooltipPos({ x, y })
                            }}
                        />
                    </div>
                )
            }

            {/* Floating Tooltip */}
            {hoveredIssue && (
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
            )}

            {/* Detail Modal */}
            {selectedIssue && (
                <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
            )}

        </div>
    )
}
