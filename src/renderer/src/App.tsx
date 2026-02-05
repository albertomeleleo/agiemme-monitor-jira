import { useEffect, useState, useMemo, useCallback } from 'react'
import { ReleaseData, Project } from './types'

import { JiraImportModal } from './components/JiraImportModal'
import { Sidebar } from './components/Sidebar'
import { ReleaseDetail } from './components/ReleaseDetail'
import { SLADashboard } from './components/SLADashboard'
import { ProjectSettingsModal } from './components/ProjectSettingsModal'
import { HelpPage } from './components/HelpPage'
import { OpenIssuesDashboard } from './components/OpenIssuesDashboard'
import { TaskTrackerDashboard } from './components/TaskTrackerDashboard'


import { ReleaseCard } from './components/ReleaseCard'
import { ReleaseList } from './components/ReleaseList'
import { ReleaseCadenceChart } from './components/charts/ReleaseCadenceChart'
import { IssueTypeDistributionChart } from './components/charts/IssueTypeDistributionChart'
import { ReleaseTimelineChart } from './components/charts/ReleaseTimelineChart'
import { Typography, Card, Button, Input, Select, ThemeToggle } from '@design-system'
import { ThemeProvider } from './context/ThemeContext'

type ViewMode = 'cards' | 'sla'
type SortOption = 'date' | 'bugfixes' | 'evolutives' | 'regression'
type SortDirection = 'asc' | 'desc'

