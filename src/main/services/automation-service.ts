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
    async sendTelegram(token: string, chatId: string, message: string): Promise<boolean> {
        try {
            const encodedMsg = encodeURIComponent(message)
            const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodedMsg}`
            console.log('Sending Telegram:', url.replace(token, '***'))
            const res = await fetch(url)
            return res.ok
        } catch (e) {
            console.error('Failed to send Telegram', e)
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

        // Requirements: JQL, PollInterval, TargetStatus
        if (!db.jql || !db.pollInterval || (!db.targetStatus && (!db.targetPriorities || db.targetPriorities.length === 0))) {
            console.log(`Skipping automation for ${projectName}: Missing basic config (Needs status or priorities)`)
            return
        }

        // Check Notification config
        const provider = db.notificationProvider || 'whatsapp'
        let hasConfig = false
        if (provider === 'whatsapp' && db.whatsappPhone && db.whatsappApiKey) hasConfig = true
        if (provider === 'telegram' && db.telegramBotToken && db.telegramChatId) hasConfig = true

        if (!hasConfig) {
            console.log(`Skipping automation for ${projectName}: Missing notification config for ${provider}`)
            return
        }

        console.log(`Starting scheduler for ${projectName} every ${db.pollInterval} min (${provider})`)

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
                const currentPriority = issue.fields.priority?.name || 'Medium'

                if (!old) {
                    // NEW ISSUE
                    if (db.targetPriorities && db.targetPriorities.length > 0) {
                        // Check if priority matches (case insensitive)
                        const matchesPriority = db.targetPriorities.some(p => p.toLowerCase() === currentPriority.toLowerCase())

                        if (matchesPriority) {
                            updatesToNotify.push(`🆕 NEW: ${issue.key} [${currentPriority}] - ${issue.fields.summary}`)
                        }
                    }
                } else {
                    // EXISTING ISSUE - Check status change
                    if (db.targetStatus) {
                        if (old.status !== currentStatus &&
                            currentStatus.toLowerCase() === db.targetStatus.toLowerCase()) {

                            updatesToNotify.push(`🔄 ${issue.key}: ${currentStatus} (was ${old.status})`)
                        }
                    }
                }
            }

            // Save new state
            await issuesDB.updateIssues(projectName, newIssues, db.jql)

            if (updatesToNotify.length > 0) {
                console.log(`Found ${updatesToNotify.length} updates for ${projectName}`)
                const msg = `🚀 ReleaseAnalyzer: ${projectName}\n${updatesToNotify.join('\n')}`

                const provider = db.notificationProvider || 'whatsapp'
                if (provider === 'telegram' && db.telegramBotToken && db.telegramChatId) {
                    await this.notificationService.sendTelegram(db.telegramBotToken, db.telegramChatId, msg)
                } else if (provider === 'whatsapp' && db.whatsappPhone && db.whatsappApiKey) {
                    await this.notificationService.sendWhatsApp(db.whatsappPhone, db.whatsappApiKey, msg)
                }
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
