import { BrowserWindow } from 'electron'
import { issuesDB, IssueDatabase } from './issues-db'
import { jiraService } from './jira-service'
import { getProjects } from '../index' // Wait, I can't easily import from index if it's not exported. I should probably re-use functionality or just scan dirs.
import { readdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

// Simplified Notification Service
class NotificationService {
    async sendWhatsApp(phone: string, apiKey: string, message: string): Promise<boolean> {
        try {
            const encodedMsg = encodeURIComponent(message)
            const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMsg}&apikey=${apiKey}`
            console.log('Sending WhatsApp:', url.replace(apiKey, '***'))
            const res = await fetch(url)
            return res.ok
        } catch (e) {
            console.error('Failed to send WhatsApp', e)
            return false
        }
    }
}

class AutomationService {
    private timers: Map<string, NodeJS.Timeout> = new Map()
    private notificationService = new NotificationService()

    // Start monitoring for all projects
    async startAll() {
        console.log('Starting Automation Service...')
        const projectsDir = join(app.getPath('documents'), 'ReleaseAnalyzer')
        try {
            const items = await readdir(projectsDir)
            for (const project of items) {
                // Check if directory
                // Ideally we check if it has issues.json
                this.startProject(project)
            }
        } catch (e) {
            console.warn('No projects found or error reading dir', e)
        }
    }

    async startProject(projectName: string) {
        // Clear existing
        if (this.timers.has(projectName)) {
            clearInterval(this.timers.get(projectName)!)
            this.timers.delete(projectName)
        }

        const db = await issuesDB.getDB(projectName)

        // Requirements: JQL, PollInterval, WhatsApp Config, TargetStatus
        if (!db.jql || !db.pollInterval || !db.whatsappApiKey || !db.whatsappPhone || !db.targetStatus) {
            console.log(`Skipping automation for ${projectName}: Missing config`)
            return
        }

        console.log(`Starting scheduler for ${projectName} every ${db.pollInterval} min`)

        // Initial run? Maybe not, could spam on startup. Let's just set interval.
        const intervalMs = db.pollInterval * 60 * 1000
        const timer = setInterval(() => this.checkProject(projectName), intervalMs)
        this.timers.set(projectName, timer)
    }

    async checkProject(projectName: string) {
        console.log(`[Scheduler] Checking ${projectName}`)
        try {
            const db = await issuesDB.getDB(projectName)
            const oldIssuesMap = new Map(db.issues.map(i => [i.key, i]))

            // Fetch current
            const res = await jiraService.searchIssues(db.jql, { maxResults: 1000, fields: ['summary', 'status', 'updated', 'priority', 'assignee'] })

            // Updates
            const newIssues = res.issues
            const updatesToNotify: string[] = []

            // Check for changes
            for (const issue of newIssues) {
                const old = oldIssuesMap.get(issue.key)
                const currentStatus = issue.fields.status.name

                if (old) {
                    // Check if status changed TO target
                    if (old.status !== currentStatus &&
                        currentStatus.toLowerCase() === db.targetStatus!.toLowerCase()) {

                        updatesToNotify.push(`${issue.key}: ${currentStatus} (was ${old.status})`)
                    }
                }
            }

            // Save new state
            await issuesDB.updateIssues(projectName, newIssues, db.jql)

            if (updatesToNotify.length > 0) {
                console.log(`Found ${updatesToNotify.length} updates for ${projectName}`)
                const msg = `🚀 ReleaseAnalyzer: ${projectName}\n${updatesToNotify.join('\n')}`
                await this.notificationService.sendWhatsApp(db.whatsappPhone!, db.whatsappApiKey!, msg)
            } else {
                console.log('No status changes matching target.')
            }

        } catch (e) {
            console.error(`Error checking project ${projectName}`, e)
        }
    }

    stopAll() {
        this.timers.forEach(t => clearInterval(t))
        this.timers.clear()
    }
}

export const automationService = new AutomationService()
