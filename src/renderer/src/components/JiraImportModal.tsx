import { useState, useEffect } from 'react'
import { JiraConfig, JiraProject, JiraVersion, JiraIssue } from '../../../shared/jira-types'
import { Modal, Input, Select, Button, Typography, Card } from '@design-system'


interface JiraImportModalProps {
    currentProject: string
    onClose: () => void
    onSuccess: () => void
}

export function JiraImportModal({ currentProject, onClose, onSuccess }: JiraImportModalProps): JSX.Element {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [config, setConfig] = useState<JiraConfig>({ host: '', email: '', apiToken: '' })
    const [showToken, setShowToken] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Data Step
    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
    const [versions, setVersions] = useState<JiraVersion[]>([])
    const [selectedProjectKey, setSelectedProjectKey] = useState('')
    const [selectedVersionId, setSelectedVersionId] = useState('')

    // Preview
    const [issues, setIssues] = useState<JiraIssue[]>([])

    useEffect(() => {
        // Load initial config
        window.api.jiraGetConfig().then(cfg => {
            if (cfg && cfg.host) setConfig(cfg)
        })
    }, [])

    const handleTestConnection = async () => {
        setLoading(true)
        setError(null)
        try {
            await window.api.jiraSaveConfig(config)
            const success = await window.api.jiraTestConnection(config)
            if (success) {
                const projs = await window.api.jiraGetProjects()
                setJiraProjects(projs)
                // Try to find matching project by name (optional smart default)
                // const match = projs.find(p => p.name === currentProject)
                setStep(2)
            } else {
                setError('Connection failed. Check credentials.')
            }
        } catch (e: any) {
            setError(e.message || 'Connection failed')
        } finally {
            setLoading(false)
        }
    }

    const handleFetchVersions = async (key: string) => {
        setSelectedProjectKey(key)
        setLoading(true)
        try {
            const v = await window.api.jiraGetVersions(key)
            setVersions(v)
            setSelectedVersionId('')
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePreview = async () => {
        if (!selectedProjectKey || !selectedVersionId) return
        setLoading(true)
        try {
            const i = await window.api.jiraGetIssues(selectedProjectKey, selectedVersionId)
            setIssues(i)
            setStep(3)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleImport = async () => {
        setLoading(true)
        try {
            // Convert to Release File Format
            const version = versions.find(v => v.id === selectedVersionId)
            const versionName = version ? version.name : 'Unknown Release'

            const bugfixes = issues.filter(i => i.fields.issuetype.name === 'Bug')
            const evolutives = issues.filter(i => i.fields.issuetype.name !== 'Bug')

            // Generate "Original Text" content
            let content = `Release: ${versionName}\nDate: ${new Date().toISOString().split('T')[0]}\n\n`

            content += `[BUGFIXES]\n`
            bugfixes.forEach(i => {
                content += `- [${i.key}] ${i.fields.summary} (${i.fields.status.name})\n`
            })

            content += `\n[EVOLUTIVES]\n`
            evolutives.forEach(i => {
                content += `- [${i.key}] ${i.fields.summary} (${i.fields.status.name})\n`
            })

            // Filename
            const validFilename = versionName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt'

            const releaseData = {
                filename: validFilename,
                content: content, // Human readable backup
                date: version?.releaseDate || new Date().toISOString().split('T')[0],
                time: '12:00',
                internalTitle: versionName,
                isRegression: false, // Default
                bugfixCount: bugfixes.length,
                evolutiveCount: evolutives.length,
                items: [
                    ...bugfixes.map(i => ({ id: i.key, description: i.fields.summary, type: 'bugfix' })),
                    ...evolutives.map(i => ({ id: i.key, description: i.fields.summary, type: 'evolutive' }))
                ]
            }

            const jsonFilename = validFilename.replace('.txt', '.json')
            await window.api.saveFile(currentProject, jsonFilename, JSON.stringify(releaseData, null, 2))

            onSuccess()
            onClose()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            maxWidth="2xl"
            title={
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📥</span>
                    <Typography variant="h2">Import from Jira</Typography>
                </div>
            }
        >
            <div className="space-y-6">
                {error && (
                    <Card variant="solid" className="bg-red-900/50 border-red-500/50 !p-3">
                        <Typography variant="caption" className="text-red-200">{error}</Typography>
                    </Card>
                )}

                {step === 1 && (
                    <div className="space-y-4">
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
                            <div className="relative">
                                <Input
                                    fullWidth
                                    type={showToken ? 'text' : 'password'}
                                    placeholder="••••••••••••••••"
                                    value={config.apiToken}
                                    onChange={e => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                                    className="pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showToken ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <Typography variant="mono" className="mt-1 text-gray-500">
                                Create one at <a href="#" className="underline hover:text-brand-cyan" onClick={() => window.open('https://id.atlassian.com/manage-profile/security/api-tokens')}>Atlassian Security</a>
                            </Typography>
                        </div>
                        <Button
                            fullWidth
                            isLoading={loading}
                            onClick={handleTestConnection}
                            disabled={loading}
                        >
                            Connect & Continue
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Select Jira Project</Typography>
                            <Select
                                fullWidth
                                value={selectedProjectKey}
                                onChange={e => handleFetchVersions(e.target.value)}
                            >
                                <option value="">-- Select Project --</option>
                                {jiraProjects.map(p => (
                                    <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
                                ))}
                            </Select>
                        </div>
                        {selectedProjectKey && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <Typography variant="caption" className="block mb-1 font-bold uppercase">Select Release (Version)</Typography>
                                <Select
                                    fullWidth
                                    value={selectedVersionId}
                                    onChange={e => setSelectedVersionId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">-- Select Version --</option>
                                    {versions.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} {v.released ? '(Released)' : '(Unreleased)'} - {v.releaseDate}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        <Button
                            fullWidth
                            disabled={!selectedVersionId || loading}
                            isLoading={loading}
                            onClick={handlePreview}
                        >
                            Preview Import
                        </Button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card variant="glass" className="bg-brand-deep/50 text-center !p-4">
                                <div className="text-2xl font-bold text-red-500 ">{issues.filter(i => i.fields.issuetype.name === 'Bug').length}</div>
                                <Typography variant="caption" className="uppercase">Bugs Found</Typography>
                            </Card>
                            <Card variant="glass" className="bg-brand-deep/50 text-center !p-4">
                                <div className="text-2xl font-bold text-brand-cyan">{issues.filter(i => i.fields.issuetype.name !== 'Bug').length}</div>
                                <Typography variant="caption" className="uppercase">Stories/Tasks</Typography>
                            </Card>
                        </div>

                        <div className="max-h-48 overflow-y-auto bg-brand-deep/80 p-2 rounded border border-white/10">
                            {issues.slice(0, 10).map(i => (
                                <div key={i.key} className="truncate text-xs text-brand-text-sec font-mono mb-1">
                                    <span className="font-bold text-white">[{i.key}]</span> {i.fields.summary}
                                </div>
                            ))}
                            {issues.length > 10 && <div className="text-xs text-brand-text-sec text-center mt-2 italic">... and {issues.length - 10} more.</div>}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(2)}
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                variant="primary" // Should be green?
                                // Let's use custom class since we don't have success variant in Button yet, or use primary.
                                // Primary is cyan. Green is okay.
                                // Actually Button atom has 'variant' prop.
                                // I'll stick to primary for "Confirm".
                                isLoading={loading}
                                onClick={handleImport}
                                className="flex-[2]"
                            >
                                Confirm Import
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
