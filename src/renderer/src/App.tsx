import { useEffect, useState, useMemo, useCallback } from 'react'
import { ReleaseData, Project } from './types'
import { Charts } from './components/Charts'
import { Upload } from './components/Upload'
import { Sidebar } from './components/Sidebar'
import { IssueList } from './components/IssueList'
import { ReleaseDetail } from './components/ReleaseDetail'
import { SLADashboard } from './components/SLADashboard'
import { HelpPage } from './components/HelpPage'

type ViewMode = 'cards' | 'issues' | 'sla'
type SortOption = 'date' | 'bugfixes' | 'evolutives' | 'regression'
type SortDirection = 'asc' | 'desc'

function App(): JSX.Element {
    const [projects, setProjects] = useState<Project[]>([])
    const [currentProject, setCurrentProject] = useState<Project | null>(null)
    const [releases, setReleases] = useState<ReleaseData[]>([])
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('cards')

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRelease, setSelectedRelease] = useState<ReleaseData | null>(null)

    // Sorting State
    const [sortOption, setSortOption] = useState<SortOption>('date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    // Load Projects on Start
    useEffect(() => {
        const loadProjects = async () => {
            const list = await window.api.getProjects()
            setProjects(list)
            if (list.length > 0 && !currentProject) {
                setCurrentProject(list[0])
            }
        }
        loadProjects()
    }, [])

    const fetchReleases = useCallback(async () => {
        if (!currentProject) return
        setLoading(true)
        try {
            const data = await window.api.getReleases(currentProject.name)
            setReleases(data)
        } catch (error) {
            console.error('Failed to fetch releases:', error)
            setReleases([])
        } finally {
            setLoading(false)
        }
    }, [currentProject])

    useEffect(() => {
        fetchReleases()
    }, [fetchReleases])

    const handleCreateProject = async (name: string) => {
        const success = await window.api.createProject(name)
        if (success) {
            // Refresh projects list
            const list = await window.api.getProjects()
            setProjects(list)
            const newProj = list.find(p => p.name === name)
            if (newProj) setCurrentProject(newProj)
        }
    }

    const handleDeleteRelease = async (filename: string) => {
        if (!currentProject) return
        const success = await window.api.deleteFile(currentProject.name, filename)
        if (success) {
            fetchReleases()
        } else {
            alert('Failed to delete file')
        }
    }

    const processedReleases = useMemo(() => {
        // 1. Filter
        let result = releases.filter(r =>
            r.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.internalTitle && r.internalTitle.toLowerCase().includes(searchQuery.toLowerCase()))
        )

        // 2. Sort
        result.sort((a, b) => {
            let valA: any = ''
            let valB: any = ''

            switch (sortOption) {
                case 'date':
                    valA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`).getTime()
                    valB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`).getTime()
                    break
                case 'bugfixes':
                    valA = a.bugfixCount
                    valB = b.bugfixCount
                    break
                case 'evolutives':
                    valA = a.evolutiveCount
                    valB = b.evolutiveCount
                    break
                case 'regression':
                    // Regression first (true > false)
                    valA = a.isRegression ? 1 : 0
                    valB = b.isRegression ? 1 : 0
                    break
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [releases, searchQuery, sortOption, sortDirection])

    const regressionCount = releases.filter(r => r.isRegression).length

    const [currentSection, setCurrentSection] = useState<'releases' | 'sla' | 'help'>('releases')

    return (
        <div className="flex h-screen bg-brand-deep text-gray-100 font-sans overflow-hidden">
            <Sidebar
                projects={projects}
                currentProject={currentProject}
                onSelectProject={setCurrentProject}
                onCreateProject={handleCreateProject}
                currentSection={currentSection}
                onSelectSection={setCurrentSection}
                onRefresh={fetchReleases}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 relative">

                    {/* RELEASE SECTION */}
                    {currentSection === 'releases' && (
                        <>
                            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                        {currentProject ? (
                                            <>
                                                {currentProject.logo && (
                                                    <img src={currentProject.logo} alt={currentProject.name} className="w-8 h-8 rounded object-cover bg-white" />
                                                )}
                                                {currentProject.name}
                                                <button
                                                    onClick={async () => {
                                                        const newLogo = await window.api.uploadLogo(currentProject.name)
                                                        if (newLogo) {
                                                            // Refresh projects to update logo
                                                            const list = await window.api.getProjects()
                                                            setProjects(list)
                                                            // Update current project reference
                                                            const updated = list.find(p => p.name === currentProject.name)
                                                            if (updated) setCurrentProject(updated)
                                                        }
                                                    }}
                                                    className="ml-2 p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                                                    title="Upload Project Logo"
                                                >
                                                    ✏️
                                                </button>
                                            </>
                                        ) : 'Select a Project'}
                                    </h1>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {releases.length} releases found
                                    </p>
                                </div>
                                <div className="flex gap-4 items-center flex-wrap">
                                    <Upload onUploadSuccess={fetchReleases} currentProject={currentProject ? currentProject.name : ''} />

                                    <div className="glass-panel px-4 py-2 rounded-lg border border-white/10">
                                        <span className="text-sm font-medium text-brand-text-sec block">Total</span>
                                        <span className="text-2xl font-bold text-white">{releases.length}</span>
                                    </div>
                                    <div className="glass-panel px-4 py-2 rounded-lg border border-white/10">
                                        <span className="text-sm font-medium text-brand-text-sec block">Regressions</span>
                                        <span className="text-2xl font-bold text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{regressionCount}</span>
                                    </div>
                                </div>
                            </header>

                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-xl animate-pulse text-gray-500">Loading Releases...</div>
                                </div>
                            ) : (
                                <>
                                    <Charts releases={releases} />

                                    <div className="mb-6 flex flex-col md:flex-row gap-4">
                                        <input
                                            type="text"
                                            placeholder="Search in project..."
                                            className="flex-1 bg-brand-deep/50 glass-panel border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-brand-cyan transition-shadow placeholder:text-gray-600"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />

                                        <div className="flex gap-2">
                                            <select
                                                value={sortOption}
                                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                                className="glass-panel border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-cyan hover:bg-brand-card/50"
                                            >
                                                <option value="date">Date</option>
                                                <option value="bugfixes">Bugfixes</option>
                                                <option value="evolutives">Evolutives</option>
                                                <option value="regression">Regression</option>
                                            </select>

                                            <button
                                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                className="glass-panel border border-white/10 text-white rounded-lg px-3 py-2 text-sm hover:bg-brand-card/50 transition-colors"
                                                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                            >
                                                {sortDirection === 'asc' ? '⬆️' : '⬇️'}
                                            </button>

                                            <div className="flex bg-brand-deep/50 p-1 rounded-lg border border-white/10 ml-2">
                                                <button
                                                    onClick={() => setViewMode('cards')}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'cards' ? 'bg-brand-cyan text-brand-deep font-bold shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white'}`}
                                                >
                                                    Cards
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('issues')}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'issues' ? 'bg-brand-cyan text-brand-deep font-bold shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white'}`}
                                                >
                                                    Issues
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {viewMode === 'cards' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                                            {processedReleases.map((release) => (
                                                <div key={release.filename} className="glass-panel rounded-xl p-6 border border-white/10 hover:border-brand-cyan/50 transition-all shadow-lg hover:shadow-brand-cyan/10 flex flex-col group relative overflow-hidden">
                                                    {release.isRegression && (
                                                        <div className="absolute top-0 right-0 p-2 bg-red-500/20 rounded-bl-xl border-l border-b border-red-500/30">
                                                            <span className="text-red-400 text-xs font-bold uppercase drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">Regression</span>
                                                        </div>
                                                    )}

                                                    <div className="mb-4 pr-10">
                                                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-brand-cyan transition-colors" title={`${release.internalTitle || release.filename} - ${release.date || 'Unknown Date'}`}>
                                                            {release.internalTitle || release.filename} - {release.date || 'Unknown Date'}
                                                        </h3>
                                                        <p className="text-xs text-brand-text-sec mt-1 font-mono">
                                                            📅 {release.date || 'Unknown Date'}  🕒 {release.time || '--:--'}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2 mb-4 text-xs">
                                                        <div className="bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-900/50">
                                                            🐛 {release.bugfixCount} Bugfixes
                                                        </div>
                                                        <div className="bg-brand-cyan/20 text-brand-cyan px-2 py-1 rounded border border-brand-cyan/30 shadow-[0_0_5px_rgba(0,242,255,0.1)]">
                                                            ✨ {release.evolutiveCount} Evolutives
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-brand-text-sec line-clamp-4 leading-relaxed mb-4 bg-brand-deep/50 p-3 rounded flex-grow font-mono text-xs border border-white/5">
                                                        {(release.content || '').slice(0, 300)}...
                                                    </div>

                                                    <div className="mt-auto flex gap-2">
                                                        <button
                                                            className="flex-1 py-2 neon-button text-white rounded-lg text-sm font-medium transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                                                            onClick={() => setSelectedRelease(release)}
                                                        >
                                                            View Details
                                                        </button>
                                                        <button
                                                            className="px-3 py-2 bg-brand-deep/50 hover:bg-red-900/50 text-brand-text-sec hover:text-red-400 rounded-lg text-sm font-medium transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 border border-white/10 hover:border-red-900"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (confirm(`Delete ${release.filename}?`)) {
                                                                    handleDeleteRelease(release.filename)
                                                                }
                                                            }}
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="pb-12">
                                            <IssueList releases={processedReleases} onDelete={handleDeleteRelease} />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* SLA SECTION */}
                    {currentSection === 'sla' && (
                        <div className="h-full">
                            <header className="mb-6">
                                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    ⏱️ SLA Dashboard
                                </h1>
                                <p className="text-gray-400 text-sm mt-1">
                                    Analyze Jira CSV data for SLA compliance.
                                </p>
                            </header>
                            <SLADashboard currentProject={currentProject ? currentProject.name : ''} />
                        </div>
                    )}

                    {/* HELP SECTION */}
                    {currentSection === 'help' && (
                        <HelpPage />
                    )}

                    {selectedRelease && (
                        <ReleaseDetail
                            release={selectedRelease}
                            onClose={() => setSelectedRelease(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default App
