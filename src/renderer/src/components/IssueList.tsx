import { useState } from 'react'
import { ReleaseData } from '../types'

interface IssueListProps {
    releases: ReleaseData[]
    onDelete: (filename: string) => void
}

export function IssueList({ releases, onDelete }: IssueListProps): JSX.Element {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const toggle = (filename: string) => {
        setExpanded(prev => ({ ...prev, [filename]: !prev[filename] }))
    }

    return (
        <div className="space-y-4">
            {releases.map(release => {
                if (release.items.length === 0) return null
                const isOpen = expanded[release.filename]

                return (
                    <div key={release.filename} className="glass-panel rounded-xl border border-white/10 overflow-hidden shadow-lg transition-all group hover:border-brand-cyan/50">
                        <div className="flex bg-brand-deep/50 border-b border-white/10">
                            <button
                                onClick={() => toggle(release.filename)}
                                className="flex-1 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left focus:outline-none hover:bg-brand-card/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`transform transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'} text-gray-500`}>▶</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-brand-cyan transition-colors">
                                            {release.internalTitle || release.filename}
                                        </h3>
                                        <p className="text-sm text-brand-text-sec font-mono mt-1">
                                            📅 {release.date || 'Unknown'} • {release.time || '--:--'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-xs items-center">
                                    <span className="bg-red-900/30 text-red-300 px-3 py-1 rounded-full border border-red-900/50 font-medium whitespace-nowrap">
                                        {release.bugfixCount} Bugfixes
                                    </span>
                                    <span className="bg-brand-cyan/20 text-brand-cyan px-3 py-1 rounded-full border border-brand-cyan/30 font-medium whitespace-nowrap shadow-[0_0_5px_rgba(0,242,255,0.2)]">
                                        {release.evolutiveCount} Evolutives
                                    </span>
                                    {release.isRegression && (
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold animate-pulse">
                                            REGRESSION
                                        </span>
                                    )}
                                </div>
                            </button>
                            <div className="flex items-center pr-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm(`Are you sure you want to delete ${release.filename}?`)) {
                                            onDelete(release.filename)
                                        }
                                    }}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Delete Release"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>


                        {isOpen && (
                            <div className="divide-y divide-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                                {release.items.map((item, idx) => (
                                    <div key={`${release.filename}-${idx}`} className="p-4 hover:bg-brand-cyan/5 transition-colors flex items-start gap-4 pl-12 bg-brand-deep/30 border-l border-white/5">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_5px_currentColor] ${item.type === 'bugfix' ? 'bg-red-500 text-red-500' : 'bg-brand-cyan text-brand-cyan'}`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {item.id ? (
                                                    <span className="font-mono text-xs font-bold text-brand-text-sec bg-brand-deep px-2 py-0.5 rounded border border-white/10">
                                                        {item.id}
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-xs font-bold text-brand-text-sec bg-brand-deep px-2 py-0.5 rounded border border-white/5 opacity-50">
                                                        NO-ID
                                                    </span>
                                                )}
                                                <span className={`text-xs uppercase font-bold ${item.type === 'bugfix' ? 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-brand-cyan drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]'}`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                            <p className="text-brand-text-sec text-sm leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            {releases.every(r => r.items.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                    No detailed issues found in the selected releases.
                </div>
            )}
        </div>
    )
}
