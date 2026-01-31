import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { copyFile, mkdir, readdir, stat, unlink } from 'fs/promises'
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
            const projects: string[] = []
            for (const item of items) {
                const fullPath = join(releasesPath, item)
                const stats = await stat(fullPath)
                if (stats.isDirectory()) {
                    projects.push(item)
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
            return true
        } catch (e) {
            console.error(`Failed to create project ${name}`, e)
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

    ipcMain.handle('parse-sla', async (_, content) => {
        try {
            return parseSLA(content)
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
