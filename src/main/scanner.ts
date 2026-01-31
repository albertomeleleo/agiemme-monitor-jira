import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import pdf from 'pdf-parse'
import { ReleaseData } from '../renderer/src/types'

export async function scanReleases(releasesPath: string): Promise<ReleaseData[]> {
    const files = await readdir(releasesPath)
    const validFiles = files.filter((file) => {
        const lower = file.toLowerCase()
        return lower.endsWith('.pdf') || lower.endsWith('.json')
    })

    const results: ReleaseData[] = []

    for (const file of validFiles) {
        try {
            const filePath = join(releasesPath, file)
            const lower = file.toLowerCase()

            if (lower.endsWith('.json')) {
                const content = await readFile(filePath, 'utf-8')
                const data = JSON.parse(content) as ReleaseData
                // Ensure filename is set correctly to current file
                data.filename = file
                results.push(data)
                continue
            }

            // PDF Handling
            const buffer = await readFile(filePath)
            const data = await pdf(buffer)
            const text = data.text

            // Extract Header Info
            // Expected Format: "Release Notes - Resevo - INTERNAL_TITLE - DD/MM/YYYY HH:MM"
            // Example: Release Notes - Resevo - RESEVO-5.424.74 - 07/01/2026 08:30
            // Example: Release Notes - Resevo - RESEVO-5.424.113 - 20/01/2026 9:00
            // We allow single digit hour H:MM
            const headerRegex = /Release Notes - Resevo - (.+?)\s*-?\s*(\d{2}\/\d{2}\/\d{4}) (\d{1,2}:\d{2})/
            const headerMatch = text.match(headerRegex)

            let internalTitle = ''
            let dateStr = ''
            let timeStr = ''

            if (headerMatch) {
                internalTitle = headerMatch[1].trim()
                const dateRaw = headerMatch[2]
                timeStr = headerMatch[3]

                // Convert DD/MM/YYYY to YYYY-MM-DD for sorting
                const [day, month, year] = dateRaw.split('/')
                dateStr = `${year}-${month}-${day}`
            } else {
                // Fallback to filename date if parsing fails
                const dateMatch = file.match(/(\d{4}) (\d{2})_(\d{2})/)
                if (dateMatch) {
                    dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
                }
            }

            // Analyze Items (Bugfix vs Evolutive)
            // Look for lines starting with RAM- or RESEVO- or generic items
            const lines = text.split('\n')
            let bugfixCount = 0
            let evolutiveCount = 0
            const items: ReleaseData['items'] = []

            // Heuristic: Identify issue lines. 
            const itemRegex = /(RAM-\d+|RESEVO-\d+)(.*)/i

            for (const line of lines) {
                if (itemRegex.test(line)) {
                    const match = line.match(itemRegex)
                    const id = match ? match[1] : ''
                    const description = match ? match[2] : line

                    const isBug = /errore|error|fix|bug|problema|exception|npe|crash|nullpointer/i.test(description)

                    let type: 'bugfix' | 'evolutive' | 'other' = 'other'
                    if (isBug) {
                        type = 'bugfix'
                        bugfixCount++
                    } else {
                        type = 'evolutive'
                        evolutiveCount++
                    }

                    items.push({ id, description: description.trim(), type })
                }
            }

            // Regression detection (Global flag)
            const isRegression = /regression|fix|hotfix|rollback/i.test(internalTitle) || (bugfixCount > evolutiveCount && bugfixCount > 0)

            results.push({
                filename: file,
                content: text,
                date: dateStr,
                time: timeStr,
                internalTitle,
                isRegression,
                bugfixCount,
                evolutiveCount,
                items
            })
        } catch (err) {
            console.error(`Error parsing ${file}:`, err)
        }
    }

    // Sort by date/time descending
    return results.sort((a, b) => {
        const dateA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`).getTime()
        const dateB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`).getTime()
        return dateB - dateA
    })
}
