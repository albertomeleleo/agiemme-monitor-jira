export interface Project {
    name: string;
    logo?: string; // Path to the logo file (relative to project root or base64)
    lastModified?: string;
    config?: ProjectConfig;
}

export interface ProjectConfig {
    logo?: string;
    sla: {
        reactionTime: number | Record<string, number>; // Minutes (number for legacy, Record for granular)
        resolution: Record<string, number>; // Tier -> Hours
        excludeLunchBreak?: boolean;
        tolerances?: {
            reaction: Record<string, number>; // Tier -> Allowed Breach % (e.g. 5 for 5%)
            resolution: Record<string, number>; // Tier -> Allowed Breach %
        };
        aggregation?: {
            reaction: SLAGroup[];
            resolution: SLAGroup[];
        };
    };
    tiers?: string[]; // Ordered list of enabled tiers (e.g. ['P1', 'P2']). If missing, use defaults.
    priorities: Record<string, string>; // Jira Priority -> SLA Tier
    issueTypes: {
        raw: string; // The string in CSV (e.g. "[System] Service request")
        label: string; // Display label (e.g. "🤖 System")
    }[];
}

export interface SLAGroup {
    id: string;
    name: string;
    tiers: string[];
    tolerance: number; // Max Breach %
}
