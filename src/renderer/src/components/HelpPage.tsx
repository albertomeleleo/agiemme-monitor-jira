import { useState, useEffect } from 'react'
import { JiraConfig } from '../../../shared/jira-types'
import { Typography, Button, Input, Card } from '@design-system'

export function HelpPage(): JSX.Element {
    const [config, setConfig] = useState<JiraConfig>({ host: '', email: '', apiToken: '' })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [activeTab, setActiveTab] = useState<'settings' | 'manual'>('settings')

    useEffect(() => {
        // Load initial config
        window.api.jiraGetConfig().then(cfg => {
            if (cfg) setConfig(cfg)
        })
    }, [])

    const handleSave = async () => {
        setLoading(true)
        setMessage(null)
        try {
            await window.api.jiraSaveConfig(config)
            // Verify connection
            const success = await window.api.jiraTestConnection(config)
            if (success) {
                setMessage({ type: 'success', text: 'Settings saved and connection verified! ✅' })
            } else {
                setMessage({ type: 'error', text: 'Settings saved but connection failed. ❌ Check credentials.' })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error: ${e.message}` })
        } finally {
            setLoading(false)
        }
    }

    const isConfigured = config.host && config.email && config.apiToken

    return (
        <div className="p-8 max-w-5xl mx-auto flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-8 p-6 glass-panel rounded-2xl border border-gray-200 dark:border-white/10 bg-brand-deep/30">
                <Typography variant="h1" className="text-brand-text-pri mb-2">Help & Manual</Typography>
                <Typography variant="body" className="text-brand-text-sec">Configure your Jira integration and read the user manual.</Typography>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 border-b border-brand-cyan/20 pb-1">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-2 px-1 text-sm font-bold uppercase transition-colors relative ${activeTab === 'settings' ? 'text-brand-cyan' : 'text-brand-text-sec hover:text-white'}`}
                >
                    Settings
                    {activeTab === 'settings' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-cyan rounded-t-full"></span>}
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`pb-2 px-1 text-sm font-bold uppercase transition-colors relative ${activeTab === 'manual' ? 'text-brand-cyan' : 'text-brand-text-sec hover:text-white'}`}
                >
                    User Manual
                    {activeTab === 'manual' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-cyan rounded-t-full"></span>}
                </button>
            </div>

            {/* CONTENT: SETTINGS */}
            {activeTab === 'settings' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Jira Configuration */}
                    <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                        <Typography variant="h3" className="text-brand-text-pri mb-6 flex items-center gap-2">
                            🔑 Jira Configuration
                        </Typography>

                        {/* Error/Warning */}
                        {!isConfigured && (
                            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-yellow-600 dark:text-yellow-200 text-sm flex items-start gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <p className="font-bold">Missing Configuration</p>
                                    <p>You need to configure Jira credentials to use the import feature.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 max-w-xl">
                            <div>
                                <Typography variant="caption" className="font-bold text-brand-text-sec uppercase mb-1 block">Jira Host URL</Typography>
                                <Input
                                    fullWidth
                                    placeholder="https://your-domain.atlassian.net"
                                    value={config.host}
                                    onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Typography variant="caption" className="font-bold text-brand-text-sec uppercase mb-1 block">Email</Typography>
                                <Input
                                    fullWidth
                                    placeholder="email@example.com"
                                    value={config.email}
                                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Typography variant="caption" className="font-bold text-brand-text-sec uppercase mb-1 block">API Token</Typography>
                                <Input
                                    fullWidth
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    value={config.apiToken}
                                    onChange={e => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                                />
                            </div>

                            {message && (
                                <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    disabled={loading}
                                    onClick={handleSave}
                                    variant="primary"
                                    className="px-8"
                                >
                                    {loading ? 'Verifying...' : 'Save & Verify'}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Instructions */}
                    <section className="space-y-6">
                        <Typography variant="h3" className="text-brand-text-pri flex items-center gap-2">
                            📚 How to generate a Jira API Token
                        </Typography>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                                <div className="w-8 h-8 bg-brand-cyan/20 text-brand-cyan rounded-full flex items-center justify-center font-bold mb-4 border border-brand-cyan/30">1</div>
                                <Typography variant="body" className="font-bold text-brand-text-pri mb-2">Atlassian Profile</Typography>
                                <Typography variant="caption" className="text-brand-text-sec">
                                    Log in to your account and go to <a href="#" onClick={(e) => { e.preventDefault(); window.open('https://id.atlassian.com/manage-profile/security/api-tokens') }} className="text-brand-cyan hover:underline">Security Settings</a>.
                                </Typography>
                            </Card>

                            <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                                <div className="w-8 h-8 bg-brand-cyan/20 text-brand-cyan rounded-full flex items-center justify-center font-bold mb-4 border border-brand-cyan/30">2</div>
                                <Typography variant="body" className="font-bold text-brand-text-pri mb-2">Create Token</Typography>
                                <Typography variant="caption" className="text-brand-text-sec">
                                    Click <strong>Create API token</strong>. Give it a label (e.g., "Release Analyzer").
                                </Typography>
                            </Card>

                            <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                                <div className="w-8 h-8 bg-brand-cyan/20 text-brand-cyan rounded-full flex items-center justify-center font-bold mb-4 border border-brand-cyan/30">3</div>
                                <Typography variant="body" className="font-bold text-brand-text-pri mb-2">Copy & Paste</Typography>
                                <Typography variant="caption" className="text-brand-text-sec">
                                    Copy the generated token and paste it into the <strong>API Token</strong> field above.
                                </Typography>
                            </Card>
                        </div>
                    </section>
                </div>
            )}

            {/* CONTENT: USER MANUAL */}
            {activeTab === 'manual' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-visible pb-12 pr-4">

                    <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                        <Typography variant="h3" className="text-brand-text-pri mb-4">1. Getting Started</Typography>
                        <Typography variant="body" className="text-brand-text-sec mb-4">
                            Welcome to the <strong>Release Analyzer</strong>. This application helps you track software releases and analyze Service Level Agreement (SLA) compliance based on Jira data.
                        </Typography>
                        <Typography variant="body" className="font-bold text-brand-cyan mb-2">Launching the App</Typography>
                        <Typography variant="caption" className="text-brand-text-sec">
                            Open the application from your desktop or Applications folder. Upon launch, you will see the main dashboard where you can create or select a project from the sidebar.
                        </Typography>
                    </Card>

                    <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                        <Typography variant="h3" className="text-brand-text-pri mb-4">2. Managing Projects</Typography>
                        <Typography variant="body" className="font-bold text-brand-cyan mb-2">Creating a Project</Typography>
                        <ol className="list-decimal list-inside text-brand-text-sec text-sm space-y-2 mb-6">
                            <li>Click the <strong className="text-brand-text-pri">+ New Project</strong> button in the sidebar.</li>
                            <li>Enter a unique project name (e.g., "Main Project 2026").</li>
                            <li>Press Enter or click "Create".</li>
                        </ol>
                        <Typography variant="body" className="font-bold text-brand-cyan mb-2">Importing Data</Typography>
                        <Typography variant="caption" className="text-brand-text-sec block mb-2">You can import data in two ways:</Typography>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-2">
                            <li><strong className="text-brand-text-pri">CSV Upload</strong>: Click the "Upload" card in the dashboard to import a standard release export.</li>
                            <li><strong className="text-brand-text-pri">Jira Import</strong>: Use the "Import from Jira" button to fetch live data (requires API Configuration in Settings).</li>
                        </ul>
                    </Card>

                    <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                        <Typography variant="h3" className="text-brand-text-pri mb-4">3. SLA Dashboard</Typography>
                        <Typography variant="body" className="text-brand-text-sec mb-4">
                            Access the dashboard by selecting a project and clicking <strong>⏱️ SLA Dashboard</strong> in the sidebar submenu.
                        </Typography>

                        <div className="bg-brand-cyan/10 p-4 rounded-lg border-l-4 border-brand-cyan mb-6">
                            <Typography variant="body" className="text-brand-cyan font-bold">💡 Tip</Typography>
                            <Typography variant="caption" className="text-brand-text-sec">
                                The dashboard automatically filters data for the <strong>Current Month</strong>. You can change the period using the selector in the top-left area.
                            </Typography>
                        </div>

                        <Typography variant="body" className="font-bold text-brand-cyan mb-2">Tab Navigation</Typography>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-2 mb-6">
                            <li><strong>📊 Overview</strong>: High-level visual statistics, compliance percentages, and volume charts.</li>
                            <li><strong>📋 Issue List</strong>: Detailed table showing individual SLA calculations (Reaction/Resolution).</li>
                        </ul>

                        <Typography variant="body" className="font-bold text-brand-cyan mb-2">Understanding Charts</Typography>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-2">
                            <li><strong>Compliance Overview</strong>: Pie chart of met vs. missed SLA targets.</li>
                            <li><strong>SLA by Tier</strong>: Performance breakdown per priority level.</li>
                            <li><strong>Throughput Analysis</strong>: Trend of open vs. closed issues over time.</li>
                        </ul>
                    </Card>

                    <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                        <Typography variant="h3" className="text-brand-text-pri mb-4">4. Issue Analysis</Typography>
                        <Typography variant="body" className="text-brand-text-sec mb-4">
                            Switch to the <strong>Issue List</strong> tab for granular details. Each row shows:
                        </Typography>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-2 mb-4">
                            <li><strong>Key</strong>: Clickable Jira Issue Reference.</li>
                            <li><strong>Reaction Time</strong>: Time from "Open" to "In Progress".</li>
                            <li><strong>Resolution Time</strong>: Net working time from "Open" to "Done", excluding Pause states.</li>
                        </ul>
                        <div className="bg-brand-deep/50 p-3 rounded-lg border border-gray-200 dark:border-white/10 italic text-xs text-brand-text-sec">
                            🔍 <strong>Pro Tip:</strong> Click the small arrow on any row to expand the <strong>Changelog History</strong> and see exactly when and how the issue moved.
                        </div>
                    </Card>

                    <Card variant="glass" className="border border-gray-200 dark:border-white/10">
                        <Typography variant="h3" className="text-brand-text-pri mb-4">5. Troubleshooting</Typography>
                        <div className="space-y-4">
                            <div>
                                <Typography variant="body" className="font-bold text-brand-text-pri">"Invalid CSV Format"</Typography>
                                <Typography variant="caption" className="text-brand-text-sec">
                                    Ensure headers are exactly: <code>Issue key</code>, <code>Summary</code>, <code>Created</code>, <code>Resolved</code>, <code>Priority</code>.
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="body" className="font-bold text-brand-text-pri">"No Data Shown"</Typography>
                                <Typography variant="caption" className="text-brand-text-sec">
                                    Check your filters. The default view is restricted to the current month.
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="body" className="font-bold text-brand-text-pri">"Connection Failed"</Typography>
                                <Typography variant="caption" className="text-brand-text-sec">
                                    Verify your Jira Host URL and API Token in the <strong>Settings</strong> tab.
                                </Typography>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
