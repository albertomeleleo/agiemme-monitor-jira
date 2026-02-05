import { useState, useRef, useEffect } from 'react'
import { SLAReport, SLAIssue } from '../../../shared/sla-types'
import { Project } from '../../../shared/project-types'
import { SLAFilters } from './organisms/SLA/SLAFilters'
import { SLATable } from './organisms/SLA/SLATable'
import { IssueDetailModal } from './organisms/SLA/IssueDetailModal'
import { Card, Typography, Button, Badge, Select } from '@design-system'
import { formatDuration } from './organisms/SLA/utils'
import { ThemeToggle } from '../design-system'

interface OpenIssuesDashboardProps {
    currentProject: Project
}

export function OpenIssuesDashboard({ currentProject }: OpenIssuesDashboardProps): JSX.Element {
    const DEFAULT_ISSUE_TYPES = [
        { raw: 'Bug', label: '🐞 Bugs' },
        { raw: '[System] Service request', label: '🤖 System' }
    ]

    const issueTypes = currentProject.config?.issueTypes || DEFAULT_ISSUE_TYPES

    const [report, setReport] = useState<SLAReport | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedPriority, setSelectedPriority] = useState<string>('All')
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
    const [hoveredIssue, setHoveredIssue] = useState<any | null>(null)
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
    const [selectedIssueType, setSelectedIssueType] = useState<string>('All')

    const storageKey = `open_issues_data_${currentProject.name}`

    const fetchOpenIssues = async () => {
        const projectKey = currentProject.config?.jiraProjectKey
        if (!projectKey) {
            setReport({ issues: [], stats: {} as any })
            return
        }

        setLoading(true)
        try {
            // JQL for Open Issues: Bugs and Service Requests, excluding Done and Rejected
            const jql = `project = "${projectKey}" AND resolution is EMPTY AND statusCategory != Done AND status != Rejected AND (issuetype = Bug OR issuetype = "[System] Service request") ORDER BY created DESC`

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

            // Persist locally for speed on next load
            localStorage.setItem(storageKey, JSON.stringify(issues))
        } catch (e: any) {
            console.error('Failed to fetch open issues', e)
        } finally {
            setLoading(false)
        }
    }

    // Load persisted data or fetch fresh on mount/project change
    useEffect(() => {
        const savedData = localStorage.getItem(storageKey)
        if (savedData) {
            try {
                const issues = JSON.parse(savedData)
                window.api.jiraParseApiIssues(issues, currentProject.config).then(setReport)
            } catch (e) {
                fetchOpenIssues()
            }
        } else {
            fetchOpenIssues()
        }
    }, [currentProject])

    if (!currentProject.config?.jiraProjectKey) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="text-6xl mb-6">⚙️</div>
                <Typography variant="h2" className="text-brand-text-pri mb-2">Jira Mapping Required</Typography>
                <Typography variant="body" className="text-brand-text-sec max-w-sm mb-8">
                    To show Open Issues, you must first map this project to its corresponding <strong>Jira Project Key</strong> in the Project Settings.
                </Typography>
                <Card variant="solid" className="bg-brand-cyan/5 border-brand-cyan/20 p-6 max-w-md">
                    <Typography variant="caption" className="text-brand-cyan font-bold uppercase mb-2 block">How to fix:</Typography>
                    <ul className="text-left text-sm text-gray-400 space-y-2">
                        <li>1. Click on the <strong>Settings</strong> button next to the project name.</li>
                        <li>2. Scroll down to the <strong>Jira Mapping</strong> section.</li>
                        <li>3. Select or enter the correct <strong>Jira Project Key</strong>.</li>
                        <li>4. Click <strong>Save Configuration</strong>.</li>
                    </ul>
                </Card>
            </div>
        )
    }

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mb-4"></div>
                <Typography variant="body" className="text-gray-400">Fetching live open issues...</Typography>
            </div>
        )
    }

    if (!report || report.issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="text-6xl mb-6">🏜️</div>
                <Typography variant="h2" className="text-brand-text-pri mb-2">No Open Issues</Typography>
                <Typography variant="body" className="text-brand-text-sec max-w-sm mb-8">
                    Everything looks clear or no issues match the "Open" criteria for this project.
                </Typography>
                <Button variant="primary" onClick={fetchOpenIssues} isLoading={loading}>
                    🔄 Refresh Data
                </Button>
            </div>
        )
    }

    // 1. FILTERING (Simpler because we only care about Open issues)
    const filteredIssues = report.issues.filter(i => {
        // Filter by Priority
        if (selectedPriority !== 'All') {
            if (i.slaTier !== selectedPriority) return false
        }

        // Filter by Issue Type
        if (selectedIssueType !== 'All' && i.issueType !== selectedIssueType) return false

        return true
    })

    const availablePriorities = currentProject.config?.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <Typography variant="h2" className="text-brand-text-pri">Open Issues</Typography>
                    <Typography variant="body" className="text-brand-text-sec">Live status of active Bugs and Service Requests</Typography>
                </div>

                <Button variant="secondary" size="sm" onClick={fetchOpenIssues} isLoading={loading} className="gap-2">
                    <span>🔄</span> Refresh Live
                </Button>
                <ThemeToggle />
            </div>

            {/* Filters (Simplified) */}
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

                    <div className="flex items-center gap-2">
                        <Typography variant="caption" className="text-brand-text-sec uppercase font-bold">Type</Typography>
                        <Select
                            value={selectedIssueType}
                            onChange={(e) => setSelectedIssueType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            {issueTypes.map(t => <option key={t.raw} value={t.raw}>{t.label}</option>)}
                        </Select>
                    </div>
                </div>
            </div>

            {/* Table */}
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

            {/* Floating Tooltip */}
            {hoveredIssue && (
                <div
                    className="fixed z-50 bg-gray-900 dark:bg-gray-800 border border-gray-700 shadow-xl rounded-lg p-3 text-xs text-white pointer-events-none transition-all duration-75"
                    style={{ top: tooltipPos.y + 16, left: tooltipPos.x + 16 }}
                >
                    <div className="font-bold mb-2 text-gray-300 border-b border-gray-700 pb-1">
                        SLA Targets ({hoveredIssue.slaTier})
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                        <span className="text-gray-400">Reaction Target:</span>
                        <span className="font-mono text-right font-medium text-blue-300">
                            {formatDuration(hoveredIssue.slaTargetReaction)}
                        </span>

                        <span className="text-gray-400">Resolution Target:</span>
                        <span className="font-mono text-right font-medium text-blue-300">
                            {formatDuration(hoveredIssue.slaTargetResolution)}
                        </span>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedIssue && (
                <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
            )}
        </div>
    )
}
