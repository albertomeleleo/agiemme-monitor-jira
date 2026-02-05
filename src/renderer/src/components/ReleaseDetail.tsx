import { useState } from 'react'
import { ReleaseData } from '../types'
import { Modal, Button, Badge, Typography, Card } from '@design-system'

interface ReleaseDetailProps {
    release: ReleaseData
    onClose: () => void
}

export function ReleaseDetail({ release, onClose }: ReleaseDetailProps): JSX.Element {
    const [activeTab, setActiveTab] = useState<'overview' | 'raw'>('overview')

    // Calculated Stats
    const total = (release.bugfixCount || 0) + (release.evolutiveCount || 0) || 1
    const bugfixPct = ((release.bugfixCount || 0) / total) * 100
    const evolutivePct = ((release.evolutiveCount || 0) / total) * 100

    const bugfixes = release.items.filter(i => i.type === 'bugfix')
    const evolutives = release.items.filter(i => i.type === 'evolutive')

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            maxWidth="5xl"
            title={
                <div>
                    <Typography variant="h2">{release.internalTitle || release.filename}</Typography>
                    <Typography variant="mono" className="mt-1 flex gap-3 text-brand-text-sec">
                        <span>📅 {release.date || 'Unknown'}</span>
                        <span>🕒 {release.time || '--:--'}</span>
                    </Typography>
                </div>
            }
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button onClick={() => alert('Export feature pending')}>Export Report</Button>
                </div>
            }
        >
            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-6 space-x-6">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'overview' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-gray-500 hover:text-brand-text-pri'}`}
                >
                    Overview & Items
                </button>
                <button
                    onClick={() => setActiveTab('raw')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'raw' ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-gray-500 hover:text-brand-text-pri'}`}
                >
                    Raw Content
                </button>
            </div>

            {activeTab === 'overview' ? (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card variant="glass" className="!p-4 bg-brand-card/30">
                            <Typography variant="caption" className="uppercase font-bold tracking-wider">Bugfixes</Typography>
                            <div className="text-3xl font-bold text-brand-text-pri mt-1">{release.bugfixCount}</div>
                            <div className="mt-2 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${bugfixPct}%` }} />
                            </div>
                        </Card>
                        <Card variant="glass" className="!p-4 bg-brand-card/30">
                            <Typography variant="caption" className="uppercase font-bold tracking-wider">Evolutives</Typography>
                            <div className="text-3xl font-bold text-brand-text-pri mt-1">{release.evolutiveCount}</div>
                            <div className="mt-2 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-cyan" style={{ width: `${evolutivePct}%` }} />
                            </div>
                        </Card>
                        <Card variant="glass" className={`!p-4 ${release.isRegression ? 'bg-red-500/10 dark:bg-red-900/20 border-red-200 dark:border-red-900/50' : 'bg-brand-card/30'}`}>
                            <Typography variant="caption" className="uppercase font-bold tracking-wider">Status</Typography>
                            <div className="text-3xl font-bold text-brand-text-pri mt-1">
                                {release.isRegression ? <span className="text-red-600 dark:text-red-400">Regression</span> : <span className="text-green-600 dark:text-green-400">Stable</span>}
                            </div>
                        </Card>
                    </div>

                    {/* Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Bugfixes */}
                        <div className="space-y-4">
                            <Typography variant="h3" className="border-b border-gray-200 dark:border-white/10 pb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" /> Bugfixes
                            </Typography>
                            {bugfixes.length > 0 ? (
                                <div className="space-y-3">
                                    {bugfixes.map((item, idx) => (
                                        <Card key={idx} variant="glass" className="!p-4 hover:bg-brand-card/40 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="bugfix" label={item.id || 'NO-ID'} />
                                            </div>
                                            <Typography variant="body" className="text-sm">{item.description}</Typography>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Typography variant="caption" className="italic">No bugfixes in this release.</Typography>
                            )}
                        </div>

                        {/* Evolutives */}
                        <div className="space-y-4">
                            <Typography variant="h3" className="border-b border-gray-200 dark:border-white/10 pb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Evolutives
                            </Typography>
                            {evolutives.length > 0 ? (
                                <div className="space-y-3">
                                    {evolutives.map((item, idx) => (
                                        <Card key={idx} variant="glass" className="!p-4 hover:bg-brand-card/40 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="evolutive" label={item.id || 'NO-ID'} />
                                            </div>
                                            <Typography variant="body" className="text-sm">{item.description}</Typography>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Typography variant="caption" className="italic">No evolutives in this release.</Typography>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-0">
                    <pre className="text-sm text-brand-text-sec font-mono whitespace-pre-wrap leading-relaxed bg-brand-deep/50 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                        {release.content}
                    </pre>
                </div>
            )}
        </Modal>
    )
}
