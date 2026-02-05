import { SLAIssue, SLAReport } from '../shared/sla-types'
import { ProjectConfig } from '../shared/project-types'

// Default Config (Fallback)
const DEFAULT_SLA_CONFIG = {
    REACTION: 15, // 15 mins
    RESOLUTION: {
        'Expedite': 240,  // 4h
        'Critical': 480,  // 8h
        'Major': 960,     // 16h
        'Minor': 1920,    // 32h
        'Trivial': 2400   // 40h
    }
}

const DEFAULT_PRIORITY_MAP: Record<string, string> = {
    'highest': 'Expedite',
    'critical': 'Expedite',
    'high': 'Critical',
    'medium': 'Major',
    'low': 'Minor',
    'lowest': 'Trivial'
}

const DEFAULT_ISSUE_TYPES = [
    { raw: 'Bug', label: '🐞 Bugs' },
    { raw: '[System] Service request', label: '🤖 System' }
]

function determineSLATier(priority: string, priorityMap: Record<string, string> = DEFAULT_PRIORITY_MAP): string {
    const p = priority.toLowerCase()
    // Check config map first (case insensitive keys if possible, but for now strict)
    // We try to match lowercase keys
    for (const [key, tier] of Object.entries(priorityMap)) {
        if (key.toLowerCase() === p) return tier
    }
    return DEFAULT_PRIORITY_MAP[p] || 'Major'
}

