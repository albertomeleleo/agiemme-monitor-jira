import { SLAIssue, SLAReport } from '../shared/sla-types'

// SLA Config (Minutes)
const SLA_CONFIG = {
    REACTION: 15, // 15 mins for all
    RESOLUTION: {
        'Expedite': 240,  // 4h * 60
        'Critical': 480,  // 8h * 60
        'Major': 960,     // 16h * 60
        'Minor': 1920,    // 32h * 60
        'Trivial': 2400   // 40h * 60
    }
}

function determineSLATier(priority: string): string {
    const p = priority.toLowerCase()

    // Expedite: Priority Highest or Critical
    if (p === 'highest' || p === 'critical') return 'Expedite'

    if (p === 'high') return 'Critical'
    if (p === 'medium') return 'Major'
    if (p === 'low') return 'Minor'
    if (p === 'lowest') return 'Trivial'

    return 'Major'
}

export function parseSLA(csvContent: string): SLAReport {
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())

    // Map header name to index
    const colMap = new Map<string, number>()
    headers.forEach((h, i) => colMap.set(h, i))

    const issues: SLAIssue[] = []

    // Stats
    const byPriority: Record<string, { total: number, met: number, missed: number }> = {}

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue

        // Simple CSV split (handling quoted commas would be better but simple logic first)
        const cleanCols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (cleanCols.length < headers.length) continue;

        const key = cleanCols[colMap.get('Key')!]
        const priority = cleanCols[colMap.get('Priority')!] || 'Medium'
        const status = cleanCols[colMap.get('Status')!]
        const created = cleanCols[colMap.get('Created')!]
        const summary = cleanCols[colMap.get('Summary')!]
        const issueType = cleanCols[colMap.get('Issue Type')!] || 'Task'

        // Filter: Analyze ONLY Bugs
        // if (issueType.toLowerCase() !== 'bug') continue

        // Determine SLA Tier
        const slaTier = determineSLATier(priority)

        // --- Calculate Times by Summing Columns ---

        // 1. REACTION TIME: Time spent in Backlog/Open before being picked up
        const openTime = parseNumber(cleanCols[colMap.get('Open')!])
        const backlogTime = parseNumber(cleanCols[colMap.get('Backlog')!])
        const reactionMinutes = backlogTime + openTime

        // 2. PAUSE TIME: Time explicitly paused/waiting
        let waitingTime = 0
        const pauseStatuses = ['Waiting for support', 'Waiting for Support (II° Level)-10104', 'In pausa', 'Sospeso', 'Pausa']
        pauseStatuses.forEach(s => {
            if (colMap.has(s)) {
                waitingTime += parseNumber(cleanCols[colMap.get(s)!])
            }
        })

        // 3. RESOLUTION TIME (WORK): Sum of ACTIVE working statuses
        // User definition: "Presa in carico" (16m) + "In Progress" (165m) = 181m
        let workingTime = 0
        const workStatuses = ['In Progress', 'Presa in carico', 'Developer Testing', 'READY IN HOTFIX']

        workStatuses.forEach(s => {
            if (colMap.has(s)) {
                workingTime += parseNumber(cleanCols[colMap.get(s)!])
            }
        })

        // NOTE: Previous logic used (Total - Pause). This included 'Done' and 'Released' which are NOT work time.
        // New logic sums only known work columns.
        const netResolutionMinutes = workingTime

        // Targets (Minutes)
        const targetRes = SLA_CONFIG.RESOLUTION[slaTier] || 2400
        const targetReact = SLA_CONFIG.REACTION

        // Check Compliance
        const resolutionMet = netResolutionMinutes <= targetRes
        const reactionMet = reactionMinutes <= targetReact

        // Determine Resolution Date (Release Date)
        let resolutionDate: string | undefined = undefined
        // Priority: Released time > Done time
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
            reactionTime: parseFloat(reactionMinutes.toFixed(0)), // Minutes
            resolutionTime: parseFloat(netResolutionMinutes.toFixed(0)), // Minutes
            timeInPause: parseFloat(waitingTime.toFixed(0)), // Minutes
            timeInWork: parseFloat(netResolutionMinutes.toFixed(0)), // Minutes - Redundant but kept
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
    // Handle "1,781" -> 1781
    return parseFloat(val.replace(/,/g, '').replace('"', '').trim())
}
