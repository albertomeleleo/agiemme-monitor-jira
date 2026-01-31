import { scanReleases } from '../src/main/scanner'
import { join } from 'path'
import { readdir, stat } from 'fs/promises'

async function run() {
    const releasesPath = join(process.cwd(), 'releases')
    console.log(`Checking projects root: ${releasesPath}`)

    // 1. Check Projects
    try {
        const items = await readdir(releasesPath)
        const projects: string[] = []
        for (const item of items) {
            if ((await stat(join(releasesPath, item))).isDirectory()) {
                projects.push(item)
            }
        }
        console.log('Projects found:', projects)

        if (!projects.includes('Resevo')) {
            console.error('FAILED: "Resevo" project missing')
            process.exit(1)
        }

    } catch (e) {
        console.error('Error reading projects', e)
        process.exit(1)
    }

    // 2. Scan Resevo
    try {
        const resevoPath = join(releasesPath, 'Resevo')
        console.log(`Scanning Resevo at: ${resevoPath}`)
        const results = await scanReleases(resevoPath)
        console.log(`Resevo Releases: ${results.length}`)

        if (results.length === 0) {
            console.error('FAILED: No releases found in Resevo')
            process.exit(1)
        }

        results.forEach(r => {
            console.log(`[${r.internalTitle || r.filename}] ${r.date}`)
        })

    } catch (e) {
        console.error('Error scanning Resevo', e)
        process.exit(1)
    }
}

run()
