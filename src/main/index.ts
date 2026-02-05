import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { copyFile, mkdir, unlink } from 'fs/promises'

// Import services
// Import services
import { jiraService } from './services/jira-service'
import { projectService } from './services/project-service'
import { scanReleases } from './scanner'
import { parseSLA, parseJiraApiIssues } from './sla-parser'

function createWindow(): void {
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

    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(() => {
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.electron')
    }

    // IPC Handlers
    ipcMain.handle('get-projects', () => projectService.getProjects())
    ipcMain.handle('create-project', (_, name) => projectService.createProject(name))
    ipcMain.handle('save-project-config', (_, name, config) => projectService.saveConfig(name, config))

    ipcMain.handle('import-config', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        if (canceled || filePaths.length === 0) return null

        try {
            const { readFile } = await import('fs/promises')
            const content = await readFile(filePaths[0], 'utf-8')
            return JSON.parse(content)
        } catch (e) {
            console.error('Failed to import config', e)
            return null
        }
    })

    ipcMain.handle('get-releases', async (_, projectName) => {
        const releasesPath = join(projectService.getDocumentsPath(), projectName)
        await mkdir(releasesPath, { recursive: true })
        return scanReleases(releasesPath)
    })

    ipcMain.handle('upload-logo', async (_, projectName) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }]
        })
        if (canceled || filePaths.length === 0) return null
        return projectService.uploadLogo(projectName, filePaths[0])
    })

    ipcMain.handle('upload-file', async (_, projectName) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'PDFs', extensions: ['pdf'] }]
        })
        if (canceled || filePaths.length === 0) return false
        const releasesPath = join(projectService.getDocumentsPath(), projectName)
        await mkdir(releasesPath, { recursive: true })
        for (const filePath of filePaths) {
            await copyFile(filePath, join(releasesPath, basename(filePath)))
        }
        return true
    })

    ipcMain.handle('delete-file', async (_, name, filename) => {
        try {
            await unlink(join(projectService.getDocumentsPath(), name, filename))
            return true
        } catch { return false }
    })

    ipcMain.handle('save-file', async (_, name, filename, content) => {
        const projectPath = join(projectService.getDocumentsPath(), name)
        await mkdir(projectPath, { recursive: true })
        const { writeFile } = await import('fs/promises')
        await writeFile(join(projectPath, filename), content, 'utf-8')
        return true
    })

    ipcMain.handle('parse-sla', (_, content, config) => parseSLA(content, config))

    // Jira
    ipcMain.handle('jira-get-config', () => jiraService.getConfig())
    ipcMain.handle('jira-save-config', (_, config) => jiraService.saveConfig(config))
    ipcMain.handle('jira-test-connection', (_, config) => jiraService.testConnection(config))
    ipcMain.handle('jira-get-projects', () => jiraService.getProjects())
    ipcMain.handle('jira-get-versions', (_, key) => jiraService.getVersions(key))
    ipcMain.handle('jira-get-issues', (_, key, vid) => jiraService.getReleaseIssues(key, vid))
    ipcMain.handle('jira-search-issues', (_, jql, opts) => jiraService.searchIssues(jql, opts))
    ipcMain.handle('jira-parse-api-issues', (_, issues, config) => parseJiraApiIssues(issues, config))


    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
