import Store from 'electron-store'
import { JiraConfig, JiraProject, JiraVersion, JiraIssue } from '../../shared/jira-types'

const store = new Store<{ jira: JiraConfig }>({
    defaults: {
        jira: {
            host: '',
            email: '',
            apiToken: ''
        }
    }
})

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
        if (!url.startsWith('http')) {
            url = `https://${url}`
        }
        return url.replace(/\/$/, '')
    }

    getConfig(): JiraConfig {
        return store.get('jira')
    }

    saveConfig(config: JiraConfig) {
        store.set('jira', config)
    }

    async testConnection(config: JiraConfig): Promise<boolean> {
        try {
            const url = `${this.getBaseUrl(config.host)}/rest/api/3/myself`
            console.log('Testing connection to:', url)
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
        const config = this.getConfig()
        if (!config.host) throw new Error('Jira is not configured')

        if (!config.host) throw new Error('Jira is not configured')

        if (!config.host) throw new Error('Jira is not configured')

        const url = `${this.getBaseUrl(config.host)}/rest/api/3/project`
        console.log('Fetching projects from:', url)
        const response = await fetch(url, {
            headers: this.getHeaders(config.email, config.apiToken)
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`)
        }

        const data = await response.json()
        return data as JiraProject[]
    }

    async getVersions(projectKey: string): Promise<JiraVersion[]> {
        const config = this.getConfig()
        if (!config.host) throw new Error('Jira is not configured')

        if (!config.host) throw new Error('Jira is not configured')

        const url = `${this.getBaseUrl(config.host)}/rest/api/3/project/${projectKey}/versions`
        console.log('Fetching versions from:', url)
        const response = await fetch(url, {
            headers: this.getHeaders(config.email, config.apiToken)
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch versions: ${response.statusText}`)
        }

        const data = await response.json()
        return (data as JiraVersion[]).sort((a, b) => {
            // Sort by date desc (if available)
            if (a.releaseDate && b.releaseDate) {
                return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
            }
            return 0
        })
    }

    async getReleaseIssues(projectKey: string, versionId: string): Promise<JiraIssue[]> {
        const config = this.getConfig()
        if (!config.host) throw new Error('Jira is not configured')

        // JQL to find issues in the version
        const jql = `project = "${projectKey}" AND fixVersion = ${versionId}`

        // Use POST search for better stability
        // Use POST search for better stability
        // NOTE: The standard search endpoint is deprecated for JQL POST requests.
        // We must use /rest/api/3/search/jql
        const url = `${this.getBaseUrl(config.host)}/rest/api/3/search/jql`
        console.error('Fetching issues (POST) from:', url)
        console.error('JQL:', jql)

        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(config.email, config.apiToken),
            body: JSON.stringify({
                jql,
                maxResults: 1000,
                fields: ['summary', 'status', 'issuetype', 'created', 'priority']
                // Removing validateQuery as it might cause issues with the new endpoint
            })
        })

        if (!response.ok) {
            const body = await response.text()
            console.error(`Jira API Error: ${response.status} ${response.statusText}`)
            console.error('Response Body:', body)
            throw new Error(`Failed to fetch issues: ${response.statusText} (${response.status}) - ${body}`)
        }

        const data = await response.json()
        return data.issues as JiraIssue[]
    }
}

export const jiraService = new JiraService()
