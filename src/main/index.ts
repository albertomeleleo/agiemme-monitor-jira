import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { copyFile, mkdir, readdir, stat, unlink, readFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { scanReleases } from './scanner'
import { parseSLA } from './sla-parser'
import { jiraService } from './services/jira-service'

function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // Get User Documents Path
    const getDocumentsPath = () => {
        return join(app.getPath('documents'), 'ReleaseAnalyzer')
    }

    // IPC Handlers

    ipcMain.handle('get-projects', async () => {
        const releasesPath = getDocumentsPath()
        console.log(`Projects Root: ${releasesPath}`)
        try {
            await mkdir(releasesPath, { recursive: true })
            const items = await readdir(releasesPath)
            const projects: any[] = []

            for (const item of items) {
                const fullPath = join(releasesPath, item)
                const stats = await stat(fullPath)

                if (stats.isDirectory()) {
                    let logo: string | undefined = undefined
                    let config: any | undefined = undefined
                    try {
                        const configPath = join(fullPath, 'project.json')
                        const configContent = await readFile(configPath, 'utf-8')
                        config = JSON.parse(configContent)
                        if (config.logo) {
                            // Convert logo to base64 or absolute path for renderer
                            // Using protocol or reading file to base64
                            const logoPath = join(fullPath, config.logo)
                            const logoBuffer = await readFile(logoPath)
                            const base64 = logoBuffer.toString('base64')
                            const ext = config.logo.split('.').pop()
                            logo = `data:image/${ext};base64,${base64}`
                        }
                    } catch (e) {
                        // parsed without logo or config doesn't exist
                    }

                    projects.push({
                        name: item,
                        logo,
                        config,
                        lastModified: stats.mtime.toISOString()
                    })
                }
            }
            return projects
        } catch (e) {
            console.error('Failed to get projects', e)
            return []
        }
    })

    ipcMain.handle('create-project', async (_, name: string) => {
        const releasesPath = getDocumentsPath()
        const projectPath = join(releasesPath, name)
        try {
            await mkdir(projectPath, { recursive: true })
            // Create default project.json
            const defaultConfig = {
                sla: {
                    REACTION: 15,
                    RESOLUTION: {
                        'Expedite': 240,
                        'Critical': 480,
                        'Major': 960,
                        'Minor': 1920,
                        'Trivial': 2400
                    }
                },
                priorities: {
                    'highest': 'Expedite',
                    'critical': 'Expedite',
                    'high': 'Critical',
                    'medium': 'Major',
                    'low': 'Minor',
                    'lowest': 'Trivial'
                },
                issueTypes: [
                    { raw: 'Bug', label: '🐞 Bugs' },
                    { raw: '[System] Service request', label: '🤖 System' }
                ]
            }
            await import('fs/promises').then(fs => fs.writeFile(join(projectPath, 'project.json'), JSON.stringify(defaultConfig, null, 2)))
            return true
        } catch (e) {
            console.error(`Failed to create project ${name}`, e)
            return false
        }
    })

    ipcMain.handle('save-project-config', async (_, projectName: string, config: any) => {
        const releasesPath = getDocumentsPath()
        const configPath = join(releasesPath, projectName, 'project.json')
        try {
            // Read existing to preserve logo path if not passed (though we should pass it)
            let existing: any = {}
            try {
                const content = await readFile(configPath, 'utf-8')
                existing = JSON.parse(content)
            } catch (e) { }

            const newConfig = { ...existing, ...config }
            await import('fs/promises').then(fs => fs.writeFile(configPath, JSON.stringify(newConfig, null, 2)))
            return true
        } catch (e) {
            console.error(`Failed to save config for ${projectName}`, e)
            return false
        }
    })

    ipcMain.handle('get-releases', async (_, projectName: string) => {
        const releasesPath = join(getDocumentsPath(), projectName)
        console.log(`Scanning releases at: ${releasesPath}`)
        try {
            await mkdir(releasesPath, { recursive: true })
            return await scanReleases(releasesPath)
        } catch (e) {
            console.error(`Error scanning ${projectName}`, e)
            return []
        }
    })

    ipcMain.handle('upload-logo', async (_, projectName: string) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }]
        })

        if (canceled || filePaths.length === 0) {
            return null
        }

        const filePath = filePaths[0]
        const releasesPath = getDocumentsPath()
        const projectPath = join(releasesPath, projectName)

        try {
            await mkdir(projectPath, { recursive: true })

            const ext = filePath.split('.').pop()
            const newFileName = `logo.${ext}`
            const destPath = join(projectPath, newFileName)

            await copyFile(filePath, destPath)

            // Update project.json
            const configPath = join(projectPath, 'project.json')
            let config: any = {}
            try {
                const existing = await readFile(configPath, 'utf-8')
                config = JSON.parse(existing)
            } catch (e) {
                // Ignore if not exists
            }

            config.logo = newFileName
            await import('fs/promises').then(fs => fs.writeFile(configPath, JSON.stringify(config, null, 2)))

            // Return the new logo as base64
            const logoBuffer = await readFile(destPath)
            const base64 = logoBuffer.toString('base64')
            return `data:image/${ext};base64,${base64}`

        } catch (e) {
            console.error(`Failed to upload logo for ${projectName}`, e)
            return null
        }
    })


    ipcMain.handle('upload-file', async (_, projectName: string) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'PDFs', extensions: ['pdf'] }]
        })

        if (canceled || filePaths.length === 0) {
            return false
        }

        const releasesPath = join(getDocumentsPath(), projectName)
        await mkdir(releasesPath, { recursive: true })

        for (const filePath of filePaths) {
            const fileName = basename(filePath)
            const destPath = join(releasesPath, fileName)
            try {
                await copyFile(filePath, destPath)
            } catch (e) {
                console.error(`Failed to copy ${fileName}`, e)
            }
        }

        return true
    })

    ipcMain.handle('delete-file', async (_, projectName: string, filename: string) => {
        const filePath = join(getDocumentsPath(), projectName, filename)
        try {
            await unlink(filePath)
            return true
        } catch (e) {
            console.error(`Failed to delete ${filename} in ${projectName}`, e)
            return false
        }
    })

    ipcMain.handle('save-file', async (_, projectName: string, filename: string, content: string) => {
        const filePath = join(getDocumentsPath(), projectName, filename)
        try {
            await mkdir(join(getDocumentsPath(), projectName), { recursive: true })
            const { writeFile } = await import('fs/promises')
            await writeFile(filePath, content, 'utf-8')
            return true
        } catch (e) {
            console.error(`Failed to save ${filename}`, e)
            return false
        }
    })

    ipcMain.handle('parse-sla', async (_, content, config) => {
        try {
            return parseSLA(content, config)
        } catch (e) {
            console.error('Error parsing SLA CSV:', e)
            return null
        }
    })

    // Jira Handlers
    ipcMain.handle('jira-get-config', () => jiraService.getConfig())
    ipcMain.handle('jira-save-config', (_, config) => jiraService.saveConfig(config))
    ipcMain.handle('jira-test-connection', (_, config) => jiraService.testConnection(config))
    ipcMain.handle('jira-get-projects', () => jiraService.getProjects())
    ipcMain.handle('jira-get-versions', (_, projectKey) => jiraService.getVersions(projectKey))
    ipcMain.handle('jira-get-issues', (_, projectKey, versionId) => jiraService.getReleaseIssues(projectKey, versionId))


    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
