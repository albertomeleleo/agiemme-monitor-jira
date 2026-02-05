import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, Badge, Typography, IssueStatusBadge } from '@design-system'
import { SLAIssue } from '../../../../../shared/sla-types'
import { formatDuration } from './utils'
import { formatDistanceToNow, parseISO, isPast } from 'date-fns'
import { it } from 'date-fns/locale'

function Countdown({ dateStr, isPaused }: { dateStr?: string, isPaused?: boolean }) {
    if (isPaused) return <span className="text-orange-400 font-bold text-[10px] uppercase">Paused</span>
    if (!dateStr) return <span className="text-gray-600">-</span>

    const date = parseISO(dateStr)
    if (isPast(date)) return <span className="text-red-500 font-bold text-[10px]">BREACHED</span>

    const distance = formatDistanceToNow(date, { addSuffix: true, locale: it })
    return (
        <div className="flex flex-col items-end">
            <span className="text-blue-300 font-bold text-xs">{distance}</span>
            <span className="text-[9px] text-gray-500">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    )
}

interface SLATableProps {
    issues: SLAIssue[]
    onSelectIssue: (issue: SLAIssue) => void
    onHoverIssue: (issue: SLAIssue | null, x: number, y: number) => void
}

const PAGE_SIZE = 30

export function SLATable({ issues, onSelectIssue, onHoverIssue }: SLATableProps): JSX.Element {
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const observerTarget = useRef<HTMLDivElement>(null)

    const toggleExpand = (e: React.MouseEvent, key: string) => {
        e.stopPropagation()
        const newSet = new Set(expandedIssues)
        if (newSet.has(key)) {
            newSet.delete(key)
        } else {
            newSet.add(key)
        }
        setExpandedIssues(newSet)
    }

    // Reset visibility when issues change (e.g. filtering)
    useEffect(() => {
        setVisibleCount(PAGE_SIZE)
    }, [issues])

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < issues.length) {
                    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, issues.length))
                }
            },
            { threshold: 0.1 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [visibleCount, issues.length])

    const visibleIssues = useMemo(() => issues.slice(0, visibleCount), [issues, visibleCount])

    return (
        <Card variant="glass" className="!p-0 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-brand-deep/30">
                <div className="flex items-center gap-4">
                    <Typography variant="h3" className="text-white font-bold text-lg">Analysis Details</Typography>
                    <Badge variant="neutral" label={`${issues.length} Issues`} />
                </div>
                {visibleCount < issues.length && (
                    <Typography variant="caption" className="text-gray-400">
                        Showing {visibleCount} of {issues.length}
                    </Typography>
                )}
            </div>
            <div className="overflow-x-auto  overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-brand-text-sec">
                    <caption className="sr-only">Jira issues SLA analysis details, including reaction and resolution times</caption>
                    <thead className="bg-brand-deep/80 text-white uppercase font-medium sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-4 w-10" scope="col"></th>
                            <th className="px-6 py-4" scope="col">Key</th>
                            <th className="px-6 py-4" scope="col">Priority</th>
                            <th className="px-6 py-4" scope="col">Status</th>
                            <th className="px-6 py-4 text-center border-l border-white/10" colSpan={2} scope="col">Reaction</th>
                            <th className="px-6 py-4 text-center border-l border-white/10" colSpan={4} scope="col">Resolution</th>
                        </tr>
                        <tr className="bg-brand-deep/30 text-[10px] text-gray-400 sticky top-[52px] z-10 backdrop-blur-md">
                            <th className="px-6 py-2" scope="col"></th>
                            <th className="px-6 py-2" scope="col"></th>
                            <th className="px-6 py-2" scope="col"></th>
                            <th className="px-6 py-2" scope="col"></th>

                            {/* Reaction */}
                            <th className="px-6 py-2 text-center border-l border-white/10" scope="col">Actual</th>
                            <th className="px-6 py-2 text-center" scope="col">Due</th>

                            {/* Resolution */}
                            <th className="px-6 py-2 text-right border-l border-white/10" scope="col">Target</th>
                            <th className="px-6 py-2 text-right" scope="col">Actual</th>
                            <th className="px-6 py-2 text-right" scope="col">Due</th>
                            <th className="px-6 py-2 text-right" scope="col">Paused</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {visibleIssues.map((issue) => {
                            const isRejected = issue.status.toLowerCase() === 'rejected'
                            const isExpanded = expandedIssues.has(issue.key)
                            return (
                                <>
                                    <tr key={issue.key}
                                        onClick={() => onSelectIssue(issue)}
                                        onMouseEnter={(e) => onHoverIssue(issue, e.clientX, e.clientY)}
                                        onMouseMove={(e) => onHoverIssue(issue, e.clientX, e.clientY)}
                                        onMouseLeave={() => onHoverIssue(null, 0, 0)}
                                        className={`cursor-pointer transition-colors border-b border-white/5 relative
                                    ${isRejected ? 'bg-orange-900/20 hover:bg-orange-900/30'
                                                : !issue.resolutionSLAMet || !issue.reactionSLAMet ? 'bg-red-900/10 hover:bg-red-900/20'
                                                    : 'hover:bg-brand-card/50'}`
                                        }
                                    >
                                        <td className="px-6 py-4">
                                            {issue.changelog && issue.changelog.length > 0 && (
                                                <button
                                                    onClick={(e) => toggleExpand(e, issue.key)}
                                                    aria-expanded={isExpanded}
                                                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} changelog for ${issue.key}`}
                                                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-brand-cyan transition-colors"
                                                >
                                                    <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`} aria-hidden="true">
                                                        ▶
                                                    </span>
                                                </button>
                                            )}
                                        </td>
                                        <th scope="row" className={`px-6 py-4 font-mono font-medium text-left ${isRejected ? 'text-orange-200' : 'text-white'}`}>
                                            <div className="flex items-center gap-2">
                                                {isRejected && <span className="text-orange-500">⚠</span>}
                                                <div>
                                                    <div>{issue.key}</div>
                                                    <div className="text-[10px] opacity-70">{issue.issueType}</div>
                                                </div>
                                            </div>
                                        </th>
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
                                        <td className="px-6 py-4">
                                            <IssueStatusBadge status={isRejected ? 'REJECTED' : issue.status} />
                                        </td>

                                        {/* Reaction Time */}
                                        <td className="px-6 py-4 text-center border-l border-gray-700">
                                            {isRejected ? <span className="text-gray-600">-</span> : (
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-mono ${issue.reactionSLAMet ? 'text-green-400' : 'text-red-400 font-bold'}`}>
                                                        {formatDuration(issue.reactionTime, true)}
                                                    </span>
                                                    {!issue.reactionSLAMet && !issue.projectedReactionBreach && (
                                                        // Only show FAILED if no projection (meaning it's done and failed)
                                                        <span className="text-[10px] text-red-400 bg-red-900/20 px-1 rounded mt-1 border border-red-900/50">
                                                            FAILED
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Reaction Due */}
                                        <td className="px-6 py-4 text-center">
                                            <Countdown dateStr={issue.projectedReactionBreach} isPaused={false} />
                                        </td>

                                        {/* Resolution Time */}
                                        <td className="px-6 py-4 text-right border-l border-gray-700 font-mono text-gray-500">{formatDuration(issue.slaTargetResolution)}</td>
                                        <td className="px-6 py-4 text-right font-mono">
                                            {isRejected ? <span className="text-gray-600">-</span> : (
                                                <div className="flex flex-col items-end">
                                                    <span className={issue.resolutionSLAMet ? 'text-green-400' : 'text-red-400 font-bold'}>
                                                        {formatDuration(issue.resolutionTime, true)}
                                                    </span>
                                                    {!issue.resolutionSLAMet && !issue.projectedResolutionBreach && (
                                                        <span className="text-[10px] text-red-400 bg-red-900/20 px-1 rounded mt-1 border border-red-900/50">
                                                            FAILED
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Resolution Due */}
                                        <td className="px-6 py-4 text-right">
                                            <Countdown dateStr={issue.projectedResolutionBreach} isPaused={issue.isResolutionPaused} />
                                        </td>

                                        <td className="px-6 py-4 text-right font-mono text-gray-500">
                                            {isRejected ? <span className="text-gray-600">-</span> : formatDuration(issue.timeInPause)}
                                        </td>
                                    </tr>

                                    {/* Accordion Row */}
                                    {isExpanded && (
                                        <tr className="bg-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <td colSpan={10} className="p-0 border-b border-white/10">
                                                <div className="p-4 pl-16 space-y-4 max-h-96 overflow-y-auto">
                                                    {issue.timeBreakdown && Object.keys(issue.timeBreakdown).length > 0 && (
                                                        <div className="space-y-2 pb-4 border-b border-white/5">
                                                            <Typography variant="caption" className="font-bold text-gray-400 uppercase tracking-wider block">Resolution Breakdown (Net Time)</Typography>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Object.entries(issue.timeBreakdown).map(([key, val]) => (
                                                                    <div key={key} className="bg-brand-deep/50 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] flex items-center gap-2">
                                                                        <span className="text-gray-400">{key}</span>
                                                                        <span className="text-brand-cyan font-mono font-bold">{formatDuration(val)} ({val})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Typography variant="caption" className="font-bold text-gray-400 uppercase tracking-wider mb-2 block">Changelog History</Typography>
                                                        <div className="space-y-3">
                                                            {issue.changelog?.map((entry, idx) => (
                                                                <div key={idx} className="text-xs bg-white/5 p-3 rounded border border-white/5 relative">
                                                                    <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-brand-cyan">{entry.author}</span>
                                                                            <span className="text-gray-500 text-[10px]">
                                                                                {new Date(entry.created).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1 pl-2">
                                                                        {entry.items.map((item, i) => (
                                                                            <div key={i} className="grid grid-cols-[100px_1fr] gap-2">
                                                                                <span className="text-gray-400 italic">{item.field}:</span>
                                                                                <span className="text-gray-300">
                                                                                    <span className="line-through text-red-400/70 mr-2">{item.fromString || '(empty)'}</span>
                                                                                    <span className="text-gray-500">→</span>
                                                                                    <span className="text-green-400 ml-2">{item.toString || '(empty)'}</span>
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )
                        })}
                    </tbody >
                </table>
                {visibleCount < issues.length && (
                    <div ref={observerTarget} className="p-8 flex justify-center border-t border-white/5 bg-brand-deep/20">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                            <Typography variant="caption" className="text-brand-cyan font-bold tracking-widest uppercase">
                                Loading More {issues.length - visibleCount} issues...
                            </Typography>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
