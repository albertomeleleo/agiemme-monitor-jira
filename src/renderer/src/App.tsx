import { useEffect, useState, useMemo, useCallback } from 'react'
import { ReleaseData } from './types'
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
    const [projects, setProjects] = useState<string[]>([])
    const [currentProject, setCurrentProject] = useState<string>('')
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
            const data = await window.api.getReleases(currentProject)
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
            setProjects(prev => [...prev, name])
            setCurrentProject(name)
        }
    }

    const handleDeleteRelease = async (filename: string) => {
        if (!currentProject) return
        const success = await window.api.deleteFile(currentProject, filename)
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
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
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
                                        {currentProject ? currentProject : 'Select a Project'}
                                    </h1>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {releases.length} releases found
                                    </p>
                                </div>
                                <div className="flex gap-4 items-center flex-wrap">
                                    <Upload onUploadSuccess={fetchReleases} currentProject={currentProject} />

                                    <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                                        <span className="text-sm font-medium text-gray-400 block">Total</span>
                                        <span className="text-2xl font-bold text-white">{releases.length}</span>
                                    </div>
                                    <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                                        <span className="text-sm font-medium text-gray-400 block">Regressions</span>
                                        <span className="text-2xl font-bold text-red-400">{regressionCount}</span>
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
                                            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />

                                        <div className="flex gap-2">
                                            <select
                                                value={sortOption}
                                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="date">Date</option>
                                                <option value="bugfixes">Bugfixes</option>
                                                <option value="evolutives">Evolutives</option>
                                                <option value="regression">Regression</option>
                                            </select>

                                            <button
                                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm hover:bg-gray-700"
                                                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                            >
                                                {sortDirection === 'asc' ? '⬆️' : '⬇️'}
                                            </button>

                                            <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 ml-2">
                                                <button
                                                    onClick={() => setViewMode('cards')}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                                >
                                                    Cards
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('issues')}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'issues' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                                >
                                                    Issues
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {viewMode === 'cards' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                                            {processedReleases.map((release) => (
                                                <div key={release.filename} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all shadow-lg hover:shadow-blue-500/10 flex flex-col group relative overflow-hidden">
                                                    {release.isRegression && (
                                                        <div className="absolute top-0 right-0 p-2 bg-red-500/20 rounded-bl-xl border-l border-b border-red-500/30">
                                                            <span className="text-red-400 text-xs font-bold uppercase">Regression</span>
                                                        </div>
                                                    )}

                                                    <div className="mb-4 pr-10">
                                                        <h3 className="text-lg font-semibold text-white truncate" title={`${release.internalTitle || release.filename} - ${release.date || 'Unknown Date'}`}>
                                                            {release.internalTitle || release.filename} - {release.date || 'Unknown Date'}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mt-1 font-mono">
                                                            📅 {release.date || 'Unknown Date'}  🕒 {release.time || '--:--'}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2 mb-4 text-xs">
                                                        <div className="bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-900/50">
                                                            🐛 {release.bugfixCount} Bugfixes
                                                        </div>
                                                        <div className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-900/50">
                                                            ✨ {release.evolutiveCount} Evolutives
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-gray-400 line-clamp-4 leading-relaxed mb-4 bg-gray-900/50 p-3 rounded flex-grow font-mono text-xs">
                                                        {release.content.slice(0, 300)}...
                                                    </div>

                                                    <div className="mt-auto flex gap-2">
                                                        <button
                                                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                                                            onClick={() => setSelectedRelease(release)}
                                                        >
                                                            View Details
                                                        </button>
                                                        <button
                                                            className="px-3 py-2 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-lg text-sm font-medium transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-900"
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
                            <SLADashboard currentProject={currentProject} />
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
