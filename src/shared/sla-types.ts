export interface SLAIssue {
    key: string;
    summary: string;
    status: string;
    priority: string;
    issueType: string;
    slaTier: string;
    created: string;
    resolutionDate?: string;

    // Calculated Times (in hours)
    reactionTime: number; // Presa in carico
    resolutionTime: number; // Tempo totale netto

    // Components
    timeInPause: number;
    timeInWork: number;

    // SLA Met?
    reactionSLAMet: boolean;
    resolutionSLAMet: boolean;

    slaTargetResolution: number; // Hours
    slaTargetReaction: number; // Hours (0.25 = 15m)

    changelog?: Array<{
        author: string;
        created: string;
        items: Array<{
            field: string;
            fromString: string | null;
            toString: string | null;
        }>;
    }>;
    timeBreakdown?: Record<string, number>;
}

export interface SLAReport {
    totalIssues: number;
    metResolutionSLA: number;
    missedResolutionSLA: number;
    compliancePercent: number;
    byPriority: Record<string, { total: number, met: number, missed: number }>;
    issues: SLAIssue[];
}
