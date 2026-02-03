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

        const transitions: { time: number, status: string }[] = []
        transitions.push({ time: new Date(created).getTime(), status: 'Open' }) // Default start

        for (const h of history) {
            const item = h.items.find((i: any) => i.field === 'status')
            if (item) {
                transitions.push({
                    time: new Date(h.created).getTime(),
                    status: item.toString
                })
            }
        }

        let endTime = Date.now()
        if (fields.resolutiondate) {
            endTime = new Date(fields.resolutiondate).getTime()
        }

        const statusDurations: Record<string, number> = {}

        // Calculate durations
        for (let i = 0; i < transitions.length; i++) {
            const start = transitions[i]
            const end = (i < transitions.length - 1) ? transitions[i + 1].time : endTime
            const durationMins = (end - start.time) / (1000 * 60)

            const s = start.status
            statusDurations[s] = (statusDurations[s] || 0) + durationMins
        }

        // Map Statuses to Categories (Reaction vs Resolution vs Pause)
        // These hardcoded lists should ideally be in config too
        const reactionStatuses = ['Open', 'To Do', 'Backlog', 'New'] // Statuses before "In Progress"
        const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']
        const workStatuses = ['In Progress', 'Presa in carico', 'Developer Testing', 'READY IN HOTFIX']

        // Sum up
        for (const [s, dur] of Object.entries(statusDurations)) {
            if (reactionStatuses.some(rs => rs.toLowerCase() === s.toLowerCase())) {
                reactionMinutes += dur
            }
            if (pauseStatuses.some(ps => ps.toLowerCase() === s.toLowerCase())) {
                waitingTime += dur
            }
            if (workStatuses.some(ws => ws.toLowerCase() === s.toLowerCase())) {
                workingTime += dur
            }
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

        parsedIssues.push({
            key,
            summary,
            status,
            priority,
            issueType,
            slaTier,
            created,
            resolutionDate: fields.resolutiondate || undefined,
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
