import { SLAIssue } from '../../../../../shared/sla-types'
import { endOfMonth, endOfDay, endOfWeek, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, isValid } from 'date-fns'

export function formatDuration(minutes: number, includeSeconds = false): string {
    if (isNaN(minutes)) return includeSeconds ? '00:00:00' : '00:00'

    // Treat minutes as float
    const totalSeconds = Math.round(minutes * 60)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)

    const hh = h.toString().padStart(2, '0')
    const mm = m.toString().padStart(2, '0')

    if (includeSeconds) {
        const s = totalSeconds % 60
        const ss = s.toString().padStart(2, '0')
        return `${hh}:${mm}:${ss}`
    }

    return `${hh}:${mm}`
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

/**
 * Groups issues by day or month for trend analysis
 */
export function groupIssuesByPeriod(issues: any[], period: 'day' | 'month') {
    const grouped = new Map<string, { date: string, displayDate: string, total: number, missedReaction: number, missedResolution: number }>()

    issues.forEach(issue => {
        const date = parseDate(issue.created)
        if (!date) return

        let key = ''
        let displayDate = ''

        if (period === 'day') {
            key = date.toISOString().split('T')[0] // YYYY-MM-DD
            displayDate = `${date.getDate()}/${date.getMonth() + 1}`
        } else {
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}` // YYYY-MM
            displayDate = date.toLocaleString('default', { month: 'short', year: '2-digit' })
        }

        if (!grouped.has(key)) {
            grouped.set(key, { date: key, displayDate, total: 0, missedReaction: 0, missedResolution: 0 })
        }

        const entry = grouped.get(key)!
        entry.total++
        if (!issue.reactionSLAMet) entry.missedReaction++
        if (!issue.resolutionSLAMet) entry.missedResolution++
    })

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Generates throughput data (opened vs closed) for a given interval and granularity
 */
export function getThroughputData(issues: any[], granularity: 'day' | 'week' | 'month', dateRange: { start: string, end: string }) {
    if (!dateRange.start || !dateRange.end) return []

    const start = parseISO(dateRange.start)
    const end = endOfDay(parseISO(dateRange.end))

    if (!isValid(start) || !isValid(end)) return []

    // 1. Generate Intervals
    let intervals: Date[] = []
    try {
        if (granularity === 'day') intervals = eachDayOfInterval({ start, end })
        else if (granularity === 'week') intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        else intervals = eachMonthOfInterval({ start, end })
    } catch (e) {
        console.warn('Invalid interval generation', e)
        return []
    }

    // 2. Initialize Buckets
    const buckets = intervals.map(date => {
        let key = ''
        let displayDate = ''
        let periodStart = date
        let periodEnd = date

        if (granularity === 'day') {
            key = format(date, 'yyyy-MM-dd')
            displayDate = format(date, 'dd MMM')
            periodEnd = endOfDay(date)
        } else if (granularity === 'week') {
            key = format(date, 'yyyy-Iw') // ISO Week
            displayDate = `W${format(date, 'w')} ${format(date, 'MMM')}`
            periodEnd = endOfWeek(date, { weekStartsOn: 1 })
        } else {
            key = format(date, 'yyyy-MM')
            displayDate = format(date, 'MMM yyyy')
            periodEnd = endOfMonth(date)
        }

        return { key, displayDate, start: periodStart, end: periodEnd, opened: 0, closed: 0 }
    })

    // 3. Populate Buckets
    issues.forEach(issue => {
        const created = parseDate(issue.created)
        const resolved = issue.resolutionDate ? parseDate(issue.resolutionDate) : null

        // Count Opened
        if (created && isWithinInterval(created, { start, end })) {
            const bucket = buckets.find(b => isWithinInterval(created, { start: b.start, end: b.end }))
            if (bucket) bucket.opened++
        }

        // Count Closed
        if (resolved && isWithinInterval(resolved, { start, end })) {
            const bucket = buckets.find(b => isWithinInterval(resolved, { start: b.start, end: b.end }))
            if (bucket) bucket.closed++
        }
    })

    return buckets
}

/**
 * Processes issues into daily release counts
 */
export function getReleaseData(issues: any[]) {
    // 1. Filter issues with resolution date
    const released = issues.filter(issue => issue.resolutionDate)

    // 2. Group by Date (YYYY-MM-DD)
    const grouped = new Map<string, { date: string, fullDate: string, count: number, keys: string[] }>()

    released.forEach(issue => {
        const date = parseDate(issue.resolutionDate)
        if (!date) return

        const key = date.toISOString().split('T')[0]
        if (!grouped.has(key)) {
            grouped.set(key, {
                date: `${date.getDate()}/${date.getMonth() + 1}`,
                fullDate: date.toLocaleDateString(),
                count: 0,
                keys: []
            })
        }
        const entry = grouped.get(key)!
        entry.count++
        entry.keys.push(issue.key)
    })

    // 3. Sort by Date
    return Array.from(grouped.values()).sort((a, b) => {
        return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    })
}