function AppContent(): JSX.Element {
    const [projects, setProjects] = useState<Project[]>([])
    const [currentProject, setCurrentProject] = useState<Project | null>(null)
    const [releases, setReleases] = useState<ReleaseData[]>([])
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('cards')
    const [projectView, setProjectView] = useState<'releases' | 'sla' | 'help' | 'open-issues' | 'task-tracker'>('releases')

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRelease, setSelectedRelease] = useState<ReleaseData | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [showJiraModal, setShowJiraModal] = useState(false)

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

    const refreshProjects = async () => {
        const list = await window.api.getProjects()
        setProjects(list)
        if (currentProject) {
            const updated = list.find(p => p.name === currentProject.name)
            if (updated) setCurrentProject(updated)
        }
    }

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
        if (currentProject) {
            fetchReleases()
        } else {
            setReleases([])
        }
    }, [currentProject, fetchReleases])

    const handleCreateProject = async (name: string) => {
        const success = await window.api.createProject(name)
        if (success) {
            const list = await window.api.getProjects()
            setProjects(list)
            const newProj = list.find(p => p.name === name)
            if (newProj) {
                setCurrentProject(newProj)
                setProjectView('releases')
            }
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

    return (
        <div className="flex h-screen bg-brand-deep text-slate-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
            <nav aria-label="Main Sidebar">
                <Sidebar
                    projects={projects}
                    currentProject={currentProject}
                    currentView={projectView}
                    onSelectView={setProjectView}
                    onRefresh={() => { }}
                    onSelectProject={(p) => {
                        setCurrentProject(p)
                        if (projectView === 'help' || projectView === 'open-issues' || projectView === 'task-tracker' || p.name !== currentProject?.name) {
                            setProjectView('releases')
                        }
                    }}
                    onCreateProject={handleCreateProject}
                />
            </nav>

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 relative">

                    {projectView === 'help' ? (
                        <HelpPage />
                    ) : projectView === 'open-issues' && currentProject ? (
                        <OpenIssuesDashboard currentProject={currentProject} />
                    ) : projectView === 'task-tracker' && currentProject ? (
                        <TaskTrackerDashboard currentProject={currentProject} />
                    ) : currentProject ? (
                        <>
                            {/* HEADER */}
                            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        {currentProject.logo && (
                                            <img src={currentProject.logo} alt={currentProject.name} className="w-8 h-8 rounded object-cover bg-white" />
                                        )}
                                        <h1 className="text-2xl font-bold tracking-tight text-brand-text-pri">
                                            {currentProject.name}
                                        </h1>
                                        <div className="flex gap-1 ml-2">
                                            <Button variant="icon" onClick={() => document.getElementById('logo-upload')?.click()} title="Upload Logo" aria-label="Upload Project Logo">
                                                <span role="img" aria-hidden="true">✏️</span>
                                            </Button>

                                            {/* Hidden File Input for Logo */}
                                            <input
                                                id="logo-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    if (e.target.files?.[0]) {
                                                        const newLogo = await window.api.uploadLogo(currentProject.name)
                                                        if (newLogo) refreshProjects()
                                                    }
                                                }}
                                            />

                                            <Button variant="icon" onClick={() => setIsSettingsOpen(true)} title="Settings" aria-label="Project Settings" className="text-gray-400 hover:text-brand-cyan">
                                                <span role="img" aria-hidden="true">⚙️</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">

                                    {/* Stats & Upload (Visible only in Releases view) */}
                                    {projectView === 'releases' && (
                                        <div className="flex gap-4 items-center flex-wrap">
                                            <Button
                                                onClick={() => setShowJiraModal(true)}
                                                className="gap-2"
                                                variant="primary"
                                            >
                                                <span role="img" aria-hidden="true">📥</span> Import from Jira
                                            </Button>
                                            <Card variant="glass" className="!px-4 !py-2 border border-gray-200 dark:border-white/10">
                                                <Typography variant="caption" className="block text-brand-text-sec">Total</Typography>
                                                <Typography variant="h3" className="text-brand-text-pri">{releases.length}</Typography>
                                            </Card>
                                            <Card variant="glass" className="!px-4 !py-2 border border-gray-200 dark:border-white/10">
                                                <Typography variant="caption" className="block text-brand-text-sec">Regressions</Typography>
                                                <Typography variant="h3" className="text-red-400">{regressionCount}</Typography>
                                            </Card>
                                        </div>
                                    )}
                                    <ThemeToggle />
                                </div>
                            </header>

                            {/* MAIN CONTENT */}
                            {projectView === 'releases' ? (
                                <>
                                    {/* CHARTS */}
                                    <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                                        <div className="lg:col-span-2">
                                            <ReleaseCadenceChart releases={releases} />
                                        </div>
                                        <IssueTypeDistributionChart releases={releases} />
                                        <ReleaseTimelineChart releases={releases} />
                                    </div>


                                    {/* FILTERS & CONTROLS */}
                                    <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" role="img" aria-hidden="true">🔍</span>
                                            <Input
                                                fullWidth
                                                placeholder="Search in project..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Select
                                                value={sortOption}
                                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                            >
                                                <option value="date">Date</option>
                                                <option value="bugfixes">Bugfixes</option>
                                                <option value="evolutives">Evolutives</option>
                                                <option value="regression">Regression</option>
                                            </Select>

                                            <Button
                                                variant="secondary"
                                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                                aria-label={`Sort direction: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                                            >
                                                <span role="img" aria-hidden="true">{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>
                                            </Button>

                                            <div className="flex bg-brand-deep/50 p-1 rounded-lg border border-gray-200 dark:border-white/10 ml-2" role="group" aria-label="View Mode Toggle">
                                                <button
                                                    onClick={() => setViewMode('cards')}
                                                    className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                                                    title="Card View"
                                                    aria-label="Switch to Card View"
                                                    aria-pressed={viewMode === 'cards'}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>


                                    {/* RELEASE LIST */}
                                    {loading ? (
                                        <div className="text-center py-20">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mx-auto mb-4"></div>
                                            <Typography variant="body" className="text-gray-400">Loading releases...</Typography>
                                        </div>
                                    ) : processedReleases.length === 0 ? (
                                        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                            <Typography variant="h3" className="text-gray-500 mb-2">No Releases Found</Typography>
                                            <Typography variant="body" className="text-gray-400">Create a release folder or upload specific files.</Typography>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                                            {viewMode === 'cards' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                    {processedReleases.map((release) => (
                                                        <ReleaseCard
                                                            key={release.filename}
                                                            release={release}
                                                            onClick={() => setSelectedRelease(release)}
                                                            onDelete={handleDeleteRelease}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <ReleaseList
                                                    releases={processedReleases}
                                                    onSelect={setSelectedRelease}
                                                    onDelete={handleDeleteRelease}
                                                />
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                // SLA DASHBOARD
                                <SLADashboard currentProject={currentProject} />
                            )}
                        </>
                    ) : (
                        // NO PROJECT SELECTED
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-24 h-24 mb-6 rounded-2xl bg-brand-card/40 flex items-center justify-center border border-gray-200 dark:border-white/10 animate-float">
                                <span className="text-4xl" role="img" aria-label="Rocket">🚀</span>
                            </div>
                            <Typography variant="h2" className="text-brand-text-pri mb-2">Welcome to Release Analyzer</Typography>
                            <Typography variant="body" className="text-gray-400 max-w-md">
                                Select a project from the sidebar or click "Help & Manual" to learn more.
                            </Typography>
                        </div>
                    )}

                </div>
            </main>

            {/* MODALS */}
            {
                selectedRelease && (
                    <ReleaseDetail
                        release={selectedRelease}
                        onClose={() => setSelectedRelease(null)}
                    />
                )
            }

            {
                currentProject && (
                    <ProjectSettingsModal
                        project={currentProject}
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        onSave={refreshProjects}
                    />
                )
            }

            {showJiraModal && currentProject && (
                <JiraImportModal
                    currentProject={currentProject.name}
                    onClose={() => setShowJiraModal(false)}
                    onSuccess={() => {
                        fetchReleases()
                        refreshProjects()
                    }}
                />
            )}
        </div>
    )
}

function App(): JSX.Element {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    )
}

export default App
