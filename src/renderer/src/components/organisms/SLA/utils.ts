import { SLAIssue } from '../../../../../shared/sla-types'

export function formatDuration(minutes: number): string {
    if (isNaN(minutes)) return '00:00'
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function calculateCompliance(issues: SLAIssue[]): number {
    if (issues.length === 0) return 100
    const met = issues.filter(i => i.resolutionSLAMet && i.reactionSLAMet).length
    return (met / issues.length) * 100
}

export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null

    // Try Standard Date Parse first
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d

    // Try DD/MM/YYYY HH:MM or DD/MM/YYYY
    // Regex: (\d{1,2})[/-](\d{1,2})[/-](\d{4})
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (ddmmyyyy) {
        const day = parseInt(ddmmyyyy[1])
        const month = parseInt(ddmmyyyy[2]) - 1
        const year = parseInt(ddmmyyyy[3])
        return new Date(year, month, day)
    }

    return null
}
