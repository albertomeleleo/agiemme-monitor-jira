import Store from 'electron-store'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { app } from 'electron'

export class StorageService {
    private _store: Store | null = null

    private get store() {
        if (!this._store) {
            this._store = new Store()
        }
        return this._store
    }

    getDocumentsPath(): string {
        // Only call app.getPath when process is ready
        return join(app.getPath('documents'), 'ReleaseAnalyzer')
    }

    private getProjectPath(projectName: string) {
        return join(this.getDocumentsPath(), projectName)
    }

    // Global Storage (electron-store)
    getGlobal<T>(key: string, defaultValue?: T): T {
        return this.store.get(key, defaultValue) as T
    }

    setGlobal(key: string, value: any): void {
        this.store.set(key, value)
    }

    // Project-specific Storage (JSON files)
    async getProjectData<T>(projectName: string, fileName: string, defaultValue: T): Promise<T> {
        const path = join(this.getProjectPath(projectName), `${fileName}.json`)
        try {
            const content = await readFile(path, 'utf-8')
            return JSON.parse(content)
        } catch (e) {
            return defaultValue
        }
    }

    async setProjectData(projectName: string, fileName: string, data: any): Promise<void> {
        const projectDir = this.getProjectPath(projectName)
        const path = join(projectDir, `${fileName}.json`)
        try {
            await mkdir(projectDir, { recursive: true })
            await writeFile(path, JSON.stringify(data, null, 2))
        } catch (e) {
            console.error(`Failed to save project data for ${projectName}/${fileName}`, e)
            throw e
        }
    }
}

export const storageService = new StorageService()
