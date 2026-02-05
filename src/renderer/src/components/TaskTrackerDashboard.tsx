import { useState, useEffect } from 'react'
import { SLAReport } from '../../../shared/sla-types'
import { Project } from '../../../shared/project-types'
import { SLATable } from './organisms/SLA/SLATable'
import { IssueDetailModal } from './organisms/SLA/IssueDetailModal'
import { Card, Typography, Button, Badge, Select } from '@design-system'
import { formatDuration } from './organisms/SLA/utils'
import { ThemeToggle } from '../design-system'

interface TaskTrackerDashboardProps {
    currentProject: Project
}

export function TaskTrackerDashboard({ currentProject }: TaskTrackerDashboardProps): JSX.Element {
    const [report, setReport] = useState<SLAReport | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedPriority, setSelectedPriority] = useState<string>('All')
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
    const [hoveredIssue, setHoveredIssue] = useState<any | null>(null)
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

    const storageKey = `task_tracker_data_${currentProject.name}`

    const fetchTasks = async () => {
        const projectKey = currentProject.config?.jiraProjectKey
        if (!projectKey) {
            setReport({ issues: [], stats: {} as any })
            return
        }

        setLoading(true)
        try {
            // JQL for Tasks, excluding Done and Rejected
            const jql = `project = "${projectKey}" AND issuetype = Task AND resolution is EMPTY AND statusCategory != Done AND status != Rejected ORDER BY created DESC`

            const data = await window.api.jiraSearchIssues(jql, {
                maxResults: 1000,
                expand: ['changelog'],
                fields: ['summary', 'status', 'issuetype', 'created', 'priority', 'resolutiondate']
            })

            let issues = data.issues || []
            if (issues.length === 0) {
                setReport({ issues: [], stats: {} as any })
                return
            }

            const result = await window.api.jiraParseApiIssues(issues, currentProject.config)
            setReport(result)

            // Persist locally
            localStorage.setItem(storageKey, JSON.stringify(issues))
        } catch (e: any) {
            console.error('Failed to fetch tasks', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const savedData = localStorage.getItem(storageKey)
        if (savedData) {
            try {
                const issues = JSON.parse(savedData)
                window.api.jiraParseApiIssues(issues, currentProject.config).then(setReport)
            } catch (e) {
                fetchTasks()
            }
        } else {
            fetchTasks()
        }
    }, [currentProject])

    if (!currentProject.config?.jiraProjectKey) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="text-6xl mb-6">⚙️</div>
                <Typography variant="h2" className="text-brand-text-pri mb-2">Jira Mapping Required</Typography>
                <Typography variant="body" className="text-brand-text-sec max-w-sm mb-8">
                    To track Tasks, you must map this project to its corresponding <strong>Jira Project Key</strong> in Project Settings.
                </Typography>
            </div>
        )
    }

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mb-4"></div>
                <Typography variant="body" className="text-gray-400">Fetching live tasks...</Typography>
            </div>
        )
    }

    if (!report || report.issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="text-6xl mb-6">🏜️</div>
                <Typography variant="h2" className="text-brand-text-pri mb-2">No Open Tasks</Typography>
                <Typography variant="body" className="text-brand-text-sec max-w-sm mb-8">
                    No Tasks currently match the "Open" criteria for this project.
                </Typography>
                <Button variant="primary" onClick={fetchTasks} isLoading={loading}>
                    🔄 Refresh Data
                </Button>
            </div>
        )
    }

    const filteredIssues = report.issues.filter(i => {
        if (selectedPriority !== 'All' && i.slaTier !== selectedPriority) return false
        return true
    })

    const availablePriorities = currentProject.config?.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <Typography variant="h2" className="text-brand-text-pri">Task Tracker</Typography>
                    <Typography variant="body" className="text-brand-text-sec">Live status of active Tasks (15-business-day SLA)</Typography>
                </div>

                <Button variant="secondary" size="sm" onClick={fetchTasks} isLoading={loading} className="gap-2">
                    <span>🔄</span> Refresh Live
                </Button>
                <ThemeToggle />
            </div>

            <div className="glass-panel sticky top-0 z-30 p-4 border border-white/10 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                        <Typography variant="caption" className="text-brand-text-sec uppercase font-bold">Priority</Typography>
                        <Select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                        >
                            <option value="All">All Priorities</option>
                            {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="cyan" className="bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 px-3 py-1">
                        SLA: 15 Business Days
                    </Badge>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SLATable
                    issues={filteredIssues}
                    onSelectIssue={setSelectedIssue}
                    onHoverIssue={(issue, x, y) => {
                        setHoveredIssue(issue)
                        setTooltipPos({ x, y })
                    }}
                    hideReaction={true}
                />
            </div>

            {hoveredIssue && (
                <div
                    className="fixed z-50 bg-gray-900 dark:bg-gray-800 border border-gray-700 shadow-xl rounded-lg p-3 text-xs text-white pointer-events-none transition-all duration-75"
                    style={{ top: tooltipPos.y + 16, left: tooltipPos.x + 16 }}
                >
                    <div className="font-bold mb-2 text-gray-300 border-b border-gray-700 pb-1">
                        Task SLA
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                        <span className="text-gray-400">Total SLA:</span>
                        <span className="font-mono text-right font-medium text-blue-300">
                            15 Days
                        </span>
                        <span className="text-gray-400">Target (Minutes):</span>
                        <span className="font-mono text-right font-medium text-blue-300">
                            {formatDuration(hoveredIssue.slaTargetResolution)}
                        </span>
                    </div>
                </div>
            )}

            {selectedIssue && (
                <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
            )}
        </div>
    )
}
