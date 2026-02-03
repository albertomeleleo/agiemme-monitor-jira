import { ElectronAPI } from '@electron-toolkit/preload'
import { ReleaseData } from '../renderer/src/types'

interface Api {
    getProjects: () => Promise<import('../shared/project-types').Project[]>
    createProject: (name: string) => Promise<boolean>
    saveProjectConfig: (projectName: string, config: import('../shared/project-types').ProjectConfig) => Promise<boolean>
    getReleases: (projectName: string) => Promise<ReleaseData[]>
    uploadLogo: (projectName: string) => Promise<string | null>
    uploadFile: (projectName: string) => Promise<boolean>
    deleteFile: (projectName: string, filename: string) => Promise<boolean>
    saveFile: (projectName: string, filename: string, content: string) => Promise<boolean>
    parseSLA: (content: string, config?: any) => Promise<any>
    // Jira
    jiraGetConfig: () => Promise<import('../shared/jira-types').JiraConfig>
    jiraSaveConfig: (config: import('../shared/jira-types').JiraConfig) => Promise<void>
    jiraTestConnection: (config: import('../shared/jira-types').JiraConfig) => Promise<boolean>
    jiraGetProjects: () => Promise<import('../shared/jira-types').JiraProject[]>
    jiraGetVersions: (projectKey: string) => Promise<import('../shared/jira-types').JiraVersion[]>
    jiraGetIssues: (projectKey: string, versionId: string) => Promise<import('../shared/jira-types').JiraIssue[]>
    jiraSearchIssues: (jql: string, options?: any) => Promise<any>
    jiraParseApiIssues: (issues: any[], config?: any) => Promise<any>
    // Issues
    issuesGetDB: (projectName: string) => Promise<any>
    issuesSaveDB: (projectName: string, db: any) => Promise<boolean>
    issuesSync: (projectName: string, jql?: string) => Promise<any>
}

declare global {
    interface Window {
        electron: ElectronAPI
        api: Api
    }
}
