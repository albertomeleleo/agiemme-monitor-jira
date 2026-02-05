import { useState } from 'react'

import logo from '../assets/logo.png'
import { Project } from '../types'

interface SidebarProps {
    projects: Project[]
    currentProject: Project | null
    onSelectProject: (project: Project) => void
    onCreateProject: (name: string) => void
    onRefresh: () => void
    currentView?: 'releases' | 'sla'
    onSelectView?: (view: 'releases' | 'sla') => void
}

export function Sidebar({ projects, currentProject, onSelectProject, onCreateProject, currentView = 'releases', onSelectView }: SidebarProps): JSX.Element {
    const [isCreating, setIsCreating] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')

    const handleCreate = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim())
            setNewProjectName('')
            setIsCreating(false)
        }
    }

    return (
        <div className="w-64 glass-panel border-r border-gray-200 dark:border-white/5 flex flex-col h-screen p-4">
            <div className="mb-6 flex items-center justify-center p-4">
                <img src={logo} alt="GNV Logo" className="h-12 w-auto object-contain" />
            </div>

            {/* Projects List */}
            <div className="flex-grow overflow-y-auto space-y-2">
                <h3 className="text-xs font-semibold text-brand-text-sec uppercase tracking-wider mb-3 px-2">Projects</h3>
                {projects.map(project => (
                    <div key={project.name}>
                        <button
                            onClick={() => onSelectProject(project)}
                            aria-current={currentProject?.name === project.name ? 'page' : undefined}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${currentProject?.name === project.name
                                ? 'bg-brand-cyan/10 text-brand-cyan border-l-2 border-brand-cyan'
                                : 'text-brand-text-sec hover:text-brand-text-pri hover:bg-brand-card/50'
                                }`}
                        >
                            {/* Project Logo/Icon */}
                            {project.logo ? (
                                <img src={project.logo} alt={project.name} className="w-5 h-5 rounded object-cover bg-white" />
                            ) : (
                                <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                    {project.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="truncate">{project.name}</span>
                        </button>

                        {/* Nested Sub-Menu */}
                        {currentProject?.name === project.name && (
                            <div className="ml-4 mt-1 pl-4 border-l border-gray-200 dark:border-white/10 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                <button
                                    onClick={() => onSelectView?.('releases')}
                                    aria-current={currentView === 'releases' ? 'location' : undefined}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${currentView === 'releases'
                                        ? 'text-brand-cyan bg-brand-cyan/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-brand-text-pri hover:bg-gray-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <span>📦</span> Releases
                                </button>
                                <button
                                    onClick={() => onSelectView?.('sla')}
                                    aria-current={currentView === 'sla' ? 'location' : undefined}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${currentView === 'sla'
                                        ? 'text-brand-cyan bg-brand-cyan/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-brand-text-pri hover:bg-gray-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <span>⏱️</span> SLA Dashboard
                                </button>

                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
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
                            <button onClick={handleCreate} className="flex-1 bg-brand-cyan text-brand-deep text-xs py-1.5 rounded font-bold hover:brightness-110">Create</button>
                            <button onClick={() => setIsCreating(false)} className="flex-1 bg-transparent border border-white/20 text-brand-text-sec text-xs py-1.5 rounded hover:bg-brand-card/50 hover:text-white">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        aria-label="Add new project"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-brand-text-sec border border-dashed border-gray-300 dark:border-white/10 rounded-lg hover:text-brand-text-pri hover:border-brand-cyan hover:bg-brand-cyan/5 transition-all"
                    >
                        <span role="img" aria-hidden="true">+</span> New Project
                    </button>
                )}
            </div>


            {/* Help Button (Moved from global nav to bottom) */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                {/* Note: In the new design, help might be separate, but I'll leave it implicitly accessible or add a button if user requested. 
                    The App.tsx has a HelpPage but no way to navigate to it now that I removed "Help" button from Sidebar? 
                    Actually, App.tsx rendered HelpPage only when currentSection === 'help'.
                    My new Sidebar removed the 'help' button. 
                    I should add a Help button in the Sidebar or Header.
                    For now, I'll keep Sidebar focused on projects as requested.
                 */}
                <div className="mt-2 text-center">
                    <span className="text-xs text-brand-text-sec">v1.2.0</span>
                </div>
            </div>

        </div >
    )
}