export function parseSLA(csvContent: string, config?: ProjectConfig): SLAReport {
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())

    // Map header name to index
    const colMap = new Map<string, number>()
    headers.forEach((h, i) => colMap.set(h, i))

    const issues: SLAIssue[] = []

    // Stats
    const byPriority: Record<string, { total: number, met: number, missed: number }> = {}

    // Config Resolution
    const slaConfig = config?.sla || DEFAULT_SLA_CONFIG
    const priorityMap = config?.priorities || DEFAULT_PRIORITY_MAP
    const allowedIssueTypes = config?.issueTypes || DEFAULT_ISSUE_TYPES

    const allowedRawTypes = new Set(allowedIssueTypes.map(it => it.raw.toLowerCase()))

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue

        // Simple CSV split
        const cleanCols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (cleanCols.length < headers.length) continue;

        const key = cleanCols[colMap.get('Key')!]
        const priority = cleanCols[colMap.get('Priority')!] || 'Medium'
        const status = cleanCols[colMap.get('Status')!]
        const created = cleanCols[colMap.get('Created')!]
        const summary = cleanCols[colMap.get('Summary')!]
        const issueType = cleanCols[colMap.get('Issue Type')!] || 'Task'

        // Filter: Check if issueType is in allowed list
        if (!allowedRawTypes.has(issueType.toLowerCase())) continue

        // Determine SLA Tier
        const slaTier = determineSLATier(priority, priorityMap)

        // --- Calculate Times ---

        const issueBreakdown: Record<string, number> = {}

        // 1. REACTION TIME (Include in breakdown)
        const openTime = parseNumber(cleanCols[colMap.get('Open')!])
        const backlogTime = parseNumber(cleanCols[colMap.get('Backlog')!])
        const reactionMinutes = backlogTime + openTime

        if (openTime > 0.01) issueBreakdown['Open'] = parseFloat(openTime.toFixed(2))
        if (backlogTime > 0.01) issueBreakdown['Backlog'] = parseFloat(backlogTime.toFixed(2))

        // 2. PAUSE TIME
        let waitingTime = 0
        const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']
        pauseStatuses.forEach(s => {
            if (colMap.has(s)) {
                const val = parseNumber(cleanCols[colMap.get(s)!])
                if (val > 0.01) {
                    waitingTime += val
                    issueBreakdown[s] = parseFloat(val.toFixed(2))
                }
            }
        })

        // 3. RESOLUTION TIME
        let workingTime = 0
        const workStatuses = ['In Progress', 'Presa in carico', 'Developer Testing', 'READY IN HOTFIX']
        workStatuses.forEach(s => {
            if (colMap.has(s)) {
                const val = parseNumber(cleanCols[colMap.get(s)!])
                if (val > 0.01) {
                    workingTime += val
                    issueBreakdown[s] = parseFloat(val.toFixed(2))
                }
            }
        })

        const netResolutionMinutes = workingTime

        // Targets (Minutes)
        const slaConfigAny = slaConfig as any
        const targetRes = (slaConfigAny.resolution ? slaConfigAny.resolution[slaTier] : (slaConfigAny.RESOLUTION ? slaConfigAny.RESOLUTION[slaTier] : 40 * 60))

        // Determine Reaction Target
        let targetReact = 15 // Default
        if (slaConfigAny.reactionTime !== undefined) {
            targetReact = typeof slaConfigAny.reactionTime === 'object' ? slaConfigAny.reactionTime[slaTier] ?? 15 : slaConfigAny.reactionTime
        } else if (slaConfigAny.REACTION !== undefined) {
            targetReact = slaConfigAny.REACTION
        }

        // Check Compliance
        const resolutionMet = netResolutionMinutes <= (targetRes + 0.001)
        const reactionMet = reactionMinutes <= (targetReact + 0.001)

        // Determine Resolution Date
        let resolutionDate: string | undefined = undefined
        if (colMap.has("'->Released")) {
            const val = cleanCols[colMap.get("'->Released")!]
            if (val && val !== '-') resolutionDate = val
        }
        if (!resolutionDate && colMap.has("'->Done")) {
            const val = cleanCols[colMap.get("'->Done")!]
            if (val && val !== '-') resolutionDate = val
        }

        const issue: SLAIssue = {
            key,
            summary,
            status,
            priority,
            issueType,
            slaTier,
            created,
            resolutionDate,
            reactionTime: parseFloat(reactionMinutes.toFixed(2)),
            resolutionTime: parseFloat(netResolutionMinutes.toFixed(2)),
            timeInPause: parseFloat(waitingTime.toFixed(2)),
            timeInWork: parseFloat(netResolutionMinutes.toFixed(2)),
            reactionSLAMet: reactionMet,
            resolutionSLAMet: resolutionMet,
            slaTargetResolution: targetRes,
            slaTargetReaction: targetReact,
            timeBreakdown: issueBreakdown
        }

        issues.push(issue)

        // Aggregation
        if (!byPriority[priority]) byPriority[priority] = { total: 0, met: 0, missed: 0 }
        byPriority[priority].total++
        if (resolutionMet) byPriority[priority].met++
        else byPriority[priority].missed++
    }

    const totalIssues = issues.length
    const metResolutionSLA = issues.filter(i => i.resolutionSLAMet).length

    return {
        totalIssues,
        metResolutionSLA,
        missedResolutionSLA: totalIssues - metResolutionSLA,
        compliancePercent: totalIssues > 0 ? (metResolutionSLA / totalIssues) * 100 : 100,
        byPriority,
        issues
    }
}

