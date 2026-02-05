import { storageService } from './storage-service'
import { mkdir, readdir, stat, readFile, copyFile } from 'fs/promises'
import { join } from 'path'
import { Project, ProjectConfig } from '../../shared/project-types'

export class ProjectService {
    getDocumentsPath(): string {
        return storageService.getDocumentsPath()
    }

    async getProjects(): Promise<Project[]> {
        const releasesPath = this.getDocumentsPath()
        try {
            await mkdir(releasesPath, { recursive: true })
            const items = await readdir(releasesPath)
            const projects: Project[] = []

            for (const item of items) {
                const fullPath = join(releasesPath, item)
                const stats = await stat(fullPath)

                if (stats.isDirectory()) {
                    let logo: string | undefined = undefined
                    const config = await storageService.getProjectData<ProjectConfig | undefined>(item, 'project', undefined)

                    if (config?.logo) {
                        try {
                            const logoPath = join(fullPath, config.logo)
                            const logoBuffer = await readFile(logoPath)
                            const base64 = logoBuffer.toString('base64')
                            const ext = config.logo.split('.').pop()
                            logo = `data:image/${ext};base64,${base64}`
                        } catch (e) {
                            console.warn(`Failed to read logo for project ${item}`, e)
                        }
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
    }

    async createProject(name: string): Promise<boolean> {
        try {
            const defaultConfig: ProjectConfig = {
                sla: {
                    reactionTime: 15,
                    resolution: {
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
            await storageService.setProjectData(name, 'project', defaultConfig)
            return true
        } catch (e) {
            console.error(`Failed to create project ${name}`, e)
            return false
        }
    }

    async saveConfig(projectName: string, config: Partial<ProjectConfig>): Promise<boolean> {
        try {
            const existing = await storageService.getProjectData<any>(projectName, 'project', {})
            const newConfig = { ...existing, ...config }
            await storageService.setProjectData(projectName, 'project', newConfig)
            return true
        } catch (e) {
            console.error(`Failed to save config for ${projectName}`, e)
            return false
        }
    }

    async uploadLogo(projectName: string, filePath: string): Promise<string | null> {
        const projectPath = join(this.getDocumentsPath(), projectName)
        try {
            await mkdir(projectPath, { recursive: true })
            const ext = filePath.split('.').pop()
            const newFileName = `logo.${ext}`
            const destPath = join(projectPath, newFileName)
            await copyFile(filePath, destPath)

            // Update configuration
            await this.saveConfig(projectName, { logo: newFileName })

            const logoBuffer = await readFile(destPath)
            const base64 = logoBuffer.toString('base64')
            return `data:image/${ext};base64,${base64}`
        } catch (e) {
            console.error(`Failed to upload logo for ${projectName}`, e)
            return null
        }
    }
}

export const projectService = new ProjectService()
