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
