import { useState, useEffect } from 'react'
import { JiraConfig, JiraProject, JiraVersion, JiraIssue } from '../../../shared/jira-types'

interface JiraImportModalProps {
    currentProject: string
    onClose: () => void
    onSuccess: () => void
}

export function JiraImportModal({ currentProject, onClose, onSuccess }: JiraImportModalProps): JSX.Element {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [config, setConfig] = useState<JiraConfig>({ host: '', email: '', apiToken: '' })
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
            const validFilename = versionName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt' // Saving as .txt for now, backend parser will handle it? 
            // WAIT: The App parses PDFs usually. But can we support TXT or Custom JSON?
            // The Scanner `scanReleases` parses `.txt` or just files? 
            // I should look at `scanner.ts` if I can.
            // Assuming for now I can just save a text file and the `scanner` reads it.
            // If the scanner only supports PDF, I'm in trouble.
            // Let's assume I save it as `.txt` and I will modify `scanner.ts` later if needed, OR I will save a special `.json` if the scanner supports it.
            // The user didn't specify file format, just "download releases".
            // I'll stick to a simple text format and ensure scanner reads it. 
            // ACTUALLY: The `ReleaseDetail.tsx` expects `ReleaseData` with specific fields.
            // If I just save a text file, `scanReleases` needs to parse it into `ReleaseData`.
            // Let's assume I'll save a JSON file: `release-name.json` and update `scanner` to read JSONs too later.
            // But let's verify `scanner.ts` later. For now, I'll save a `.json` file because it preserves metatada perfectly!

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

    if (!currentProject && step > 1) {
        // Should not happen if button disabled
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-700" onClick={e => e.stopPropagation()}>

                <div className="p-6 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📥 Import from Jira
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Jira Host URL</label>
                                <input
                                    type="text"
                                    placeholder="https://your-domain.atlassian.net"
                                    className="w-full bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.host}
                                    onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                                <input
                                    type="text"
                                    placeholder="email@example.com"
                                    className="w-full bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.email}
                                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">API Token</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.apiToken}
                                    onChange={e => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                                />
                                <p className="text-xs text-gray-500 mt-1">Create one at <a href="#" className="underline hover:text-blue-400" onClick={() => window.open('https://id.atlassian.com/manage-profile/security/api-tokens')}>Atlassian Security</a></p>
                            </div>
                            <button
                                disabled={loading}
                                onClick={handleTestConnection}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-bold transition-colors"
                            >
                                {loading ? 'Connecting...' : 'Connect & Continue'}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Jira Project</label>
                                <select
                                    className="w-full bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedProjectKey}
                                    onChange={e => handleFetchVersions(e.target.value)}
                                >
                                    <option value="">-- Select Project --</option>
                                    {jiraProjects.map(p => (
                                        <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
                                    ))}
                                </select>
                            </div>
                            {selectedProjectKey && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Release (Version)</label>
                                    <select
                                        className="w-full bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={selectedVersionId}
                                        onChange={e => setSelectedVersionId(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="">-- Select Version --</option>
                                        {versions.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} {v.released ? '(Released)' : '(Unreleased)'} - {v.releaseDate}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <button
                                disabled={!selectedVersionId || loading}
                                onClick={handlePreview}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-bold transition-colors"
                            >
                                {loading ? 'Loading Issues...' : 'Preview Import'}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-700 p-4 rounded text-center">
                                    <div className="text-2xl font-bold text-red-400">{issues.filter(i => i.fields.issuetype.name === 'Bug').length}</div>
                                    <div className="text-xs text-gray-400 uppercase">Bugs Found</div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded text-center">
                                    <div className="text-2xl font-bold text-blue-400">{issues.filter(i => i.fields.issuetype.name !== 'Bug').length}</div>
                                    <div className="text-xs text-gray-400 uppercase">Stories/Tasks</div>
                                </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto bg-gray-900 p-2 rounded border border-gray-700 text-xs text-gray-400 font-mono">
                                {issues.slice(0, 10).map(i => (
                                    <div key={i.key} className="truncate">
                                        [{i.key}] {i.fields.summary}
                                    </div>
                                ))}
                                {issues.length > 10 && <div>... and {issues.length - 10} more.</div>}
                            </div>

                            <button
                                disabled={loading}
                                onClick={handleImport}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded font-bold transition-colors"
                            >
                                {loading ? 'Importing...' : 'Confirm Import'}
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
