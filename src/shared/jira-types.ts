export interface JiraConfig {
    host: string
    email: string
    apiToken: string
}

export interface JiraProject {
    key: string
    id: string
    name: string
    avatarUrls?: {
        '48x48': string
    }
}

export interface JiraVersion {
    id: string
    name: string
    released: boolean
    releaseDate?: string
    description?: string
}

export interface JiraIssue {
    key: string
    fields: {
        summary: string
        status: {
            name: string
        }
        issuetype: {
            name: string
        }
        created: string
        priority: {
            name: string
        }
        // Custom fields for SLAs? For now just basics
    }
}
