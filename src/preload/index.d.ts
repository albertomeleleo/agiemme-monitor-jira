import { ElectronAPI } from '@electron-toolkit/preload'
import { ReleaseData } from '../renderer/src/types'

interface Api {
    getProjects: () => Promise<import('../shared/project-types').Project[]>
    createProject: (name: string) => Promise<boolean>
    getReleases: (projectName: string) => Promise<ReleaseData[]>
    uploadLogo: (projectName: string) => Promise<string | null>
    uploadFile: (projectName: string) => Promise<boolean>
    deleteFile: (projectName: string, filename: string) => Promise<boolean>
    saveFile: (projectName: string, filename: string, content: string) => Promise<boolean>
    parseSLA: (content: string) => Promise<any>
    // Jira
    jiraGetConfig: () => Promise<import('../shared/jira-types').JiraConfig>
    jiraSaveConfig: (config: import('../shared/jira-types').JiraConfig) => Promise<void>
    jiraTestConnection: (config: import('../shared/jira-types').JiraConfig) => Promise<boolean>
    jiraGetProjects: () => Promise<import('../shared/jira-types').JiraProject[]>
    jiraGetVersions: (projectKey: string) => Promise<import('../shared/jira-types').JiraVersion[]>
    jiraGetIssues: (projectKey: string, versionId: string) => Promise<import('../shared/jira-types').JiraIssue[]>
}

declare global {
    interface Window {
        electron: ElectronAPI
        api: Api
    }
}
