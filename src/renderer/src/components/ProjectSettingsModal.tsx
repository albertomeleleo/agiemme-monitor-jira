import { useState, useEffect } from 'react'
import { Project, ProjectConfig, SLAGroup } from '../../../shared/project-types'
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

    const handleExport = async () => {
        const filename = `${project.name}-config.json`
        const content = JSON.stringify(config, null, 2)
        const success = await window.api.saveFile(project.name, filename, content)
        if (success) {
            alert(`Configuration exported to Documents/ReleaseAnalyzer/${project.name}/${filename}`)
        } else {
            alert('Failed to export configuration')
        }
    }

    const handleImport = async () => {
        const importedConfig = await window.api.importConfig(project.name)
        if (importedConfig) {
            if (confirm('This will overwrite current settings. Continue?')) {
                setConfig(importedConfig)
            }
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
                        <div className="flex justify-between items-center">
                            <Typography variant="h4" className="text-brand-cyan">SLA Targets (HH:MM)</Typography>
                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors bg-brand-deep/30 px-3 py-1.5 rounded-lg border border-white/5">
                                <input
                                    type="checkbox"
                                    checked={config.sla.excludeLunchBreak || false}
                                    onChange={(e) => {
                                        setConfig({
                                            ...config,
                                            sla: {
                                                ...config.sla,
                                                excludeLunchBreak: e.target.checked
                                            }
                                        })
                                    }}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-gray-800 accent-brand-cyan"
                                />
                                <span className="text-xs font-bold uppercase tracking-wider">Exclude Lunch Break (13-14)</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']).map(tier => (
                                <div key={tier} className="bg-brand-deep/30 p-3 rounded border border-white/5 space-y-3">
                                    <div className="font-bold text-white mb-2 pb-1 border-b border-white/5">{tier}</div>

                                    <div>
                                        <div className="font-bold text-xs text-gray-500 mb-1 uppercase tracking-wider">Reaction</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Target (HH:MM)</label>
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
                                                <label className="block text-xs text-gray-400 mb-1">Max Breach %</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    placeholder="0"
                                                    defaultValue={config.sla.tolerances?.reaction?.[tier] || 0}
                                                    onChange={e => {
                                                        const val = Number(e.target.value)
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            sla: {
                                                                ...prev.sla,
                                                                tolerances: {
                                                                    reaction: { ...(prev.sla.tolerances?.reaction || {}), [tier]: val },
                                                                    resolution: { ...(prev.sla.tolerances?.resolution || {}) }
                                                                }
                                                            }
                                                        }))
                                                    }}
                                                    className="w-full font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-bold text-xs text-gray-500 mb-1 uppercase tracking-wider">Resolution</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Target (HH:MM)</label>
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
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Max Breach %</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    placeholder="0"
                                                    defaultValue={config.sla.tolerances?.resolution?.[tier] || 0}
                                                    onChange={e => {
                                                        const val = Number(e.target.value)
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            sla: {
                                                                ...prev.sla,
                                                                tolerances: {
                                                                    reaction: { ...(prev.sla.tolerances?.reaction || {}) },
                                                                    resolution: { ...(prev.sla.tolerances?.resolution || {}), [tier]: val }
                                                                }
                                                            }
                                                        }))
                                                    }}
                                                    className="w-full font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SLA Aggregations */}
                    <div className="space-y-6 border-t border-white/10 pt-6">
                        <div>
                            <Typography variant="h4" className="text-brand-cyan mb-2">SLA Aggregations</Typography>
                            <Typography variant="body" className="text-gray-400 text-sm mb-4">Create groups to apply shared tolerances across multiple priorities (e.g., P1 + P2 &le; 5%).</Typography>

                            {/* Reaction Field */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-sm text-gray-300 uppercase tracking-wider">Reaction Time Groups</div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            const newGroup: SLAGroup = {
                                                id: crypto.randomUUID(),
                                                name: 'New Group',
                                                tiers: [],
                                                tolerance: 5
                                            }
                                            setConfig({
                                                ...config,
                                                sla: {
                                                    ...config.sla,
                                                    aggregation: {
                                                        ...config.sla.aggregation,
                                                        reaction: [...(config.sla.aggregation?.reaction || []), newGroup],
                                                        resolution: config.sla.aggregation?.resolution || []
                                                    }
                                                }
                                            })
                                        }}
                                    >
                                        + Add Reaction Group
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {(config.sla.aggregation?.reaction || []).map((group, idx) => (
                                        <div key={group.id || idx} className="bg-brand-deep/30 p-3 rounded border border-white/5">
                                            <div className="flex gap-3 mb-2">
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500">Group Name</label>
                                                    <Input
                                                        value={group.name}
                                                        onChange={(e) => {
                                                            const newGroups = [...(config.sla.aggregation?.reaction || [])]
                                                            newGroups[idx].name = e.target.value
                                                            setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, reaction: newGroups } } })
                                                        }}
                                                        fullWidth
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-xs text-gray-500">Max Breach %</label>
                                                    <Input
                                                        type="number"
                                                        value={group.tolerance}
                                                        onChange={(e) => {
                                                            const newGroups = [...(config.sla.aggregation?.reaction || [])]
                                                            newGroups[idx].tolerance = Number(e.target.value)
                                                            setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, reaction: newGroups } } })
                                                        }}
                                                        fullWidth
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newGroups = (config.sla.aggregation?.reaction || []).filter((_, i) => i !== idx)
                                                        setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, reaction: newGroups } } })
                                                    }}
                                                    className="text-red-400 hover:text-red-300 px-2 mt-4"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']).map(tier => (
                                                    <label key={tier} className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer hover:text-white">
                                                        <input
                                                            type="checkbox"
                                                            checked={group.tiers.includes(tier)}
                                                            onChange={(e) => {
                                                                const newGroups = [...(config.sla.aggregation?.reaction || [])]
                                                                if (e.target.checked) {
                                                                    newGroups[idx].tiers = [...newGroups[idx].tiers, tier]
                                                                } else {
                                                                    newGroups[idx].tiers = newGroups[idx].tiers.filter(t => t !== tier)
                                                                }
                                                                setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, reaction: newGroups } } })
                                                            }}
                                                            className="rounded border-gray-600 bg-gray-700 text-brand-cyan"
                                                        />
                                                        {tier}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(config.sla.aggregation?.reaction || []).length === 0 && (
                                        <div className="text-xs text-gray-500 italic p-2 border border-dashed border-white/10 rounded">No aggregations defined. Standard per-tier tolerances apply.</div>
                                    )}
                                </div>
                            </div>

                            {/* Resolution Field */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-sm text-gray-300 uppercase tracking-wider">Resolution Groups</div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            const newGroup: SLAGroup = {
                                                id: crypto.randomUUID(),
                                                name: 'New Group',
                                                tiers: [],
                                                tolerance: 10
                                            }
                                            setConfig({
                                                ...config,
                                                sla: {
                                                    ...config.sla,
                                                    aggregation: {
                                                        ...config.sla.aggregation, // reaction might be undefined if not init? No, check
                                                        reaction: config.sla.aggregation?.reaction || [],
                                                        resolution: [...(config.sla.aggregation?.resolution || []), newGroup]
                                                    }
                                                }
                                            })
                                        }}
                                    >
                                        + Add Resolution Group
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {(config.sla.aggregation?.resolution || []).map((group, idx) => (
                                        <div key={group.id || idx} className="bg-brand-deep/30 p-3 rounded border border-white/5">
                                            <div className="flex gap-3 mb-2">
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500">Group Name</label>
                                                    <Input
                                                        value={group.name}
                                                        onChange={(e) => {
                                                            const newGroups = [...(config.sla.aggregation?.resolution || [])]
                                                            newGroups[idx].name = e.target.value
                                                            setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, resolution: newGroups } } })
                                                        }}
                                                        fullWidth
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-xs text-gray-500">Max Breach %</label>
                                                    <Input
                                                        type="number"
                                                        value={group.tolerance}
                                                        onChange={(e) => {
                                                            const newGroups = [...(config.sla.aggregation?.resolution || [])]
                                                            newGroups[idx].tolerance = Number(e.target.value)
                                                            setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, resolution: newGroups } } })
                                                        }}
                                                        fullWidth
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newGroups = (config.sla.aggregation?.resolution || []).filter((_, i) => i !== idx)
                                                        setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, resolution: newGroups } } })
                                                    }}
                                                    className="text-red-400 hover:text-red-300 px-2 mt-4"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {(config.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']).map(tier => (
                                                    <label key={tier} className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer hover:text-white">
                                                        <input
                                                            type="checkbox"
                                                            checked={group.tiers.includes(tier)}
                                                            onChange={(e) => {
                                                                const newGroups = [...(config.sla.aggregation?.resolution || [])]
                                                                if (e.target.checked) {
                                                                    newGroups[idx].tiers = [...newGroups[idx].tiers, tier]
                                                                } else {
                                                                    newGroups[idx].tiers = newGroups[idx].tiers.filter(t => t !== tier)
                                                                }
                                                                setConfig({ ...config, sla: { ...config.sla, aggregation: { ...config.sla.aggregation!, resolution: newGroups } } })
                                                            }}
                                                            className="rounded border-gray-600 bg-gray-700 text-brand-cyan"
                                                        />
                                                        {tier}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(config.sla.aggregation?.resolution || []).length === 0 && (
                                        <div className="text-xs text-gray-500 italic p-2 border border-dashed border-white/10 rounded">No aggregations defined. Standard per-tier tolerances apply.</div>
                                    )}
                                </div>
                            </div>
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

                <div className="flex justify-between mt-8 pt-4 border-t border-white/10">
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleExport}>
                            📤 Export Config
                        </Button>
                        <Button variant="secondary" onClick={handleImport}>
                            📥 Import Config
                        </Button>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                </div>
            </Card >
        </div >
    )
}
