import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { app } from 'electron'

export interface MonitoredIssue {
    key: string
    summary: string
    status: string
    updated: string
    priority: string
    assignee?: string
    lastCheck: number // Timestamp
}

export interface IssueDatabase {
    projectKey: string
    jql: string
    issues: MonitoredIssue[]
    lastSync: number

    // Automation
    pollInterval?: number
    targetStatus?: string

    // Notifications
    notificationProvider?: 'whatsapp' | 'telegram'
    whatsappPhone?: string
    whatsappApiKey?: string
    telegramBotToken?: string
    telegramChatId?: string
}

class IssuesDB {
    private getPath(projectName: string) {
        return join(app.getPath('documents'), 'ReleaseAnalyzer', projectName, 'issues.json')
    }

    async getDB(projectName: string): Promise<IssueDatabase> {
        try {
            const path = this.getPath(projectName)
            const content = await readFile(path, 'utf-8')
            return JSON.parse(content)
        } catch (e) {
            return {
                projectKey: '',
                jql: 'created >= -30d ORDER BY created DESC',
                issues: [],
                lastSync: 0
            }
        }
    }

    async saveDB(projectName: string, db: IssueDatabase): Promise<void> {
        const path = this.getPath(projectName)
        // Ensure dir exists (it should, but just in case)
        await mkdir(join(app.getPath('documents'), 'ReleaseAnalyzer', projectName), { recursive: true })
        await writeFile(path, JSON.stringify(db, null, 2))
    }

    async updateIssues(projectName: string, newIssues: any[], jql?: string): Promise<IssueDatabase> {
        const db = await this.getDB(projectName)

        if (jql) db.jql = jql
        db.lastSync = Date.now()

        // Map and merge
        const mapped: MonitoredIssue[] = newIssues.map(i => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status.name,
            updated: i.fields.updated,
            priority: i.fields.priority?.name || 'Medium',
            assignee: i.fields.assignee?.displayName,
            lastCheck: Date.now()
        }))

        db.issues = mapped
        // In a real usage, we might want to smarter merge to keep history or detect changes here
        // But for now, full replacement of the "Monitored List" based on JQL is fine.
        // Actually, for "monitoring", we might want to just UPDATE existing keys and ADD new ones, 
        // removing those that no longer match JQL? 
        // Let's stick to full replacement for simplicity of "Sync".

        await this.saveDB(projectName, db)
        return db
    }
}

export const issuesDB = new IssuesDB()
