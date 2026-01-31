import { useState, useEffect } from 'react'
import { JiraImportModal } from './JiraImportModal'
import logo from '../assets/logo.png'

import { Project } from '../types'

interface SidebarProps {
    projects: Project[]
    currentProject: Project | null
    onSelectProject: (project: Project) => void
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
        <div className="w-64 glass-panel border-r border-white/5 flex flex-col h-screen p-4">
            <div className="mb-6 flex items-center justify-center p-4">
                <img src={logo} alt="GNV Logo" className="h-12 w-auto object-contain" />
            </div>

            {/* Main Navigation */}
            <div className="space-y-1 mb-6">
                <button
                    onClick={() => onSelectSection('releases')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${currentSection === 'releases'
                        ? 'bg-brand-cyan/10 text-brand-cyan border-l-2 border-brand-cyan'
                        : 'text-brand-text-sec hover:text-white hover:bg-brand-card/50'
                        }`}
                >
                    <span>📦</span> Releases
                </button>
                <button
                    onClick={() => onSelectSection('sla')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${currentSection === 'sla'
                        ? 'bg-brand-cyan/10 text-brand-cyan border-l-2 border-brand-cyan'
                        : 'text-brand-text-sec hover:text-white hover:bg-brand-card/50'
                        }`}
                >
                    <span>⏱️</span> SLA Dashboard
                </button>
                <div className="pt-2 mt-2 border-t border-gray-800">
                    <button
                        onClick={() => onSelectSection('help')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative ${currentSection === 'help'
                            ? 'bg-brand-cyan/10 text-brand-cyan border-l-2 border-brand-cyan'
                            : 'text-brand-text-sec hover:text-white hover:bg-brand-card/50'
                            }`}
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
                    <h3 className="text-xs font-semibold text-brand-text-sec uppercase tracking-wider mb-3 px-2 mt-4">Projects</h3>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {projects.map(project => (
                            <button
                                key={project.name}
                                onClick={() => onSelectProject(project)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${currentProject?.name === project.name
                                    ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30'
                                    : 'text-brand-text-sec hover:text-white hover:bg-brand-card/50'
                                    }`}
                            >
                                {project.logo ? (
                                    <img src={project.logo} alt={project.name} className="w-6 h-6 rounded object-cover bg-white" />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                                        {project.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <span className="truncate">{project.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        {isCreating ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Project Name"
                                    className="w-full glass-panel text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-brand-cyan"
                                    autoFocus
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleCreate} className="flex-1 neon-button text-xs py-1.5 rounded">Create</button>
                                    <button onClick={() => setIsCreating(false)} className="flex-1 bg-transparent border border-white/20 text-brand-text-sec text-xs py-1.5 rounded hover:bg-brand-card/50 hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-brand-text-sec border border-dashed border-white/10 rounded-lg hover:text-white hover:border-brand-cyan hover:bg-brand-cyan/5 transition-all"
                            >
                                + New Project
                            </button>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <button
                            onClick={() => setShowJiraModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-brand-blue border border-dashed border-brand-blue/30 rounded-lg hover:text-white hover:bg-brand-blue/20 transition-all"
                        >
                            📥 Import from Jira
                        </button>
                    </div>
                </>
            )}

            {showJiraModal && currentProject && (
                <JiraImportModal
                    currentProject={currentProject.name}
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
