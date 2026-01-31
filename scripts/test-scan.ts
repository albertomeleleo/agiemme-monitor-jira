import { scanReleases } from '../src/main/scanner'
import { join } from 'path'

async function run() {
    const releasesPath = join(process.cwd(), 'releases/Resevo')
    console.log(`Scanning directory: ${releasesPath}`)

    const results = await scanReleases(releasesPath)
    console.log(`Found ${results.length} releases correctly parsed.`)

    const regressions = results.filter(r => r.isRegression)
    console.log(`Detected ${regressions.length} regressions.`)

    results.forEach(r => {
        console.log(`[${r.date} ${r.time}] ${r.internalTitle || r.filename}`)
        console.log(`   Type: ${r.isRegression ? 'REGRESSION' : 'Released'}`)
        console.log(`   Stats: 🐛 Bugfixes: ${r.bugfixCount} | ✨ Evolutives: ${r.evolutiveCount}`)
        console.log(`   Items: ${r.items.map(i => i.id).join(', ')}`)
        console.log('---------------------------------------------------')
    })

    if (results.length === 0) {
        console.error('FAILED: No releases found.')
        process.exit(1)
    }
}

run()
