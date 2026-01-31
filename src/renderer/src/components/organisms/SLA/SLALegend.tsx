import { SLAIssue } from '../../../../../shared/sla-types'
import { Card, Typography } from '@design-system'


interface SLALegendProps {
    validIssues: SLAIssue[]
}

export function SLALegend({ validIssues }: SLALegendProps): JSX.Element {

    const getComplianceStats = (tier: string) => {
        const tierIssues = validIssues.filter(i => i.slaTier === tier)
        if (tierIssues.length === 0) return { reaction: 100, resolution: 100 }

        const reactionMet = tierIssues.filter(i => i.reactionSLAMet).length
        const resolutionMet = tierIssues.filter(i => i.resolutionSLAMet).length

        return {
            reaction: (reactionMet / tierIssues.length) * 100,
            resolution: (resolutionMet / tierIssues.length) * 100
        }
    }

    const renderComplianceCell = (tier: string, type: 'reaction' | 'resolution', target: number) => {
        const stats = getComplianceStats(tier)
        const value = type === 'reaction' ? stats.reaction : stats.resolution
        const isMet = value >= target

        return (
            <span className={`font-bold ${isMet ? 'text-green-400' : 'text-red-400'}`}>
                {value.toFixed(1)}%
            </span>
        )
    }

    return (
        <Card variant="glass" className="!p-6 border border-white/10">
            <Typography variant="mono" className="text-white font-bold mb-4 text-sm uppercase">SLA Legend</Typography>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-brand-text-sec">
                    <thead className="text-brand-text-sec border-b border-white/10">
                        <tr>
                            <th className="pb-2">Tier</th>
                            <th className="pb-2">Priority (Jira)</th>
                            <th className="pb-2 text-right">Reaction (95%)</th>
                            <th className="pb-2 text-right">Actual (React.)</th>
                            <th className="pb-2 text-right">Resolution (Target %)</th>
                            <th className="pb-2 text-right">Actual (Res.)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        <tr>
                            <td className="py-2 text-purple-300 font-bold">Expedite</td>
                            <td className="py-2">Highest / Critical</td>
                            <td className="py-2 text-right font-mono">00:15</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Expedite', 'reaction', 95)}</td>
                            <td className="py-2 text-right font-mono">04:00 (90%)</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Expedite', 'resolution', 90)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 text-red-300 font-bold">Critical</td>
                            <td className="py-2">High</td>
                            <td className="py-2 text-right font-mono">00:15</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Critical', 'reaction', 95)}</td>
                            <td className="py-2 text-right font-mono">08:00 (80%)</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Critical', 'resolution', 80)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 text-orange-300 font-bold">Major</td>
                            <td className="py-2">Medium</td>
                            <td className="py-2 text-right font-mono">00:15</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Major', 'reaction', 95)}</td>
                            <td className="py-2 text-right font-mono">16:00 (80%)</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Major', 'resolution', 80)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 text-blue-300 font-bold">Minor</td>
                            <td className="py-2">Low</td>
                            <td className="py-2 text-right font-mono">00:15</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Minor', 'reaction', 95)}</td>
                            <td className="py-2 text-right font-mono">32:00 (80%)</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Minor', 'resolution', 80)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 text-gray-300 font-bold">Trivial</td>
                            <td className="py-2">Lowest</td>
                            <td className="py-2 text-right font-mono">00:15</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Trivial', 'reaction', 95)}</td>
                            <td className="py-2 text-right font-mono">40:00 (80%)</td>
                            <td className="py-2 text-right font-mono">{renderComplianceCell('Trivial', 'resolution', 80)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