function parseNumber(val: string | undefined): number {
    if (!val || val === '-') return 0
    // Handle comma as decimal separator (common in European CSVs)
    const normalized = val.replace(/"/g, '').trim().replace(/,/g, '.')
    return parseFloat(normalized) || 0
}

export function parseJiraApiIssues(issuesData: any[], config?: ProjectConfig): SLAReport {
    // Similar to parseSLA but works on API objects
    const slaConfig = config?.sla || DEFAULT_SLA_CONFIG
    const priorityMap = config?.priorities || DEFAULT_PRIORITY_MAP
    const allowedIssueTypes = config?.issueTypes || DEFAULT_ISSUE_TYPES
    const allowedRawTypes = new Set(allowedIssueTypes.map(it => it.raw.toLowerCase()))

    const parsedIssues: SLAIssue[] = []
    const byPriority: Record<string, { total: number, met: number, missed: number }> = {}

    for (const issue of issuesData) {
        const fields = issue.fields
        if (!fields) continue

        // Check Type
        const issueType = fields.issuetype?.name || 'Task'
        // Always allow 'Task' or types in the allowed list
        if (issueType.toLowerCase() !== 'task' && !allowedRawTypes.has(issueType.toLowerCase())) continue

        const key = issue.key
        const priority = fields.priority?.name || 'Medium'
        const status = fields.status?.name || 'Unknown'
        const created = fields.created
        const summary = fields.summary

        const slaTier = determineSLATier(priority, priorityMap)

        // Calculate Times from Changelog
        let reactionMinutes = 0
        let waitingTime = 0
        let workingTime = 0

        // Parse Changelog
        const history = issue.changelog?.histories || []
        // Sort history by created asc
        history.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())

        // 1. Build Unified Timeline of State Changes
        const stateTimeline: { time: number, status: string, dipendenza: string }[] = []
        let currentStatus = 'Open'
        let currentDipendenza = ''

        // Initial state
        stateTimeline.push({ time: new Date(created).getTime(), status: currentStatus, dipendenza: currentDipendenza })

        // Initialize Anchors
        let tBacklog: number | null = (status === 'Backlog') ? new Date(created).getTime() : null
        let tPresaInCarico: number | null = null
        let tDone: number | null = null
        let tLinkCause: number | null = null

        const workStatuses = ['In Progress', 'Presa in carico', 'Developer Testing', 'READY IN HOTFIX']

        // 1. First pass to find tBacklog more precisely if created in Backlog
        const firstStatusChange = history.find((h: any) => h.items.some((i: any) => i.field === 'status'))
        if (firstStatusChange) {
            const item = firstStatusChange.items.find((i: any) => i.field === 'status')
            if (item && item.fromString === 'Backlog' && !tBacklog) {
                tBacklog = new Date(created).getTime()
            }
        }

        for (const h of history) {
            const ts = new Date(h.created).getTime()
            let changed = false

            for (const item of h.items) {
                if (item.field === 'status') {
                    currentStatus = item.toString || ''
                    changed = true

                    // Detect Anchors
                    if (!tBacklog && currentStatus === 'Backlog') tBacklog = ts

                    // Priority 1: Exact transition from Backlog to Presa in carico
                    if (item.fromString === 'Backlog' && currentStatus === 'Presa in carico') {
                        tPresaInCarico = ts
                    }
                    // Priority 2: Any transition TO a work status if tPresaInCarico is not set
                    else if (!tPresaInCarico && workStatuses.includes(currentStatus)) {
                        tPresaInCarico = ts
                    }

                    if (currentStatus === 'Done') tDone = ts
                }

                // Dependency Logic: Capture any field that takes "Dipendenza..." values
                if (item.toString === 'Dipendenza Adesso.it' || item.toString === 'Dipendenza GNV' ||
                    item.fromString === 'Dipendenza Adesso.it' || item.fromString === 'Dipendenza GNV') {
                    currentDipendenza = item.toString || ''
                    changed = true
                }

                // Fallback for Backlog anchor
                if (!tLinkCause && item.toString && item.toString.startsWith('This work item causes ')) {
                    tLinkCause = ts
                }
            }

            if (changed) {
                stateTimeline.push({ time: ts, status: currentStatus, dipendenza: currentDipendenza })
            }
        }

        if (!tBacklog && tLinkCause) tBacklog = tLinkCause

        // Apply Logic if Anchors exist
        let calculatedReaction = 0
        let calculatedResolution = 0
        let calculatedPause = 0
        let issueBreakdown: Record<string, number> = {}

        const effectiveCreated = tBacklog ? new Date(tBacklog) : new Date(created)
        const isExpedite = slaTier === 'Expedite' || priority.toLowerCase() === 'highest' || priority.toLowerCase() === 'critical'
        const isPostFeb2026 = effectiveCreated.getTime() >= new Date(2026, 1, 1).getTime()
        const is24x7 = isExpedite && isPostFeb2026

        const calcDuration = (start: number, end: number): number => {
            const excludeLunch = (slaConfig as any).excludeLunchBreak || false

            if (is24x7) {
                let duration = Math.max(0, (end - start) / (1000 * 60))
                if (excludeLunch) {
                    // Subtract lunch for each day in range
                    let cur = new Date(start)
                    while (cur.getTime() < end) {
                        const lunchStart = new Date(cur)
                        lunchStart.setHours(13, 0, 0, 0)
                        const lunchEnd = new Date(cur)
                        lunchEnd.setHours(14, 0, 0, 0)

                        const overlapStart = Math.max(start, lunchStart.getTime())
                        const overlapEnd = Math.min(end, lunchEnd.getTime())

                        if (overlapEnd > overlapStart) {
                            duration -= (overlapEnd - overlapStart) / (1000 * 60)
                        }

                        // Move to next day
                        cur.setDate(cur.getDate() + 1)
                        cur.setHours(0, 0, 0, 0)
                    }
                }
                return duration
            }

            return calculateBusinessMinutes(new Date(start), new Date(end), excludeLunch)
        }

        // --- UNIVERSAL BREAKDOWN & CALCULATION ---
        const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']
        const pauseDependencies = ['Dipendenza Adesso.it', 'Dipendenza GNV']

        const breakdown: Record<string, number> = {}
        const endTimeline = (tDone || Date.now())

        for (let i = 0; i < stateTimeline.length; i++) {
            const state = stateTimeline[i]
            const nextTime = (i < stateTimeline.length - 1) ? stateTimeline[i + 1].time : Date.now()

            // Calculate duration for this segment in the timeline
            const segmentStart = state.time
            const segmentEnd = Math.min(nextTime, endTimeline)

            if (segmentEnd > segmentStart) {
                const duration = calcDuration(segmentStart, segmentEnd)
                const isDipendenzaPaused = pauseDependencies.some(pd => pd === state.dipendenza)

                // Track everything in breakdown
                const label = isDipendenzaPaused ? state.dipendenza : state.status
                breakdown[label] = (breakdown[label] || 0) + duration

                // Track total pauses for Resolution Net Time calculation (only if AFTER tPresaInCarico)
                if (tPresaInCarico && segmentEnd > tPresaInCarico) {
                    const activeStart = Math.max(segmentStart, tPresaInCarico)
                    const activeEnd = segmentEnd

                    if (activeEnd > activeStart) {
                        const isStatusPaused = pauseStatuses.some(ps => ps.toLowerCase() === state.status.toLowerCase())
                        if (isStatusPaused || isDipendenzaPaused) {
                            calculatedPause += calcDuration(activeStart, activeEnd)
                        }
                    }
                }
            }
        }

        // --- Reaction Time ---
        if (tBacklog) {
            const endReact = tPresaInCarico || Date.now()
            calculatedReaction = calcDuration(tBacklog, endReact)
            reactionMinutes = calculatedReaction
        }

        // --- Resolution Time ---
        if (tPresaInCarico) {
            const endWork = tDone || Date.now()
            const grossDuration = calcDuration(tPresaInCarico, endWork)
            calculatedResolution = Math.max(0, grossDuration - calculatedPause)

            workingTime = calculatedResolution
            waitingTime = calculatedPause
        }

        // Collect non-zero breakdown items
        issueBreakdown = Object.fromEntries(
            Object.entries(breakdown)
                .filter(([_, val]) => val > 0.01)
                .map(([key, val]) => [key, parseFloat(val.toFixed(2))])
        )


        // Targets
        const configAny = slaConfig as any
        let targetRes = (configAny.resolution ? configAny.resolution[slaTier] : (configAny.RESOLUTION ? configAny.RESOLUTION[slaTier] : 40 * 60))
        let targetReact = 15

        // Special Rule for ONLY Task types
        if (issueType === 'Task') {
            targetRes = 15 * (BUSINESS_END_HOUR - BUSINESS_START_HOUR) * 60 // 15 business days
            targetReact = 999999 // Effectively no reaction SLA
        } else {
            if (configAny.reactionTime !== undefined) {
                targetReact = typeof configAny.reactionTime === 'object' ? configAny.reactionTime[slaTier] ?? 15 : configAny.reactionTime
            } else if (configAny.REACTION !== undefined) {
                targetReact = configAny.REACTION
            }
        }

        const resolutionMet = workingTime <= (targetRes + 0.001)
        const reactionMet = issueType === 'Task' ? true : (reactionMinutes <= (targetReact + 0.001))

        // --- Active Issue Projections ---
        let projectedReactionBreach: string | undefined
        let projectedResolutionBreach: string | undefined

        // Determine Pause State (Current)
        const pauseStatusesLow = pauseStatuses.map(s => s.toLowerCase())
        const isStatusPaused = pauseStatusesLow.includes(currentStatus.toLowerCase())
        const isDipendenzaPaused = pauseDependencies.includes(currentDipendenza)
        const isPaused = isStatusPaused || isDipendenzaPaused

        const excludeLunch = (slaConfig as any).excludeLunchBreak || false

        // Reaction Projection (if not yet presa in carico)
        if (!tPresaInCarico && tBacklog) {
            const consumed = reactionMinutes
            const remaining = targetReact - consumed
            if (remaining > 0) {
                // Reaction clock usually Business Hours? Or matches Priority?
                // Assuming same rules as Resolution for now (is24x7)
                projectedReactionBreach = addBusinessMinutes(new Date(), remaining, excludeLunch, is24x7).toISOString()
            }
        }

        // Resolution Projection (if started but active)
        if (tPresaInCarico && !tDone) {
            const consumed = workingTime
            const remaining = targetRes - consumed

            if (remaining > 0 && !isPaused) {
                projectedResolutionBreach = addBusinessMinutes(new Date(), remaining, excludeLunch, is24x7).toISOString()
            }
        }

        // Update Effective Creation Date if mapped
        parsedIssues.push({
            key,
            summary,
            status,
            priority,
            issueType,
            slaTier,
            created: effectiveCreated.toISOString(), // Override with custom creation date string
            resolutionDate: tDone ? new Date(tDone).toISOString() : (fields.resolutiondate || undefined),
            reactionTime: parseFloat(reactionMinutes.toFixed(2)),
            resolutionTime: parseFloat(workingTime.toFixed(2)),
            timeInPause: parseFloat(waitingTime.toFixed(2)),
            timeInWork: parseFloat(workingTime.toFixed(2)),
            reactionSLAMet: reactionMet,
            resolutionSLAMet: resolutionMet,
            slaTargetResolution: targetRes,
            slaTargetReaction: targetReact,
            timeBreakdown: issueBreakdown,

            changelog: history.map((h: any) => ({
                author: h.author?.displayName || 'Unknown',
                created: h.created,
                items: h.items.map((i: any) => ({
                    field: i.field,
                    fromString: i.fromString || '',
                    toString: i.toString || ''
                }))
            })),

            // Populated later
            projectedReactionBreach,
            projectedResolutionBreach,
            isReactionPaused: false, // Reaction usually doesn't pause?
            isResolutionPaused: isPaused
        })

        // Aggregation
        if (!byPriority[priority]) byPriority[priority] = { total: 0, met: 0, missed: 0 }
        byPriority[priority].total++
        if (resolutionMet) byPriority[priority].met++
        else byPriority[priority].missed++
    }

    const totalIssues = parsedIssues.length
    const metResolutionSLA = parsedIssues.filter(i => i.resolutionSLAMet).length

    return {
        totalIssues,
        metResolutionSLA,
        missedResolutionSLA: totalIssues - metResolutionSLA,
        compliancePercent: totalIssues > 0 ? (metResolutionSLA / totalIssues) * 100 : 100,
        byPriority,
        issues: parsedIssues
    }
}

