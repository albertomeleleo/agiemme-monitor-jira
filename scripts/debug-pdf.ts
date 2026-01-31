import { readFile } from 'fs/promises'
import { join } from 'path'
import pdf from 'pdf-parse'

const files = [
    'releases/Resevo/2026 9_00-270126-095848.pdf',
    'releases/Resevo/2026 9_00-270126-095909.pdf',
    'releases/Resevo/2026 9_15-270126-095550.pdf'
]

async function debug() {
    for (const file of files) {
        try {
            const buffer = await readFile(join(process.cwd(), file))
            const data = await pdf(buffer)
            console.log(`\n=== DEBUGGING: ${file} ===`)
            console.log('--- RAW TEXT START ---')
            console.log(data.text.substring(0, 1000)) // First 1000 chars should be enough for header
            console.log('--- RAW TEXT END ---')
        } catch (e) {
            console.error(`Failed to read ${file}`, e)
        }
    }
}

debug()
