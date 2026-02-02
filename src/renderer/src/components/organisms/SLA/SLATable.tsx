
import { Card, Badge, Typography } from '@design-system'
import { SLAIssue } from '../../../../../shared/sla-types'
import { formatDuration } from './utils'

interface SLATableProps {
    issues: SLAIssue[]
    onSelectIssue: (issue: SLAIssue) => void
    onHoverIssue: (issue: SLAIssue | null, x: number, y: number) => void
}

export function SLATable({ issues, onSelectIssue, onHoverIssue }: SLATableProps): JSX.Element {
    return (
        <Card variant="glass" className="!p-0 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-brand-deep/30">
                <Typography variant="h3" className="text-white font-bold text-lg">Analysis Details</Typography>

            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-brand-text-sec">
                    <thead className="bg-brand-deep/80 text-white uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Key</th>
                            <th className="px-6 py-4">Priority</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center border-l border-white/10">Reaction (Target: 00:15)</th>
                            <th className="px-6 py-4 text-center border-l border-white/10" colSpan={3}>Resolution (hh:mm)</th>
                        </tr>
                        <tr className="bg-brand-deep/30 text-xs">
                            <th className="px-6 py-2"></th>
                            <th className="px-6 py-2"></th>
                            <th className="px-6 py-2"></th>
                            <th className="px-6 py-2 text-center border-l border-white/10">Actual</th>
                            <th className="px-6 py-2 text-right border-l border-white/10">Target</th>
                            <th className="px-6 py-2 text-right">Actual (Net)</th>
                            <th className="px-6 py-2 text-right">Paused</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {issues.map((issue) => {
                            const isRejected = issue.status.toLowerCase() === 'rejected'
                            return (
                                <tr key={issue.key}
                                    onClick={() => onSelectIssue(issue)}
                                    onMouseEnter={(e) => onHoverIssue(issue, e.clientX, e.clientY)}
                                    onMouseMove={(e) => onHoverIssue(issue, e.clientX, e.clientY)}
                                    onMouseLeave={() => onHoverIssue(null, 0, 0)}
                                    className={`cursor-pointer transition-colors
                                ${isRejected ? 'bg-orange-900/20 hover:bg-orange-900/30'
                                            : !issue.resolutionSLAMet || !issue.reactionSLAMet ? 'bg-red-900/10 hover:bg-red-900/20'
                                                : 'hover:bg-brand-card/50'}`
                                    }
                                >
                                    <td className={`px-6 py-4 font-mono font-medium ${isRejected ? 'text-orange-200' : 'text-white'}`}>
                                        <div className="flex items-center gap-2">
                                            {isRejected && <span className="text-orange-500">⚠</span>}
                                            <div>
                                                <div>{issue.key}</div>
                                                <div className="text-[10px] opacity-70">{issue.issueType}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <Badge variant={
                                                issue.slaTier === 'Expedite' ? 'regression' : // reuse regression style for critical
                                                    issue.slaTier === 'Critical' ? 'regression' :
                                                        issue.slaTier === 'Major' ? 'warning' :
                                                            issue.slaTier === 'Minor' ? 'evolutive' :
                                                                'neutral'
                                            } label={issue.slaTier} />
                                            <span className="text-[10px] text-gray-500">Jira: {issue.priority}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium">
                                        {isRejected ? <span className="text-orange-400">REJECTED</span> : issue.status}
                                    </td>

                                    {/* Reaction Time */}
                                    <td className="px-6 py-4 text-center border-l border-gray-700">
                                        {isRejected ? <span className="text-gray-600">-</span> : (
                                            <div className="flex flex-col items-center">
                                                <span className={`font-mono ${issue.reactionSLAMet ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                                                    {formatDuration(issue.reactionTime)}
                                                </span>
                                                {!issue.reactionSLAMet && (
                                                    <span className="text-[10px] text-red-400 bg-red-900/20 px-1 rounded mt-1 border border-red-900/50">
                                                        FAILED (+{formatDuration(issue.reactionTime - 15)})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Resolution Time */}
                                    <td className="px-6 py-4 text-right border-l border-gray-700 font-mono text-gray-500">{formatDuration(issue.slaTargetResolution)}</td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        {isRejected ? <span className="text-gray-600">-</span> : (
                                            <div className="flex flex-col items-end">
                                                <span className={issue.resolutionSLAMet ? 'text-green-400' : 'text-red-400 font-bold'}>
                                                    {formatDuration(issue.resolutionTime)}
                                                </span>
                                                {!issue.resolutionSLAMet && (
                                                    <span className="text-[10px] text-red-400 bg-red-900/20 px-1 rounded mt-1 border border-red-900/50">
                                                        FAILED
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-500">
                                        {isRejected ? <span className="text-gray-600">-</span> : formatDuration(issue.timeInPause)}
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