// --- Helper Functions for Business SLA ---

const BUSINESS_START_HOUR = 9
const BUSINESS_END_HOUR = 18

// Italian Holidays 2024-2026 (Fixed & Moving)
// Simplified list for major holidays
const FIXED_HOLIDAYS = [
    '01-01', // Capodanno
    '01-06', // Epifania
    '04-25', // Liberazione
    '05-01', // Lavoro
    '06-02', // Repubblica
    '08-15', // Ferragosto
    '11-01', // Ognissanti
    '12-08', // Immacolata
    '12-25', // Natale
    '12-26', // Santo Stefano
]

function isHoliday(date: Date): boolean {
    const d = date.getDate().toString().padStart(2, '0')
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const dayMonth = `${m}-${d}`

    if (FIXED_HOLIDAYS.includes(dayMonth)) return true

    // Pasquetta (Easter Monday) - Rough calc or hardcoded for recent years
    const year = date.getFullYear()
    const pasquettaDates: Record<number, string> = {
        2024: '04-01',
        2025: '04-21',
        2026: '04-06'
    }
    if (pasquettaDates[year] === dayMonth) return true

    return false
}

function calculateBusinessMinutes(start: Date, end: Date, excludeLunch: boolean = false): number {
    if (start >= end) return 0

    let totalMinutes = 0
    let current = new Date(start)

    while (current < end) {
        const isWeekend = current.getDay() === 0 || current.getDay() === 6
        const isHol = isHoliday(current)

        if (!isWeekend && !isHol) {
            // Business Day
            const businessStart = new Date(current)
            businessStart.setHours(BUSINESS_START_HOUR, 0, 0, 0)

            const businessEnd = new Date(current)
            businessEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0)

            // Overlap of TaskInterval [start, end] AND BusinessHours [businessStart, businessEnd]

            const intervalStart = start > businessStart ? start : businessStart
            const intervalEnd = end < businessEnd ? end : businessEnd

            if (intervalEnd > intervalStart) {
                let segmentMinutes = (intervalEnd.getTime() - intervalStart.getTime()) / (1000 * 60)

                if (excludeLunch) {
                    const lunchStart = new Date(current)
                    lunchStart.setHours(13, 0, 0, 0)
                    const lunchEnd = new Date(current)
                    lunchEnd.setHours(14, 0, 0, 0)

                    const overlapStart = intervalStart > lunchStart ? intervalStart : lunchStart
                    const overlapEnd = intervalEnd < lunchEnd ? intervalEnd : lunchEnd

                    if (overlapEnd > overlapStart) {
                        segmentMinutes -= (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
                    }
                }

                totalMinutes += segmentMinutes
            }
        }

        // Move to next day start
        current.setDate(current.getDate() + 1)
        current.setHours(0, 0, 0, 0)
    }

    return totalMinutes
}

