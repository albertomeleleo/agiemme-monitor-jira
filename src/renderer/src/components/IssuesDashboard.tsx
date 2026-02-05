import { useState, useEffect, useMemo } from 'react'
import { Card, Typography, Button, Input, IssueStatusBadge, Select, Badge } from '@design-system'
import { Project } from '../types'
import { IssuesConfigModal } from './IssuesConfigModal'

interface IssuesDashboardProps {
    currentProject: Project
}

interface IssueDB {
    issues: any[]
    lastSync: number
    jql: string
    whatsappPhone?: string
    whatsappApiKey?: string
    pollInterval?: number
    targetStatus?: string
}

export function IssuesDashboard({ currentProject }: IssuesDashboardProps): JSX.Element {
    const [db, setDb] = useState<IssueDB>({ issues: [], lastSync: 0, jql: '' })
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showConfig, setShowConfig] = useState(false)

    const [filterStatus, setFilterStatus] = useState('All')
    const [filterPriority, setFilterPriority] = useState('All')
    const [isGlobal, setIsGlobal] = useState(false)
    const [globalResults, setGlobalResults] = useState<{ projectName: string; issues: any[] }[]>([])

    useEffect(() => {
        loadDB()
        setIsGlobal(false)
        setGlobalResults([])
    }, [currentProject])

    const loadDB = async () => {
        try {
            const data = await window.api.issuesGetDB(currentProject.name)
            if (data) setDb(data)
        } catch (e) {
            console.error(e)
        }
    }

    const handleSync = async () => {
        setLoading(true)
        try {
            const updated = await window.api.issuesSync(currentProject.name, db.jql || undefined)
            setDb(updated)
        } catch (e) {
            console.error(e)
            alert('Failed to sync issues')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveConfig = async (config: any) => {
        const newDb = { ...db, ...config }
        setDb(newDb)
        await window.api.issuesSaveDB(currentProject.name, newDb)
    }

    const performGlobalSearch = async (val: string) => {
        setSearchTerm(val)
        if (isGlobal && val.length > 2) {
            const results = await window.api.issuesSearchAll(val)
            setGlobalResults(results)
        }
    }

    const filteredIssues = useMemo(() => {
        return db.issues.filter(i => {
            const matchesSearch = !searchTerm ||
                i.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.summary.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesStatus = filterStatus === 'All' || i.status === filterStatus
            const matchesPriority = filterPriority === 'All' || i.priority === filterPriority

            return matchesSearch && matchesStatus && matchesPriority
        })
    }, [db.issues, searchTerm, filterStatus, filterPriority])

    const uniqueStatuses = Array.from(new Set(db.issues.map(i => i.status)))
    const uniquePriorities = Array.from(new Set(db.issues.map(i => i.priority)))

    return (
        <div className="p-6 h-full flex flex-col">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <Typography variant="h2">Issues Monitor</Typography>
                    <Typography variant="body" className="text-gray-400 text-sm">
                        {db.issues.length} Monitored Issues • Last Sync: {db.lastSync ? new Date(db.lastSync).toLocaleString() : 'Never'}
                    </Typography>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" disabled={loading} onClick={() => setShowConfig(true)}>⚙️ Auto-Sync & Alerts</Button>
                    <Button variant="primary" isLoading={loading} onClick={handleSync}>🔄 Sync Now</Button>
                </div>
            </header>

            <div className="mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[300px]">
                    <div className="flex justify-between mb-1">
                        <Typography variant="caption" className="font-bold uppercase">Search</Typography>
                        <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer hover:text-brand-cyan transition-colors">
                            <input
                                type="checkbox"
                                checked={isGlobal}
                                onChange={e => {
                                    setIsGlobal(e.target.checked)
                                    if (!e.target.checked) setGlobalResults([])
                                    else if (searchTerm.length > 2) performGlobalSearch(searchTerm)
                                }}
                                className="w-3 h-3 rounded bg-gray-800 border-white/10"
                            />
                            Search All Projects
                        </label>
                    </div>
                    <Input
                        fullWidth
                        placeholder={isGlobal ? "Searching across all projects..." : "Filter current project issues..."}
                        value={searchTerm}
                        onChange={e => isGlobal ? performGlobalSearch(e.target.value) : setSearchTerm(e.target.value)}
                    />
                </div>

                {!isGlobal && (
                    <>
                        <div className="w-48">
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Status</Typography>
                            <Select fullWidth value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="All">All Statuses</option>
                                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>

                        <div className="w-40">
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Priority</Typography>
                            <Select fullWidth value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                <option value="All">All Priorities</option>
                                {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
                            </Select>
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isGlobal && searchTerm.length > 2 ? (
                    <div className="space-y-6">
                        {globalResults.length === 0 ? (
                            <Typography variant="body" className="text-gray-500 text-center py-20">No matches found across projects.</Typography>
                        ) : (
                            globalResults.map(res => (
                                <div key={res.projectName} className="space-y-2">
                                    <div className="flex items-center gap-2 bg-brand-deep/50 p-2 rounded border border-white/5">
                                        <Typography variant="caption" className="font-bold uppercase text-brand-cyan">Project: {res.projectName}</Typography>
                                        <div className="h-px flex-1 bg-white/5"></div>
                                        <Badge variant="neutral" label={`${res.issues.length} matches`} />
                                    </div>
                                    <Card variant="glass" className="!p-0 overflow-hidden border border-white/10">
                                        <IssueTable issues={res.issues} />
                                    </Card>
                                </div>
                            ))
                        )}
                    </div>
                ) : db.issues.length === 0 ? (
                    <Card variant="glass" className="p-12 text-center border-dashed border-2 border-white/10 flex-1 flex flex-col items-center justify-center">
                        <Typography variant="h3" className="text-gray-400 mb-2">No Issues Monitored</Typography>
                        <Typography variant="body" className="text-gray-500 max-w-md mb-4">
                            Sync with Jira to start tracking issues. The default query monitors issues created in the last 30 days.
                        </Typography>
                        <Button onClick={handleSync} variant="primary" className="mb-2">Start Syncing</Button>
                        <Button variant="ghost" onClick={() => setShowConfig(true)}>Configure Alerts</Button>
                    </Card>
                ) : (
                    <Card variant="glass" className="!p-0 overflow-hidden border border-white/10">
                        <IssueTable issues={filteredIssues} />
                    </Card>
                )}
            </div>

            {showConfig && (
                <IssuesConfigModal
                    currentConfig={db}
                    onClose={() => setShowConfig(false)}
                    onSave={handleSaveConfig}
                />
            )}
        </div>
    )
}

function IssueTable({ issues }: { issues: any[] }) {
    return (
        <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                <tr>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Key</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Summary</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Updated</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {issues.map(issue => (
                    <tr key={issue.key} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-brand-cyan whitespace-nowrap">{issue.key}</td>
                        <td className="p-4 text-white font-medium">{issue.summary}</td>
                        <td className="p-4 whitespace-nowrap">
                            <IssueStatusBadge status={issue.status} />
                        </td>
                        <td className="p-4 text-gray-400 text-sm whitespace-nowrap">{issue.priority}</td>
                        <td className="p-4 text-gray-500 text-xs font-mono whitespace-nowrap">
                            {new Date(issue.updated).toLocaleDateString()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
