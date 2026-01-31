import { readFile } from 'fs/promises'
import { join } from 'path'
import pdf from 'pdf-parse'

const file = 'releases/Resevo/2026 9_15-270126-095550.pdf'

async function debug() {
    try {
        const buffer = await readFile(join(process.cwd(), file))
        const data = await pdf(buffer)
        const text = data.text

        const headerRegex = /Release Notes - Resevo - (.+?)\s*-?\s*(\d{2}\/\d{2}\/\d{4}) (\d{1,2}:\d{2})/
        const match = text.match(headerRegex)

        console.log('--- MATCH RESULT ---')
        console.log(match ? 'MATCHED' : 'FAILED')
        if (match) {
            console.log('Title:', match[1])
            console.log('Date:', match[2])
            console.log('Time:', match[3])
        }

        console.log('\n--- RAW HEADER CONTEXT ---')
        // Find where "Release Notes" starts
        const start = text.indexOf('Release Notes - Resevo - ')
        if (start !== -1) {
            const excerpt = text.substring(start, start + 100)
            console.log('Excerpt:', excerpt)
            console.log('Char Codes:')
            for (let i = 0; i < excerpt.length; i++) {
                console.log(`${excerpt[i]}: ${excerpt.charCodeAt(i)}`)
            }
        } else {
            console.log('Could not find start string')
        }

    } catch (e) {
        console.error(`Failed to read ${file}`, e)
    }
}

debug()
