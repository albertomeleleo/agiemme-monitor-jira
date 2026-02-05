import { SLAIssue } from '../../../../../shared/sla-types'
import { ProjectConfig } from '../../../../../shared/project-types'
import { Card, Typography } from '@design-system'


interface SLALegendProps {
    validIssues: SLAIssue[]
    config?: ProjectConfig
}

export function SLALegend({ validIssues, config }: SLALegendProps): JSX.Element {

    const reactionGroups = config?.sla?.aggregation?.reaction || []
    const resolutionGroups = config?.sla?.aggregation?.resolution || []
    const hasAggregation = reactionGroups.length > 0 || resolutionGroups.length > 0

    const tiers = config?.tiers || ['Expedite', 'Critical', 'Major', 'Minor', 'Trivial']

    // Helper to Convert Minutes to HH:MM (Copied from ProjectSettingsModal logic or similar)
    const toHHMM = (mins: number) => {
        if (!mins && mins !== 0) return '00:00'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    const getComplianceStats = (issuesSubset: SLAIssue[]) => {
        if (issuesSubset.length === 0) return { reaction: 100, resolution: 100 }
        const reactionMet = issuesSubset.filter(i => i.reactionSLAMet).length
        const resolutionMet = issuesSubset.filter(i => i.resolutionSLAMet).length
        return {
            reaction: (reactionMet / issuesSubset.length) * 100,
            resolution: (resolutionMet / issuesSubset.length) * 100
        }
    }

    const renderCell = (value: number, target: number) => {
        const isMet = value >= target
        return (
            <span className={`font-bold ${isMet ? 'text-green-400' : 'text-red-400'}`}>
                {value.toFixed(1)}%
            </span>
        )
    }

    if (hasAggregation) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reaction Aggregations */}
                <Card variant="glass" className="!p-6 border border-white/10">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-sm uppercase">Reaction SLA Groups</Typography>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-brand-text-sec">
                            <thead className="text-brand-text-sec border-b border-white/10">
                                <tr>
                                    <th className="pb-2">Group</th>
                                    <th className="pb-2">Tiers Included</th>
                                    <th className="pb-2 text-right">Target Expec.</th>
                                    <th className="pb-2 text-right">Actual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {reactionGroups.map((g, idx) => {
                                    const groupIssues = validIssues.filter(i => g.tiers.includes(i.slaTier))
                                    const stats = getComplianceStats(groupIssues)
                                    const target = 100 - g.tolerance
                                    return (
                                        <tr key={idx}>
                                            <td className="py-2 font-bold text-white">{g.name}</td>
                                            <td className="py-2 text-gray-400 italic">{g.tiers.join(', ') || '-'}</td>
                                            <td className="py-2 text-right font-mono text-gray-300">{target}%</td>
                                            <td className="py-2 text-right font-mono">{renderCell(stats.reaction, target)}</td>
                                        </tr>
                                    )
                                })}
                                {reactionGroups.length === 0 && (
                                    <tr><td colSpan={4} className="py-2 text-center text-gray-500 italic">No reaction groups defined</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Resolution Aggregations */}
                <Card variant="glass" className="!p-6 border border-white/10">
                    <Typography variant="mono" className="text-white font-bold mb-4 text-sm uppercase">Resolution SLA Groups</Typography>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-brand-text-sec">
                            <thead className="text-brand-text-sec border-b border-white/10">
                                <tr>
                                    <th className="pb-2">Group</th>
                                    <th className="pb-2">Tiers Included</th>
                                    <th className="pb-2 text-right">Target Expec.</th>
                                    <th className="pb-2 text-right">Actual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {resolutionGroups.map((g, idx) => {
                                    const groupIssues = validIssues.filter(i => g.tiers.includes(i.slaTier))
                                    const stats = getComplianceStats(groupIssues)
                                    const target = 100 - g.tolerance
                                    return (
                                        <tr key={idx}>
                                            <td className="py-2 font-bold text-white">{g.name}</td>
                                            <td className="py-2 text-gray-400 italic">{g.tiers.join(', ') || '-'}</td>
                                            <td className="py-2 text-right font-mono text-gray-300">{target}%</td>
                                            <td className="py-2 text-right font-mono">{renderCell(stats.resolution, target)}</td>
                                        </tr>
                                    )
                                })}
                                {resolutionGroups.length === 0 && (
                                    <tr><td colSpan={4} className="py-2 text-center text-gray-500 italic">No resolution groups defined</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        )
    }

    // --- LEGACY / TIER BASED VIEW ---
    return (
        <Card variant="glass" className="!p-6 border border-white/10">
            <Typography variant="mono" className="text-white font-bold mb-4 text-sm uppercase">SLA Legend</Typography>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-brand-text-sec">
                    <thead className="text-brand-text-sec border-b border-white/10">
                        <tr>
                            <th className="pb-2">Tier</th>
                            <th className="pb-2">Priority (Config)</th>
                            <th className="pb-2 text-right">Reaction Target</th>
                            <th className="pb-2 text-right">Actual (React.)</th>
                            <th className="pb-2 text-right">Resolution Target</th>
                            <th className="pb-2 text-right">Actual (Res.)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {tiers.map(tier => {
                            // Determine Targets
                            const defaultReactionTol = 5 // 95%
                            const defaultResolutionTol = tier === 'Expedite' ? 10 : 20

                            const reactionTol = config?.sla?.tolerances?.reaction?.[tier] ?? defaultReactionTol
                            const resolutionTol = config?.sla?.tolerances?.resolution?.[tier] ?? defaultResolutionTol

                            const reactionTarget = 100 - reactionTol
                            const resolutionTarget = 100 - resolutionTol

                            // Determine Time Limits (HH:MM)
                            const reactionLimitMins = typeof config?.sla.reactionTime === 'object'
                                ? (config.sla.reactionTime[tier] || 0)
                                : (tier === 'Critical' ? Number(config?.sla.reactionTime || 15) : 15) // Fallback logic

                            const resolutionLimitMins = config?.sla.resolution[tier] || 0

                            // Find linked Jira priorities for display (Inverted mapping search)
                            const linkedPriorities = Object.entries(config?.priorities || {})
                                .filter(([_, t]) => t === tier)
                                .map(([p]) => p)
                                .join(', ')

                            // Row Color Logic
                            const tierColorClass =
                                tier === 'Expedite' ? 'text-purple-300' :
                                    tier === 'Critical' ? 'text-red-300' :
                                        tier === 'Major' ? 'text-orange-300' :
                                            tier === 'Minor' ? 'text-blue-300' :
                                                'text-gray-300'

                            const tierIssues = validIssues.filter(i => i.slaTier === tier)
                            const stats = getComplianceStats(tierIssues)

                            return (
                                <tr key={tier}>
                                    <td className={`py-2 font-bold ${tierColorClass}`}>{tier}</td>
                                    <td className="py-2 text-gray-400 italic">{linkedPriorities || '-'}</td>

                                    <td className="py-2 text-right font-mono">
                                        {toHHMM(reactionLimitMins)} <span className="text-gray-500">({reactionTarget}%)</span>
                                    </td>
                                    <td className="py-2 text-right font-mono">
                                        {renderCell(stats.reaction, reactionTarget)}
                                    </td>

                                    <td className="py-2 text-right font-mono">
                                        {toHHMM(resolutionLimitMins)} <span className="text-gray-500">({resolutionTarget}%)</span>
                                    </td>
                                    <td className="py-2 text-right font-mono">
                                        {renderCell(stats.resolution, resolutionTarget)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
