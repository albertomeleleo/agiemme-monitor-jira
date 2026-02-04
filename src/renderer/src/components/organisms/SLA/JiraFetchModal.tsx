import { useState, useEffect } from 'react'
import { Modal, Input, Select, Button, Typography, Card } from '@design-system' // Assuming these exist from context
import { JiraConfig, JiraProject } from '../../../../../shared/jira-types'

interface JiraFetchModalProps {
    onClose: () => void
    onFetch: (jql: string, maxResults: number) => Promise<void>
}

export function JiraFetchModal({ onClose, onFetch }: JiraFetchModalProps): JSX.Element {
    const [config, setConfig] = useState<JiraConfig>({ host: '', email: '', apiToken: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [jql, setJql] = useState('created >= -30d ORDER BY created DESC')
    const [maxResults, setMaxResults] = useState(1000)
    const [connected, setConnected] = useState(false)

    // Project Selection
    const [projects, setProjects] = useState<JiraProject[]>([])
    const [selectedProject, setSelectedProject] = useState('')

    useEffect(() => {
        // Load initial config
        window.api.jiraGetConfig().then(cfg => {
            if (cfg && cfg.host) {
                setConfig(cfg)
                // Auto-test connection if config exists? Maybe too aggressive.
                // Let's just assume if host exists we can try or ask user to confirm.
                // For better UX, let's verify.
                setLoading(true)
                window.api.jiraTestConnection(cfg).then(ok => {
                    setConnected(ok)
                    setLoading(false)
                    if (ok) {
                        fetchProjects()
                    }
                })
            }
        })
    }, [])

    const fetchProjects = async () => {
        try {
            const pros = await window.api.jiraGetProjects()
            setProjects(pros)

            // Restore last selected project
            const savedProject = localStorage.getItem('sla_last_project')
            if (savedProject && pros.some(p => p.key === savedProject)) {
                setSelectedProject(savedProject)
                setJql(`project = "${savedProject}" AND created >= -30d ORDER BY created DESC`)
            }
        } catch (e) {
            console.error('Failed to fetch projects', e)
        }
    }

    const handleConnect = async () => {
        setLoading(true)
        setError(null)
        try {
            await window.api.jiraSaveConfig(config)
            const success = await window.api.jiraTestConnection(config)
            if (success) {
                setConnected(true)
                // fetchProjects() will be called here, which now handles restoration
                fetchProjects()
            } else {
                setError('Connection failed. Check credentials.')
            }
        } catch (e: any) {
            setError(e.message || 'Connection failed')
        } finally {
            setLoading(false)
        }
    }

    const handleProjectChange = (key: string) => {
        setSelectedProject(key)
        if (key) {
            localStorage.setItem('sla_last_project', key)
            setJql(`project = "${key}" AND created >= -30d ORDER BY created DESC`)
        } else {
            localStorage.removeItem('sla_last_project')
            setJql('created >= -30d ORDER BY created DESC') // Reset to default if no project selected
        }
    }

    const handleRunFetch = async () => {
        setLoading(true)
        setError(null)
        try {
            await onFetch(jql, maxResults)
            onClose()
        } catch (e: any) {
            setError(e.message || 'Fetch failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            maxWidth="xl"
            title={
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <Typography variant="h2">Analyze from Jira</Typography>
                </div>
            }
        >
            <div className="space-y-6">
                {error && (
                    <Card variant="solid" className="bg-red-900/50 border-red-500/50 !p-3">
                        <Typography variant="caption" className="text-red-200">{error}</Typography>
                    </Card>
                )}

                {!connected ? (
                    <div className="space-y-4">
                        <Typography variant="body" className="text-gray-400">Configure your Jira connection to fetch issues.</Typography>
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Jira Host URL</Typography>
                            <Input
                                fullWidth
                                type="text"
                                placeholder="https://your-domain.atlassian.net"
                                value={config.host}
                                onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Email</Typography>
                            <Input
                                fullWidth
                                type="text"
                                placeholder="email@example.com"
                                value={config.email}
                                onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">API Token</Typography>
                            <Input
                                fullWidth
                                type="password"
                                placeholder="••••••••••••••••"
                                value={config.apiToken}
                                onChange={e => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                            />
                        </div>
                        <Button
                            fullWidth
                            isLoading={loading}
                            onClick={handleConnect}
                            disabled={loading}
                        >
                            Connect
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Typography variant="body" className="text-green-400">✓ Connected to {config.host}</Typography>
                            <Button variant="ghost" onClick={() => setConnected(false)} size="sm">Edit Config</Button>
                        </div>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Select Project (Optional)</Typography>
                            <Select
                                fullWidth
                                value={selectedProject}
                                onChange={e => handleProjectChange(e.target.value)}
                            >
                                <option value="">-- Manual JQL --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">JQL Query</Typography>
                            <div className="relative">
                                <Input
                                    fullWidth
                                    type="text"
                                    value={jql}
                                    onChange={e => setJql(e.target.value)}
                                    className="font-mono text-sm"
                                />
                                <div className="absolute right-2 top-2 text-xs text-gray-500 pointer-events-none">JQL</div>
                            </div>
                            <Typography variant="caption" className="text-gray-500 mt-1">
                                Default: <code>created {'>'}= -30d</code>. Selecting a project overrides this.
                            </Typography>
                        </div>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Max Results</Typography>
                            <Input
                                fullWidth
                                type="number"
                                value={maxResults}
                                onChange={e => setMaxResults(Number(e.target.value))}
                                min={1}
                                max={5000}
                            />
                        </div>

                        <Button
                            fullWidth
                            variant="primary"
                            isLoading={loading}
                            onClick={handleRunFetch}
                            disabled={loading}
                        >
                            Analyze Issues
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    )
}
