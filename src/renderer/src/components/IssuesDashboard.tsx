import { useState, useEffect } from 'react'
import { Card, Typography, Button, Input, Badge } from '@design-system'
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

    useEffect(() => {
        loadDB()
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
        // Merge config into DB object
        const newDb = { ...db, ...config }
        console.log('Saving config:', config)
        // Update local state
        setDb(newDb)
        // Persist
        await window.api.issuesSaveDB(currentProject.name, newDb)
    }

    const filteredIssues = db.issues.filter(i =>
        i.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.status.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-6 h-full flex flex-col">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <Typography variant="h2" neon>Issues Monitor</Typography>
                    <Typography variant="body" className="text-gray-400 text-sm">
                        {db.issues.length} Monitored Issues • Last Sync: {db.lastSync ? new Date(db.lastSync).toLocaleString() : 'Never'}
                    </Typography>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" disabled={loading} onClick={() => setShowConfig(true)}>⚙️ Auto-Sync & Alerts</Button>
                    <Button variant="primary" isLoading={loading} onClick={handleSync}>🔄 Sync Now</Button>
                </div>
            </header>

            <div className="mb-4">
                <Input
                    fullWidth
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {db.issues.length === 0 ? (
                <Card variant="glass" className="p-12 text-center border-dashed border-2 border-white/10 flex-1 flex flex-col items-center justify-center">
                    <Typography variant="h3" className="text-gray-400 mb-2">No Issues Monitored</Typography>
                    <Typography variant="body" className="text-gray-500 max-w-md mb-4">
                        Sync with Jira to start tracking issues. The default query monitors issues created in the last 30 days.
                    </Typography>
                    <Button onClick={handleSync} variant="primary" className="mb-2">Start Syncing</Button>
                    <Button variant="ghost" onClick={() => setShowConfig(true)}>Configure Alerts</Button>
                </Card>
            ) : (
                <div className="flex-1 overflow-y-auto glass-panel rounded-lg border border-white/10">
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
                            {filteredIssues.map(issue => (
                                <tr key={issue.key} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-brand-cyan">{issue.key}</td>
                                    <td className="p-4 text-white font-medium">{issue.summary}</td>
                                    <td className="p-4">
                                        <Badge variant={
                                            issue.status === 'Done' || issue.status === 'Resolved' ? 'success' :
                                                issue.status === 'In Progress' ? 'info' : 'default'
                                        }>
                                            {issue.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">{issue.priority}</td>
                                    <td className="p-4 text-gray-500 text-xs font-mono">
                                        {new Date(issue.updated).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
