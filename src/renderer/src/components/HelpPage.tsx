import { useState, useEffect } from 'react'
import { JiraConfig } from '../../../shared/jira-types'

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
        <div className="p-8 max-w-4xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Help & Settings</h1>
                <p className="text-brand-text-sec">Configure your Jira integration and read the user manual.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 border-b border-brand-cyan/20 pb-1">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-2 px-1 text-sm font-bold uppercase transition-colors relative ${activeTab === 'settings' ? 'text-brand-cyan text-shadow-neon' : 'text-brand-text-sec hover:text-white'}`}
                >
                    Settings
                    {activeTab === 'settings' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-cyan shadow-[0_0_8px_rgba(0,242,255,0.8)] rounded-t-full"></span>}
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`pb-2 px-1 text-sm font-bold uppercase transition-colors relative ${activeTab === 'manual' ? 'text-brand-cyan text-shadow-neon' : 'text-brand-text-sec hover:text-white'}`}
                >
                    User Manual
                    {activeTab === 'manual' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-cyan shadow-[0_0_8px_rgba(0,242,255,0.8)] rounded-t-full"></span>}
                </button>
            </div>

            {/* CONTENT: SETTINGS */}
            {activeTab === 'settings' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Jira Configuration */}
                    <section className="glass-panel rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            🔑 Jira Configuration
                        </h2>

                        {!isConfigured && (
                            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-yellow-200 text-sm flex items-start gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <p className="font-bold">Missing Configuration</p>
                                    <p>You need to configure Jira credentials to use the import feature.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 max-w-xl">
                            <div>
                                <label className="block text-xs font-bold text-brand-text-sec uppercase mb-1">Jira Host URL</label>
                                <input
                                    type="text"
                                    placeholder="https://your-domain.atlassian.net"
                                    className="w-full bg-brand-deep/50 glass-panel text-white rounded p-3 border border-white/10 focus:ring-0 focus:border-brand-cyan outline-none transition-all placeholder:text-gray-600"
                                    value={config.host}
                                    onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-text-sec uppercase mb-1">Email</label>
                                <input
                                    type="text"
                                    placeholder="email@example.com"
                                    className="w-full bg-brand-deep/50 glass-panel text-white rounded p-3 border border-white/10 focus:ring-0 focus:border-brand-cyan outline-none transition-all placeholder:text-gray-600"
                                    value={config.email}
                                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-text-sec uppercase mb-1">API Token</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-brand-deep/50 glass-panel text-white rounded p-3 border border-white/10 focus:ring-0 focus:border-brand-cyan outline-none transition-all placeholder:text-gray-600"
                                        value={config.apiToken}
                                        onChange={e => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    disabled={loading}
                                    onClick={handleSave}
                                    className="px-6 py-2 neon-button disabled:opacity-50 text-white rounded-lg font-bold transition-all"
                                >
                                    {loading ? 'Verifying...' : 'Save & Verify'}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Instructions */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            📚 How to generate a Jira API Token
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <div className="w-8 h-8 bg-brand-cyan/20 text-brand-cyan rounded-full flex items-center justify-center font-bold mb-4 border border-brand-cyan/30">1</div>
                                <h3 className="font-bold text-white mb-2">Go to Atlassian Account Settings</h3>
                                <p className="text-brand-text-sec text-sm">
                                    Log in to your Jira account and go to <a href="#" onClick={() => window.open('https://id.atlassian.com/manage-profile/security/api-tokens')} className="text-brand-cyan hover:underline">Security Settings</a>.
                                </p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <div className="w-8 h-8 bg-brand-cyan/20 text-brand-cyan rounded-full flex items-center justify-center font-bold mb-4 border border-brand-cyan/30">2</div>
                                <h3 className="font-bold text-white mb-2">Create API Token</h3>
                                <p className="text-brand-text-sec text-sm">
                                    Click <strong>Create and manage API tokens</strong>, then click <strong>Create API token</strong>. Give it a label (e.g., "Release Analyzer").
                                </p>
                            </div>

                            <div className="glass-panel p-6 rounded-xl border border-white/10">
                                <div className="w-8 h-8 bg-brand-cyan/20 text-brand-cyan rounded-full flex items-center justify-center font-bold mb-4 border border-brand-cyan/30">3</div>
                                <h3 className="font-bold text-white mb-2">Copy & Paste</h3>
                                <p className="text-brand-text-sec text-sm">
                                    Copy the generated token and paste it into the <strong>API Token</strong> field above.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* CONTENT: USER MANUAL */}
            {activeTab === 'manual' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pb-12 pr-4 custom-scrollbar">

                    <section className="glass-panel rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">1. Getting Started</h2>
                        <p className="text-brand-text-sec mb-4">Welcome to the <strong>Release Analyzer</strong>. This application helps you track software releases and analyze Service Level Agreement (SLA) compliance based on Jira data.</p>
                        <h3 className="font-bold text-brand-cyan mb-2">Launching the App</h3>
                        <p className="text-brand-text-sec text-sm">Open the application from your desktop or Applications folder. Upon launch, you will see the main dashboard where you can create or select a project.</p>
                    </section>

                    <section className="glass-panel rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">2. Managing Projects</h2>
                        <h3 className="font-bold text-brand-cyan mb-2">Creating a Project</h3>
                        <ol className="list-decimal list-inside text-brand-text-sec text-sm space-y-1 mb-4">
                            <li>Click the <strong>+ New Project</strong> button in the sidebar.</li>
                            <li>Enter a unique project name (e.g., "MyProject 2026").</li>
                            <li>Press Enter or click "Create".</li>
                        </ol>
                        <h3 className="font-bold text-brand-cyan mb-2">Importing Data</h3>
                        <p className="text-brand-text-sec text-sm mb-2">You can import data in two ways:</p>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-1">
                            <li><strong>CSV Upload</strong>: Click the "Upload" icon in the top right to import a standard release file.</li>
                            <li><strong>Jira Import</strong>: Use the "Import from Jira" button in the sidebar to fetch data directly (requires API Token).</li>
                        </ul>
                    </section>

                    <section className="glass-panel rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">3. SLA Dashboard</h2>
                        <p className="text-brand-text-sec mb-4">Access it by clicking <strong>⏱️ SLA Dashboard</strong> in the sidebar.</p>

                        <div className="bg-brand-cyan/10 p-4 rounded-lg border-l-4 border-brand-cyan mb-6">
                            <strong className="text-brand-cyan">Tip:</strong> <span className="text-brand-text-sec text-sm">The dashboard automatically filters data for the <strong>Current Month</strong> by default.</span>
                        </div>

                        <h3 className="font-bold text-brand-cyan mb-2">Tab Navigation</h3>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-1 mb-4">
                            <li><strong>📊 Overview</strong>: Visual charts and high-level statistics.</li>
                            <li><strong>📋 Issue List</strong>: A detailed table of every analyzed issue.</li>
                        </ul>

                        <h3 className="font-bold text-brand-cyan mb-2">Understanding the Charts</h3>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-1">
                            <li><strong>Compliance Overview</strong>: % of issues that met vs. missed targets.</li>
                            <li><strong>SLA by Tier</strong>: Breakdown by priority (Critical, Major, etc.).</li>
                            <li><strong>Throughput Analysis</strong>: Volume of open vs. closed issues over time.</li>
                            <li><strong>Release History</strong>: Timeline of releases.</li>
                        </ul>
                    </section>

                    <section className="glass-panel rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">4. Troubleshooting</h2>
                        <ul className="list-disc list-inside text-brand-text-sec text-sm space-y-2">
                            <li><strong>"Invalid CSV Format"</strong>: Ensure headers: <code>Issue key</code>, <code>Summary</code>, <code>Created</code>, <code>Resolved</code>, <code>Priority</code>.</li>
                            <li><strong>"No Data Shown"</strong>: Check your filters (Month/Priority).</li>
                            <li><strong>Charts look empty</strong>: Try uploading a fresh file.</li>
                        </ul>
                    </section>
                </div>
            )}
        </div>
    )
}
