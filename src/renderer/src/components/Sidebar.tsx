import { useState, useEffect } from 'react'
import { JiraImportModal } from './JiraImportModal'
import logo from '../assets/logo.png'

interface SidebarProps {
    projects: string[]
    currentProject: string
    onSelectProject: (name: string) => void
    onCreateProject: (name: string) => void
    currentSection: 'releases' | 'sla' | 'help'
    onSelectSection: (section: 'releases' | 'sla' | 'help') => void
    onRefresh: () => void
}

export function Sidebar({ projects, currentProject, onSelectProject, onCreateProject, currentSection, onSelectSection, onRefresh }: SidebarProps): JSX.Element {
    const [isCreating, setIsCreating] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
    const [showJiraModal, setShowJiraModal] = useState(false)
    const [tokenMissing, setTokenMissing] = useState(false)

    useEffect(() => {
        window.api.jiraGetConfig().then(cfg => {
            if (!cfg || !cfg.apiToken) {
                setTokenMissing(true)
            } else {
                setTokenMissing(false)
            }
        })
    }, [])

    const handleCreate = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim())
            setNewProjectName('')
            setIsCreating(false)
        }
    }

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen p-4">
            <div className="mb-6 flex items-center justify-center p-4">
                <img src={logo} alt="GNV Logo" className="h-12 w-auto object-contain" />
            </div>

            {/* Main Navigation */}
            <div className="space-y-1 mb-6">
                <button
                    onClick={() => onSelectSection('releases')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentSection === 'releases' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                    <span>📦</span> Releases
                </button>
                <button
                    onClick={() => onSelectSection('sla')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentSection === 'sla' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                    <span>⏱️</span> SLA Dashboard
                </button>
                <div className="pt-2 mt-2 border-t border-gray-800">
                    <button
                        onClick={() => onSelectSection('help')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 relative ${currentSection === 'help' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                        <span>❓</span> Help & Settings
                        {tokenMissing && (
                            <span className="absolute right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                    </button>
                </div>
            </div>

            {currentSection === 'releases' && (
                <>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Projects</h3>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {projects.map(project => (
                            <button
                                key={project}
                                onClick={() => onSelectProject(project)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentProject === project
                                    ? 'bg-gray-800 text-white border border-gray-700'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {project}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        {isCreating ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Project Name"
                                    className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-500">Create</button>
                                    <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-800 text-gray-400 text-xs py-1.5 rounded hover:bg-gray-700">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 border border-dashed border-gray-700 rounded-lg hover:text-white hover:border-gray-500 transition-colors"
                            >
                                + New Project
                            </button>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <button
                            onClick={() => setShowJiraModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-400 border border-dashed border-blue-900/50 rounded-lg hover:text-white hover:bg-blue-900/20 transition-colors"
                        >
                            📥 Import from Jira
                        </button>
                    </div>
                </>
            )}

            {showJiraModal && (
                <JiraImportModal
                    currentProject={currentProject}
                    onClose={() => setShowJiraModal(false)}
                    onSuccess={() => {
                        onRefresh()
                    }}
                />
            )}

            {currentSection === 'sla' && (
                <div className="mt-auto p-4 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                    <p className="mb-2 font-bold text-gray-300">SLA Info</p>
                    <p>Upload a specific CSV to analyze service levels.</p>
                </div>
            )}
        </div>
    )
}
