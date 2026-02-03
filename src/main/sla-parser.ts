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

        // 1. REACTION TIME
        const openTime = parseNumber(cleanCols[colMap.get('Open')!])
        const backlogTime = parseNumber(cleanCols[colMap.get('Backlog')!])
        const reactionMinutes = backlogTime + openTime

        // 2. PAUSE TIME
        let waitingTime = 0
        const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']
        pauseStatuses.forEach(s => {
            if (colMap.has(s)) {
                waitingTime += parseNumber(cleanCols[colMap.get(s)!])
            }
        })

        // 3. RESOLUTION TIME
        let workingTime = 0
        const workStatuses = ['In Progress', 'Presa in carico', 'Developer Testing', 'READY IN HOTFIX'] // This could also be configurable later
        workStatuses.forEach(s => {
            if (colMap.has(s)) {
                workingTime += parseNumber(cleanCols[colMap.get(s)!])
            }
        })

        const netResolutionMinutes = workingTime

        // Targets (Minutes)
        // Targets (Minutes)
        const config = slaConfig as any
        const targetRes = (config.resolution ? config.resolution[slaTier] : (config.RESOLUTION ? config.RESOLUTION[slaTier] : 40 * 60))

        // Determine Reaction Target
        let targetReact = 15 // Default
        if (config.reactionTime !== undefined) {
            if (typeof config.reactionTime === 'object') {
                targetReact = config.reactionTime[slaTier] ?? 15
            } else {
                targetReact = config.reactionTime
            }
        } else if (config.REACTION !== undefined) {
            targetReact = config.REACTION
        }

        // Check Compliance
        // Use a small epsilon for float comparison safety or ensure proper parsing
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
            reactionTime: parseFloat(reactionMinutes.toFixed(2)), // Keep precision
            resolutionTime: parseFloat(netResolutionMinutes.toFixed(2)), // Keep precision
            timeInPause: parseFloat(waitingTime.toFixed(2)),
            timeInWork: parseFloat(netResolutionMinutes.toFixed(2)),
            reactionSLAMet: reactionMet,
            resolutionSLAMet: resolutionMet,
            slaTargetResolution: targetRes,
            slaTargetReaction: targetReact
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
        if (!allowedRawTypes.has(issueType.toLowerCase())) continue

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

        // 1. Build Transition Timeline
        const transitions: { time: number, status: string, originalStatus: string }[] = []
        // Initial state
        transitions.push({ time: new Date(created).getTime(), status: 'Open', originalStatus: 'Open' })

        // Specific Anchors requested by user
        let tCreation: number | null = null
        let tInProgress: number | null = null
        let tDone: number | null = null

        for (const h of history) {
            const item = h.items.find((i: any) => i.field === 'status')
            if (item) {
                const ts = new Date(h.created).getTime()
                const from = item.fromString || ''
                const to = item.toString || ''

                // Track Transitions
                transitions.push({
                    time: ts,
                    status: to,
                    originalStatus: from
                })

                // Detect Anchors
                // "utilizza come data di creazione... Backlog -> Presa in carico"
                if (!tCreation && from === 'Backlog' && to === 'Presa in carico') {
                    tCreation = ts
                }

                // "utilizza come data di presa in carico... Presa in carico -> In Progress"
                // This seems to define the end of Reaction / Start of Work
                if (!tInProgress && from === 'Presa in carico' && to === 'In Progress') {
                    tInProgress = ts
                }

                // "utilizza come data di chiusura... -> Done"
                if (to === 'Done') {
                    tDone = ts // Use latest Done? Or first? Usually Resolution is final, so latest is safer if reopened.
                }
            }
        }

        // Apply Logic if Anchors exist
        let calculatedReaction = 0
        let calculatedResolution = 0
        let calculatedPause = 0

        // --- Reaction Time ---
        // Definition: Time between "Creation" (Backlog->Presa in carico) and "Presa in carico" (Presa in carico->In Progress)
        if (tCreation && tInProgress) {
            calculatedReaction = (tInProgress - tCreation) / (1000 * 60)
            reactionMinutes = calculatedReaction
        } else {
            // Fallback to standard status-based approach if specific transitions missing
            // (e.g. if issue went straight to In Progress)
            // Re-calculate using status durations as fallback
            let tempReaction = 0
            const reactionStatuses = ['Open', 'To Do', 'Backlog', 'New']
            for (let i = 0; i < transitions.length - 1; i++) {
                const start = transitions[i]
                const end = transitions[i + 1]
                if (reactionStatuses.includes(start.status)) {
                    tempReaction += (end.time - start.time) / (1000 * 60)
                }
            }
            // Only use fallback if Anchors were missing. 
            // If tCreation exists but tInProgress doesn't, we can't calculate per user rule.
            // But let's keep the value 0 if not met? Or fallback?
            // "Utilizza il valore..." implies strictness.
            // If the transition didn't happen, maybe Reaction is not met or calc is 0.
            // Let's fallback for robustness.
            if (tCreation && !tInProgress) {
                // Started reaction but not finished? Open ended?
                const now = Date.now()
                reactionMinutes = (now - tCreation) / (1000 * 60)
            } else if (!tCreation) {
                // Use generic
                reactionMinutes = tempReaction
            }
        }

        // --- Resolution Time ---
        // Definition: Time between "In Progress" anchor and "Done" anchor
        if (tInProgress) {
            const endWork = tDone || Date.now()

            // Calculate total duration
            // But need to subtract Pauses that happened within this interval

            // Iterate transitions that happened AFTER tInProgress and BEFORE endWork
            // Actually, easier to iterate all intervals and check overlap with [tInProgress, endWork]

            let totalWorkDuration = 0
            let totalPauseDuration = 0

            const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']

            for (let i = 0; i < transitions.length; i++) {
                const tran = transitions[i]
                const nextTranTime = (i < transitions.length - 1) ? transitions[i + 1].time : Date.now()

                // Interval [tran.time, nextTranTime]
                // Intersect with [tInProgress, endWork]
                const start = Math.max(tran.time, tInProgress)
                const end = Math.min(nextTranTime, endWork)

                if (end > start) {
                    const duration = (end - start) / (1000 * 60)
                    if (pauseStatuses.some(ps => ps.toLowerCase() === tran.status.toLowerCase())) {
                        totalPauseDuration += duration
                    } else {
                        // Assume everything else is work? Or just strictly non-pause?
                        // Resolution Time usually includes Work + Pause - Pause = Work.
                        // So effectively Resolution Time = (endWork - tInProgress) - Pauses.
                    }
                }
            }

            const grossDuration = (endWork - tInProgress) / (1000 * 60)
            calculatedResolution = grossDuration - totalPauseDuration
            calculatedPause = totalPauseDuration

            workingTime = calculatedResolution
            waitingTime = calculatedPause

        } else {
            // Fallback
            // ... (generic calculation logic would go here if needed, but let's stick to the requested mainly)
            // Standard calc:
            const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']
            const workStatuses = ['In Progress', 'Presa in carico', 'Developer Testing', 'READY IN HOTFIX']

            let tempWork = 0
            let tempPause = 0

            for (let i = 0; i < transitions.length; i++) {
                const start = transitions[i]
                const end = (i < transitions.length - 1) ? transitions[i + 1].time : Date.now()
                const dur = (end - start.time) / (1000 * 60)

                if (workStatuses.some(s => s.toLowerCase() === start.status.toLowerCase())) tempWork += dur
                if (pauseStatuses.some(s => s.toLowerCase() === start.status.toLowerCase())) tempPause += dur
            }
            workingTime = tempWork
            waitingTime = tempPause
        }

        // Targets
        const configAny = slaConfig as any
        const targetRes = (configAny.resolution ? configAny.resolution[slaTier] : (configAny.RESOLUTION ? configAny.RESOLUTION[slaTier] : 40 * 60))
        let targetReact = 15
        if (configAny.reactionTime !== undefined) {
            targetReact = typeof configAny.reactionTime === 'object' ? configAny.reactionTime[slaTier] ?? 15 : configAny.reactionTime
        } else if (configAny.REACTION !== undefined) {
            targetReact = configAny.REACTION
        }

        const resolutionMet = workingTime <= (targetRes + 0.001)
        const reactionMet = reactionMinutes <= (targetReact + 0.001)

        // Update Effective Creation Date if mapped
        const effectiveCreated = tCreation ? new Date(tCreation).toISOString() : created

        parsedIssues.push({
            key,
            summary,
            status,
            priority,
            issueType,
            slaTier,
            created: effectiveCreated, // Override with custom creation date
            resolutionDate: tDone ? new Date(tDone).toISOString() : (fields.resolutiondate || undefined),
            reactionTime: parseFloat(reactionMinutes.toFixed(2)),
            resolutionTime: parseFloat(workingTime.toFixed(2)),
            timeInPause: parseFloat(waitingTime.toFixed(2)),
            timeInWork: parseFloat(workingTime.toFixed(2)),
            reactionSLAMet: reactionMet,
            resolutionSLAMet: resolutionMet,
            slaTargetResolution: targetRes,
            slaTargetReaction: targetReact,

            changelog: history.map((h: any) => ({
                author: h.author?.displayName || 'Unknown',
                created: h.created,
                items: h.items.map((i: any) => ({
                    field: i.field,
                    fromString: i.fromString || '',
                    toString: i.toString || ''
                }))
            }))
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
