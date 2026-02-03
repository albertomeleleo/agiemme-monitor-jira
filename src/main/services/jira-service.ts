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

        const params = new URLSearchParams()
        params.append('jql', jql)
        params.append('startAt', '0')

        params.append('maxResults', (options.maxResults || 1000).toString())

        if (options.fields) {
            const fieldsString = Array.isArray(options.fields)
                ? options.fields.join(',')
                : options.fields
            params.append('fields', fieldsString)
        }

        if (options.expand) {
            const expandString = Array.isArray(options.expand)
                ? options.expand.join(',')
                : options.expand
            params.append('expand', expandString)
        }

        if (options.nextPageToken) {
            params.append('nextPageToken', options.nextPageToken)
        }

        const url = `${baseUrl}?${params.toString()}`

        // LOGGING
        console.log('Inizio chiamata FETCH (GET)...')
        console.log('URL completo:', url)
        // Convert Params to object for logging
        const paramsObj: Record<string, string> = {}
        for (const [key, value] of params.entries()) {
            paramsObj[key] = value
        }
        console.log('Query params:', paramsObj)

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(config.email, config.apiToken)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`JIRA Search API error (${response.status}): ${errorText}`)
        }

        const data = await response.json()
        return data
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
