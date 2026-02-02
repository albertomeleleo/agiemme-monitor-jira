import { useState, useEffect } from 'react'
import { Project, ProjectConfig } from '../../../shared/project-types'
import { Button, Input, Card, Typography } from '@design-system'

interface ProjectSettingsModalProps {
    project: Project
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}

export function ProjectSettingsModal({ project, isOpen, onClose, onSave }: ProjectSettingsModalProps): JSX.Element | null {
    const [config, setConfig] = useState<ProjectConfig>({
        sla: { reactionTime: 15, resolution: {} },
        priorities: {},
        issueTypes: []
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && project.config) {
            setConfig(project.config)
        }
    }, [isOpen, project])

    // Helper to Convert Minutes to HH:MM
    const toHHMM = (mins: number) => {
        if (!mins && mins !== 0) return '00:00'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    // Helper to Convert HH:MM to Minutes
    const fromHHMM = (value: string): number => {
        const [h, m] = value.split(':').map(Number)
        if (isNaN(h) || isNaN(m)) return 0
        return (h * 60) + m
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            await window.api.saveProjectConfig(project.name, config)
            onSave()
            onClose()
        } catch (error) {
            console.error('Failed to save config', error)
            alert('Failed to save configuration')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card variant="glass" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <Typography variant="h3" className="text-white">Project Settings: {project.name}</Typography>
                    <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">✕</Button>
                </div>

                <div className="space-y-8">
                    {/* Tiers Management */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Typography variant="h4" className="text-brand-cyan">Priority Tiers</Typography>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    const newTier = `Tier ${config.tiers ? config.tiers.length + 1 : 1}`
                                    setConfig({
                                        ...config,
                                        tiers: [...(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']), newTier]
                                    })
                                }}
                            >
                                + Add Tier
                            </Button>
                        </div>
                        <Typography variant="body" className="text-gray-400 text-sm">Define the priority levels for this project. These will be used for SLA targets.</Typography>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']).map((tier, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-brand-deep/30 p-2 rounded border border-white/5">
                                    <Input
                                        value={tier}
                                        onChange={(e) => {
                                            const newName = e.target.value
                                            const currentTiers = [...(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial'])]

                                            // Rename keys in existing config to preserve data
                                            const oldName = currentTiers[idx]
                                            currentTiers[idx] = newName

                                            // Copy SLA values to new key
                                            const newResolution = { ...config.sla.resolution }
                                            if (newResolution[oldName] !== undefined) {
                                                newResolution[newName] = newResolution[oldName]
                                                delete newResolution[oldName]
                                            }

                                            const newReaction = typeof config.sla.reactionTime === 'object' ? { ...config.sla.reactionTime } : {}
                                            if (newReaction[oldName] !== undefined) {
                                                newReaction[newName] = newReaction[oldName]
                                                delete newReaction[oldName]
                                            }

                                            // Update mapped priorities
                                            const newPriorities = { ...config.priorities }
                                            Object.keys(newPriorities).forEach(k => {
                                                if (newPriorities[k] === oldName) newPriorities[k] = newName
                                            })

                                            setConfig({
                                                ...config,
                                                tiers: currentTiers,
                                                sla: {
                                                    ...config.sla,
                                                    resolution: newResolution,
                                                    reactionTime: typeof config.sla.reactionTime === 'object' ? newReaction : config.sla.reactionTime
                                                },
                                                priorities: newPriorities
                                            })
                                        }}
                                        className="h-8 text-sm w-full"
                                    />
                                    <button
                                        onClick={() => {
                                            const currentTiers = [...(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial'])]
                                            const tierToRemove = currentTiers[idx]
                                            const newTiers = currentTiers.filter((_, i) => i !== idx)

                                            // Cleanup config for removed tier... or leave it? Safer to leave data or clean? 
                                            // Let's implicit clean by UI hiding, explicit clean not strictly required but good.

                                            setConfig({ ...config, tiers: newTiers })
                                        }}
                                        className="text-red-400 hover:text-red-300 px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SLA Section */}
                    <div className="space-y-4">
                        <Typography variant="h4" className="text-brand-cyan">SLA Targets (HH:MM)</Typography>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']).map(tier => (
                                <div key={tier} className="bg-brand-deep/30 p-3 rounded border border-white/5 space-y-3">
                                    <div className="font-bold text-white mb-2 pb-1 border-b border-white/5">{tier}</div>

                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Reaction</label>
                                        <Input
                                            type="text"
                                            placeholder="00:00"
                                            defaultValue={
                                                typeof config.sla.reactionTime === 'object'
                                                    ? toHHMM(config.sla.reactionTime[tier] || 0)
                                                    : (tier === 'Critical' ? toHHMM(config.sla.reactionTime) : '00:00')
                                            }
                                            onBlur={e => {
                                                const mins = fromHHMM(e.target.value)
                                                // Update valid state on blur to format correctly
                                                e.target.value = toHHMM(mins)

                                                const currentReactions = typeof config.sla.reactionTime === 'object' ? { ...config.sla.reactionTime } : {}
                                                setConfig(prev => ({
                                                    ...prev,
                                                    sla: {
                                                        ...prev.sla,
                                                        reactionTime: { ...currentReactions, [tier]: mins }
                                                    }
                                                }))
                                            }}
                                            className="w-full font-mono text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Resolution</label>
                                        <Input
                                            type="text"
                                            placeholder="00:00"
                                            defaultValue={toHHMM(config.sla.resolution[tier] || 0)}
                                            onBlur={e => {
                                                const mins = fromHHMM(e.target.value)
                                                e.target.value = toHHMM(mins)
                                                setConfig(prev => ({
                                                    ...prev,
                                                    sla: {
                                                        ...prev.sla,
                                                        resolution: { ...prev.sla.resolution, [tier]: mins }
                                                    }
                                                }))
                                            }}
                                            className="w-full font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Priorities Mapping */}
                    <div className="space-y-4">
                        <Typography variant="h4" className="text-brand-cyan">Priority Mapping</Typography>
                        <Typography variant="body" className="text-gray-400 text-sm">Map Jira priority names (left) to Internal SLA Tiers (right)</Typography>

                        <div className="bg-brand-deep/30 p-4 rounded-lg border border-white/5 space-y-2">
                            {Object.keys(config.priorities).map((key, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <Input
                                        value={key}
                                        readOnly
                                        className="flex-1 opacity-70"
                                    />
                                    <span className="text-gray-500">→</span>
                                    <select
                                        value={config.priorities[key]}
                                        onChange={(e) => {
                                            const newPriorities = { ...config.priorities, [key]: e.target.value }
                                            setConfig({ ...config, priorities: newPriorities })
                                        }}
                                        className="bg-brand-deep border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-brand-cyan outline-none"
                                    >
                                        <option value="">Select Tier</option>
                                        {(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Issue Types */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Typography variant="h4" className="text-brand-cyan">Issue Types</Typography>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setConfig({
                                        ...config,
                                        issueTypes: [...config.issueTypes, { raw: 'New Type', label: '🏷️ Label' }]
                                    })
                                }}
                            >
                                + Add Type
                            </Button>
                        </div>
                        <Typography variant="body" className="text-gray-400 text-sm">Define which issue types to include and their display label in filters.</Typography>

                        <div className="space-y-2">
                            {config.issueTypes.map((type, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-brand-deep/30 p-2 rounded border border-white/5">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500">CSV Value (Exact)</label>
                                        <Input
                                            value={type.raw}
                                            onChange={(e) => {
                                                const newTypes = [...config.issueTypes]
                                                newTypes[idx].raw = e.target.value
                                                setConfig({ ...config, issueTypes: newTypes })
                                            }}
                                            fullWidth
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500">Display Label</label>
                                        <Input
                                            value={type.label}
                                            onChange={(e) => {
                                                const newTypes = [...config.issueTypes]
                                                newTypes[idx].label = e.target.value
                                                setConfig({ ...config, issueTypes: newTypes })
                                            }}
                                            fullWidth
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="mt-4 text-red-400 hover:text-red-300"
                                        onClick={() => {
                                            const newTypes = config.issueTypes.filter((_, i) => i !== idx)
                                            setConfig({ ...config, issueTypes: newTypes })
                                        }}
                                    >
                                        🗑️
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
