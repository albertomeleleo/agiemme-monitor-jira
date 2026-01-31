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
                    <div key={release.filename} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg transition-all group">
                        <div className="flex bg-gray-900/50 border-b border-gray-700/50">
                            <button
                                onClick={() => toggle(release.filename)}
                                className="flex-1 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left focus:outline-none hover:bg-gray-800/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`transform transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'} text-gray-500`}>▶</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {release.internalTitle || release.filename}
                                        </h3>
                                        <p className="text-sm text-gray-400 font-mono mt-1">
                                            📅 {release.date || 'Unknown'} • {release.time || '--:--'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-xs items-center">
                                    <span className="bg-red-900/30 text-red-300 px-3 py-1 rounded-full border border-red-900/50 font-medium whitespace-nowrap">
                                        {release.bugfixCount} Bugfixes
                                    </span>
                                    <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full border border-blue-900/50 font-medium whitespace-nowrap">
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
                            <div className="divide-y divide-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                                {release.items.map((item, idx) => (
                                    <div key={`${release.filename}-${idx}`} className="p-4 hover:bg-gray-700/30 transition-colors flex items-start gap-4 pl-12">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.type === 'bugfix' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {item.id ? (
                                                    <span className="font-mono text-xs font-bold text-gray-300 bg-gray-700 px-2 py-0.5 rounded">
                                                        {item.id}
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-xs font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                                                        NO-ID
                                                    </span>
                                                )}
                                                <span className={`text-xs uppercase font-bold ${item.type === 'bugfix' ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed">
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
