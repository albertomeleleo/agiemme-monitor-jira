import { storageService } from './storage-service'
import { JiraConfig, JiraProject, JiraVersion, JiraIssue } from '../../shared/jira-types'

export class JiraService {
    private getHeaders(email: string, token: string) {
        return {
            'Authorization': `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    private getBaseUrl(host: string) {
        // Ensure protocol and remove trailing slash
        let url = host.trim()
        if (!url.startsWith('http')) url = `https://${url}`
        return url.replace(/\/$/, '')
    }

    private async callApi(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
        const config = this.getConfig()
        if (!config.host || !config.email || !config.apiToken) {
            throw new Error('Jira is not fully configured (host, email, and apiToken are required)')
        }

        const url = `${this.getBaseUrl(config.host)}${endpoint}`
        const options: RequestInit = {
            method,
            headers: this.getHeaders(config.email, config.apiToken)
        }

        if (body) options.body = JSON.stringify(body)

        const response = await fetch(url, options)
        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Jira API Error (${response.status}): ${errorText}`)
        }

        return response.json()
    }

    getConfig(): JiraConfig {
        return storageService.getGlobal('jira', { host: '', email: '', apiToken: '' })
    }

    saveConfig(config: JiraConfig) {
        storageService.setGlobal('jira', config)
    }

    async testConnection(config: JiraConfig): Promise<boolean> {
        try {
            const url = `${this.getBaseUrl(config.host)}/rest/api/3/myself`
            const response = await fetch(url, {
                headers: this.getHeaders(config.email, config.apiToken)
            })
            return response.ok
        } catch (error) {
            console.error('Jira Connection Error:', error)
            return false
        }
    }

    async getProjects(): Promise<JiraProject[]> {
        return this.callApi('/rest/api/3/project')
    }

    async getVersions(projectKey: string): Promise<JiraVersion[]> {
        const data = await this.callApi(`/rest/api/3/project/${projectKey}/versions`)
        return (data as JiraVersion[]).sort((a, b) => {
            // Sort by date desc (if available)
            if (a.releaseDate && b.releaseDate) {
                return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
            }
            return 0
        })
    }

    async searchIssues(jql: string, options: any = {}): Promise<{ issues: any[], total: number }> {
        let allIssues: any[] = []
        let nextPageToken: string | undefined = undefined
        let isLast = false

        // Loop for Pagination
        do {
            const params = new URLSearchParams()
            params.append('jql', jql)
            params.append('maxResults', (options.maxResults || 1000).toString())
            if (options.fields) params.append('fields', Array.isArray(options.fields) ? options.fields.join(',') : options.fields)
            if (options.expand) params.append('expand', Array.isArray(options.expand) ? options.expand.join(',') : options.expand)
            if (nextPageToken) params.append('nextPageToken', nextPageToken)

            const data = await this.callApi(`/rest/api/3/search/jql?${params.toString()}`)
            if (data.issues) allIssues = allIssues.concat(data.issues)

            // Pagination Logic
            nextPageToken = data.nextPageToken
            isLast = data.isLast

            // Safety: if no token, we must stop even if isLast is somehow false (avoid infinite loop)
            if (!nextPageToken) break

        } while (isLast === false)

        return { issues: allIssues, total: allIssues.length }
    }

    async getReleaseIssues(projectKey: string, versionId: string): Promise<JiraIssue[]> {
        const jql = `project = "${projectKey}" AND fixVersion = ${versionId}`
        let allIssues: JiraIssue[] = []
        let nextPageToken: string | undefined = undefined

        do {
            const body: any = {
                jql,
                maxResults: 1000,
                fields: ['summary', 'status', 'issuetype', 'created', 'priority']
            }
            if (nextPageToken) body.nextPageToken = nextPageToken

            const data = await this.callApi('/rest/api/3/search/jql', 'POST', body)
            const issues = data.issues as JiraIssue[]
            allIssues = allIssues.concat(issues)
            nextPageToken = data.nextPageToken
        } while (nextPageToken)

        return allIssues
    }
}

export const jiraService = new JiraService()
