import { issuesDB } from './issues-db'
import { jiraService } from './jira-service'
import { projectService } from './project-service'
import { notificationService } from './notification-service'

class AutomationService {
    private timers: Map<string, NodeJS.Timeout> = new Map()

    // Start monitoring for all projects
    async startAll() {
        console.log('Starting Automation Service...')
        try {
            const projects = await projectService.getProjects()
            for (const project of projects) {
                this.startProject(project.name)
            }
        } catch (e) {
            console.warn('Error fetching projects for automation', e)
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

        const intervalMs = db.pollInterval * 60 * 1000
        const timer = setInterval(() => this.checkProject(projectName), intervalMs)
        this.timers.set(projectName, timer)
    }

    async checkProject(projectName: string) {
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
                        const matchesPriority = db.targetPriorities.some(p => p.toLowerCase() === currentPriority.toLowerCase())
                        if (matchesPriority) {
                            updatesToNotify.push(`🆕 <b>NEW</b>: ${issue.key} [${currentPriority}] - ${issue.fields.summary}`)
                        }
                    }
                } else {
                    // EXISTING ISSUE - Check status change
                    if (db.targetStatus) {
                        if (old.status !== currentStatus && currentStatus.toLowerCase() === db.targetStatus.toLowerCase()) {
                            updatesToNotify.push(`🔄 <b>${issue.key}</b>: ${currentStatus} (was ${old.status})`)
                        }
                    }
                }
            }

            // Save new state
            await issuesDB.updateIssues(projectName, newIssues, db.jql)

            if (updatesToNotify.length > 0) {
                console.log(`Found ${updatesToNotify.length} updates for ${projectName}`)
                const provider = db.notificationProvider || 'whatsapp'
                const header = provider === 'telegram' ? `🚀 <b>ReleaseAnalyzer: ${projectName}</b>` : `🚀 *ReleaseAnalyzer: ${projectName}*`
                const msg = `${header}\n${updatesToNotify.join('\n')}`

                if (provider === 'telegram' && db.telegramBotToken && db.telegramChatId) {
                    await notificationService.sendTelegram(db.telegramBotToken, db.telegramChatId, msg)
                } else if (provider === 'whatsapp' && db.whatsappPhone && db.whatsappApiKey) {
                    // Stripping HTML for WA as it doesn't support it (CallMeBot handles some markdown)
                    const waMsg = msg.replace(/<b>/g, '*').replace(/<\/b>/g, '*')
                    await notificationService.sendWhatsApp(db.whatsappPhone, db.whatsappApiKey, waMsg)
                }
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
