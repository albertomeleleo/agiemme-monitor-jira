export interface ReleaseData {
    filename: string
    content: string
    date?: string // YYYY-MM-DD
    time?: string // HH:MM
    internalTitle?: string
    isRegression: boolean
    bugfixCount: number
    evolutiveCount: number
    items: Array<{
        id: string
        description: string
        type: 'bugfix' | 'evolutive' | 'other'
    }>
}
