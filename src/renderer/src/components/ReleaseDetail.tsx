import { useState } from 'react'
import { ReleaseData } from '../types'

interface ReleaseDetailProps {
    release: ReleaseData
    onClose: () => void
}

export function ReleaseDetail({ release, onClose }: ReleaseDetailProps): JSX.Element {
    const [activeTab, setActiveTab] = useState<'overview' | 'raw'>('overview')

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="glass-panel w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-brand-deep/50 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            {release.internalTitle || release.filename}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-brand-text-sec font-mono">
                            <span className="flex items-center gap-1">
                                📅 {release.date || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1">
                                🕒 {release.time || '--:--'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg text-brand-text-sec hover:text-white transition-colors"
                >
                    ✕
                </button>


                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-brand-deep/30 px-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                            ? 'border-brand-cyan text-brand-cyan text-shadow-neon'
                            : 'border-transparent text-brand-text-sec hover:text-white'
                            }`}
                    >
                        Overview & Items
                    </button>
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'raw'
                            ? 'border-brand-cyan text-brand-cyan text-shadow-neon'
                            : 'border-transparent text-brand-text-sec hover:text-white'
                            }`}
                    >
                        Raw Content
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-brand-deep/80 p-0">
                    {activeTab === 'overview' ? (
                        <div className="p-8 space-y-8">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-brand-card/30 p-4 rounded-xl border border-white/5">
                                    <span className="text-brand-text-sec text-xs font-bold uppercase tracking-wider">Bugfixes</span>
                                    <div className="text-3xl font-bold text-white mt-1">{release.bugfixCount}</div>
                                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${(release.bugfixCount / (release.bugfixCount + release.evolutiveCount || 1)) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="bg-brand-card/30 p-4 rounded-xl border border-white/5">
                                    <span className="text-brand-text-sec text-xs font-bold uppercase tracking-wider">Evolutives</span>
                                    <div className="text-3xl font-bold text-white mt-1">{release.evolutiveCount}</div>
                                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-cyan shadow-[0_0_10px_rgba(0,242,255,0.5)]" style={{ width: `${(release.evolutiveCount / (release.bugfixCount + release.evolutiveCount || 1)) * 100}%` }} />
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl border ${release.isRegression ? 'bg-red-900/20 border-red-900/50' : 'bg-brand-card/30 border-white/5'}`}>
                                    <span className="text-brand-text-sec text-xs font-bold uppercase tracking-wider">Status</span>
                                    <div className="text-3xl font-bold text-white mt-1">
                                        {release.isRegression ? <span className="text-red-400">Regression</span> : <span className="text-green-400">Stable</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Bugfixes List */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> Bugfixes
                                    </h3>
                                    {release.items.filter(i => i.type === 'bugfix').length > 0 ? (
                                        <div className="space-y-3">
                                            {release.items.filter(i => i.type === 'bugfix').map((item, idx) => (
                                                <div key={idx} className="bg-brand-card/20 p-4 rounded-lg hover:bg-brand-card/40 transition-colors border border-white/5">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-mono text-xs font-bold bg-red-900/30 text-red-300 px-2 py-0.5 rounded border border-red-900/50">
                                                            {item.id || 'NO-ID'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-brand-text-sec leading-relaxed">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">No bugfixes in this release.</p>
                                    )}
                                </div>

                                {/* Evolutives List */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,242,255,0.8)]" /> Evolutives
                                    </h3>
                                    {release.items.filter(i => i.type === 'evolutive').length > 0 ? (
                                        <div className="space-y-3">
                                            {release.items.filter(i => i.type === 'evolutive').map((item, idx) => (
                                                <div key={idx} className="bg-brand-card/20 p-4 rounded-lg hover:bg-brand-card/40 transition-colors border border-white/5">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-mono text-xs font-bold bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded border border-brand-cyan/30 shadow-[0_0_5px_rgba(0,242,255,0.1)]">
                                                            {item.id || 'NO-ID'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-brand-text-sec leading-relaxed">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">No evolutives in this release.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8">
                            <pre className="text-sm text-gray-400 font-mono whitespace-pre-wrap leading-relaxed bg-black/30 p-6 rounded-xl border border-gray-800">
                                {release.content}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-brand-deep/50 flex justify-end">
                    <button
                        className="px-6 py-2 neon-button rounded-lg font-medium transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div >
    )
}