export function addBusinessMinutes(start: Date, minutesToAdd: number, excludeLunch: boolean = false, is24x7: boolean = false): Date {
    if (minutesToAdd <= 0) return start

    let current = new Date(start)
    let remaining = minutesToAdd

    if (is24x7) {
        // Simple add, but skip lunches if needed
        while (remaining > 0) {
            if (excludeLunch) {
                const lunchStart = new Date(current)
                lunchStart.setHours(13, 0, 0, 0)
                const lunchEnd = new Date(current)
                lunchEnd.setHours(14, 0, 0, 0)

                if (current >= lunchStart && current < lunchEnd) {
                    current.setTime(lunchEnd.getTime())
                }

                // Check dist to next lunch
                let nextLunch = new Date(current)
                if (current.getHours() >= 14) {
                    nextLunch.setDate(nextLunch.getDate() + 1)
                }
                nextLunch.setHours(13, 0, 0, 0)

                const minsToLunch = (nextLunch.getTime() - current.getTime()) / 60000
                if (remaining <= minsToLunch) {
                    current.setTime(current.getTime() + remaining * 60000)
                    remaining = 0
                } else {
                    remaining -= minsToLunch
                    current.setTime(nextLunch.getTime() + 60 * 60000) // Skip lunch
                }
            } else {
                current.setTime(current.getTime() + remaining * 60000)
                remaining = 0
            }
        }
        return current
    }

    // 1. Adjust start to formatted business time if needed
    // If before 9, move to 9. If after 18, move to tomorrow 9.
    // Loop until valid business start
    while (true) {
        const isWk = current.getDay() === 0 || current.getDay() === 6
        const isHol = isHoliday(current)
        const hour = current.getHours()

        if (isWk || isHol) {
            current.setDate(current.getDate() + 1)
            current.setHours(BUSINESS_START_HOUR, 0, 0, 0)
            continue
        }

        if (hour >= BUSINESS_END_HOUR) {
            current.setDate(current.getDate() + 1)
            current.setHours(BUSINESS_START_HOUR, 0, 0, 0)
            continue
        }

        if (hour < BUSINESS_START_HOUR) {
            current.setHours(BUSINESS_START_HOUR, 0, 0, 0)
        }

        break
    }

    // 2. Add minutes
    while (remaining > 0) {
        // We are guaranteed to be inside a business day, >= 09:00 and < 18:00
        const endOfDay = new Date(current)
        endOfDay.setHours(BUSINESS_END_HOUR, 0, 0, 0)

        // Calculate available minutes today
        // Lunch Logic: 13:00 - 14:00
        const lunchStart = new Date(current)
        lunchStart.setHours(13, 0, 0, 0)
        const lunchEnd = new Date(current)
        lunchEnd.setHours(14, 0, 0, 0)

        // Determine current phase relative to lunch
        // Phase 1: Morning (Start < 13:00)
        // Phase 2: Lunch (13:00 <= Start < 14:00) -> Should have been skipped logic wise, but let's handle
        // Phase 3: Afternoon (Start >= 14:00)

        // Adjust if we are IN lunch (should just jump to 14:00 if excludeLunch is on)
        if (excludeLunch && current >= lunchStart && current < lunchEnd) {
            current.setTime(lunchEnd.getTime())
        }

        let minutesAvailableToday = (endOfDay.getTime() - current.getTime()) / (1000 * 60)

        if (excludeLunch) {
            // If before lunch, we lose 60 mins of "capacity" if we cross it?
            // No, we just have a gap.
            // If current < lunchStart, we have (LunchStart - Current) + (18:00 - 14:00)
            if (current < lunchStart) {
                const morningMins = (lunchStart.getTime() - current.getTime()) / (1000 * 60)
                // If we can finish in morning
                if (remaining <= morningMins) {
                    current.setTime(current.getTime() + remaining * 60 * 1000)
                    remaining = 0
                    break
                }

                // Use up morning
                remaining -= morningMins
                current.setTime(lunchEnd.getTime()) // Jump to 14:00
                continue // Re-eval loop (now we are at 14:00)
            }
        }

        if (remaining <= minutesAvailableToday) {
            current.setTime(current.getTime() + remaining * 60 * 1000)
            remaining = 0
        } else {
            remaining -= minutesAvailableToday
            current.setDate(current.getDate() + 1)
            current.setHours(BUSINESS_START_HOUR, 0, 0, 0)
            // Loop continues to find next valid business day
            while (true) {
                const isWk = current.getDay() === 0 || current.getDay() === 6
                const isHol = isHoliday(current)
                if (!isWk && !isHol) break
                current.setDate(current.getDate() + 1)
            }
        }
    }

    return current
}
