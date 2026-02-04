import { SLAIssue } from '../../../../../shared/sla-types'
import { Modal, Typography, Card, Badge } from '@design-system'
import { formatDuration, parseDate } from './utils'

interface IssueDetailModalProps {
    issue: SLAIssue
    onClose: () => void
}

export function IssueDetailModal({ issue, onClose }: IssueDetailModalProps): JSX.Element {
    const isRejected = issue.status.toLowerCase() === 'rejected'

    const createdDate = parseDate(issue.created)
    const formattedCreated = createdDate ? createdDate.toLocaleDateString() : issue.created

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            maxWidth="3xl"
            title={
                <div>
                    <Typography variant="h2">{issue.key} {isRejected && <Badge variant="warning" label="REJECTED" />}</Typography>
                    <Typography variant="body" className="mt-1 text-gray-400">{issue.summary}</Typography>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Card variant="glass" className="!p-4 bg-brand-deep/50">
                        <Typography variant="caption" className="uppercase font-bold">Priority</Typography>
                        <div className="text-white font-medium mt-1">{issue.priority} ({issue.slaTier})</div>
                    </Card>
                    <Card variant="glass" className="!p-4 bg-brand-deep/50">
                        <Typography variant="caption" className="uppercase font-bold">Created</Typography>
                        <div className="text-white font-medium mt-1">{formattedCreated}</div>
                    </Card>
                </div>

                {!isRejected ? (
                    <div className="space-y-4">
                        <Typography variant="h3" className="border-b border-white/10 pb-2">SLA Performance</Typography>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Reaction */}
                            <Card variant="glass" className={`!p-4 border ${issue.reactionSLAMet ? 'bg-green-900/10 border-green-900' : 'bg-red-900/10 border-red-900'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-300">Reaction Time</span>
                                    <Badge variant={issue.reactionSLAMet ? 'success' : 'regression'} label={issue.reactionSLAMet ? 'PASSED' : 'FAILED'} />
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-2xl font-mono text-white">{formatDuration(issue.reactionTime)}</div>
                                    <div className="text-xs text-gray-500">Target: 00:15</div>
                                </div>
                            </Card>

                            {/* Resolution */}
                            <Card variant="glass" className={`!p-4 border ${issue.resolutionSLAMet ? 'bg-green-900/10 border-green-900' : 'bg-red-900/10 border-red-900'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-300">Resolution Time</span>
                                    <Badge variant={issue.resolutionSLAMet ? 'success' : 'regression'} label={issue.resolutionSLAMet ? 'PASSED' : 'FAILED'} />
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-2xl font-mono text-white">{formatDuration(issue.resolutionTime)}</div>
                                    <div className="text-xs text-gray-500">Target: {formatDuration(issue.slaTargetResolution)}</div>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                    Actual work time. Excludes {formatDuration(issue.timeInPause)} of pause.
                                </div>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-orange-900/20 border border-orange-500/50 rounded-xl text-center">
                        <h3 className="text-xl font-bold text-orange-400 mb-2">Issue Rejected</h3>
                        <p className="text-gray-300">This issue was rejected and does not count towards SLA statistics.</p>
                    </div>
                )}
            </div>
        </Modal>
    )
}
