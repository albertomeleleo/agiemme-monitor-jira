import { SLAIssue } from '../../../../../shared/sla-types'
import { Card, Typography } from '@design-system'
import { calculateCompliance } from './utils'

interface SLAStatsGridProps {
    validIssues: SLAIssue[]
    rejectedIssues: SLAIssue[]
}

export function SLAStatsGrid({ validIssues, rejectedIssues }: SLAStatsGridProps): JSX.Element {
    const compliance = calculateCompliance(validIssues)
    const metSLA = validIssues.filter(i => i.resolutionSLAMet && i.reactionSLAMet).length
    const missedSLA = validIssues.filter(i => !i.resolutionSLAMet || !i.reactionSLAMet).length

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card variant="glass" className="!p-6 border border-white/10">
                <Typography variant="mono" className="text-brand-text-sec text-xs font-bold uppercase">Active Issues</Typography>
                <div className="text-4xl font-bold text-brand-text-pri mt-2">{validIssues.length}</div>
                {rejectedIssues.length > 0 && <div className="text-xs text-orange-600 dark:text-orange-400 mt-1"> +{rejectedIssues.length} Rejected</div>}
            </Card>

            <Card variant="glass" className="!p-6 border border-white/10">
                <Typography variant="mono" className="text-brand-text-sec text-xs font-bold uppercase">Compliance</Typography>
                <div className={`text-4xl font-bold mt-2 ${compliance >= 90 ? 'text-green-600 dark:text-green-400' : compliance >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {compliance.toFixed(1)}%
                </div>
            </Card>

            <Card variant="glass" className="!p-6 border border-white/10">
                <Typography variant="mono" className="text-brand-text-sec text-xs font-bold uppercase">Met SLA</Typography>
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2 transition-all">
                    {metSLA}
                </div>
            </Card>

            <Card variant="glass" className="!p-6 border border-white/10">
                <Typography variant="mono" className="text-brand-text-sec text-xs font-bold uppercase">Missed SLA</Typography>
                <div className="text-4xl font-bold text-red-600 dark:text-red-400 mt-2 transition-all">
                    {missedSLA}
                </div>
            </Card>
        </div>
    )
}
