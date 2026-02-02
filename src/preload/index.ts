import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    getProjects: (): Promise<any[]> => ipcRenderer.invoke('get-projects'),
    createProject: (name: string): Promise<boolean> => ipcRenderer.invoke('create-project', name),
    getReleases: (projectName: string): Promise<any[]> => ipcRenderer.invoke('get-releases', projectName),
    uploadLogo: (projectName: string): Promise<string | null> => ipcRenderer.invoke('upload-logo', projectName),
    uploadFile: (projectName: string): Promise<boolean> => ipcRenderer.invoke('upload-file', projectName),
    deleteFile: (projectName: string, filename: string): Promise<boolean> => ipcRenderer.invoke('delete-file', projectName, filename),
    saveFile: (projectName: string, filename: string, content: string): Promise<boolean> => ipcRenderer.invoke('save-file', projectName, filename, content),
    saveProjectConfig: (projectName: string, config: any): Promise<boolean> => ipcRenderer.invoke('save-project-config', projectName, config),
    parseSLA: (content: string, config?: any): Promise<any> => ipcRenderer.invoke('parse-sla', content, config),
    // Jira
    jiraGetConfig: (): Promise<any> => ipcRenderer.invoke('jira-get-config'),
    jiraSaveConfig: (config: any): Promise<void> => ipcRenderer.invoke('jira-save-config', config),
    jiraTestConnection: (config: any): Promise<boolean> => ipcRenderer.invoke('jira-test-connection', config),
    jiraGetProjects: (): Promise<any[]> => ipcRenderer.invoke('jira-get-projects'),
    jiraGetVersions: (projectKey: string): Promise<any[]> => ipcRenderer.invoke('jira-get-versions', projectKey),
    jiraGetIssues: (projectKey: string, versionId: string): Promise<any[]> => ipcRenderer.invoke('jira-get-issues', projectKey, versionId)
}

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}
