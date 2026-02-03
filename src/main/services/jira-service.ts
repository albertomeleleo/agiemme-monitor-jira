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

    async searchIssues(jql: string, options: any = {}): Promise<any> {
        const config = this.getConfig()
        if (!config.host) throw new Error('Jira is not configured')

        // Construct base URL - prioritizing standard search endpoint but parameters conform to user request
        const baseUrl = `${this.getBaseUrl(config.host)}/rest/api/3/search/jql`

        let allIssues: any[] = []
        let nextPageToken: string | undefined = undefined
        let isLast = false

        // Base Params
        const baseParams = new URLSearchParams()
        baseParams.append('jql', jql)

        // Page size (maxResults per call)
        baseParams.append('maxResults', (options.maxResults || 1000).toString())

        if (options.fields) {
            const fieldsString = Array.isArray(options.fields)
                ? options.fields.join(',')
                : options.fields
            baseParams.append('fields', fieldsString)
        }

        if (options.expand) {
            const expandString = Array.isArray(options.expand)
                ? options.expand.join(',')
                : options.expand
            baseParams.append('expand', expandString)
        }

        // Loop for Pagination
        do {
            const params = new URLSearchParams(baseParams)

            if (nextPageToken) {
                params.append('nextPageToken', nextPageToken)
            } else {
                // For first call, maybe startAt 0 is good practice if API requires it, 
                // though api/3/search/jql usually defaults to 0.
                // params.append('startAt', '0') 
            }

            const url = `${baseUrl}?${params.toString()}`

            // LOGGING
            console.log(`[JiraService] Fetching page... Token present: ${!!nextPageToken}`)

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(config.email, config.apiToken)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`JIRA Search API error (${response.status}): ${errorText}`)
            }

            const data = await response.json()

            if (data.issues) {
                allIssues = allIssues.concat(data.issues)
            }

            // Pagination Logic
            nextPageToken = data.nextPageToken
            isLast = data.isLast

            // Safety: if no token, we must stop even if isLast is somehow false (avoid infinite loop)
            if (!nextPageToken) break

        } while (isLast === false)

        console.log(`[JiraService] Usage: searchIssues finished. Total issues: ${allIssues.length}`)

        return {
            issues: allIssues,
            total: allIssues.length
        }
    }

    async getReleaseIssues(projectKey: string, versionId: string): Promise<JiraIssue[]> {
        const config = this.getConfig()
        if (!config.host) throw new Error('Jira is not configured')

        // JQL to find issues in the version
        const jql = `project = "${projectKey}" AND fixVersion = ${versionId}`

        const url = `${this.getBaseUrl(config.host)}/rest/api/3/search/jql`
        console.log('Fetching issues (POST) from:', url)
        console.log('JQL:', jql)

        let allIssues: JiraIssue[] = []
        let nextPageToken: string | undefined = undefined

        do {
            const body: any = {
                jql,
                maxResults: 1000,
                fields: ['summary', 'status', 'issuetype', 'created', 'priority']
            }

            if (nextPageToken) {
                body.nextPageToken = nextPageToken
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(config.email, config.apiToken),
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const errorBody = await response.text()
                console.error(`Jira API Error: ${response.status} ${response.statusText}`)
                console.error('Response Body:', errorBody)
                throw new Error(`Failed to fetch issues: ${response.statusText} (${response.status}) - ${errorBody}`)
            }

            const data = await response.json()
            const issues = data.issues as JiraIssue[]
            allIssues = allIssues.concat(issues)

            nextPageToken = data.nextPageToken
            console.log(`Fetched ${issues.length} issues. Next Page Token: ${nextPageToken ? 'Yes' : 'No'}`)

        } while (nextPageToken)

        return allIssues
    }
}

export const jiraService = new JiraService()
