import { ReleaseData } from '../types'
import { Card, Badge, Typography } from '@design-system'

interface ReleaseListProps {
    releases: ReleaseData[]
    onSelect: (release: ReleaseData) => void
}

export function ReleaseList({ releases, onSelect }: ReleaseListProps): JSX.Element {
    return (
        <div className="space-y-3">
            {releases.map(release => (
                <Card
                    key={release.filename}
                    variant="glass"
                    className="!p-0 border border-white/10 overflow-hidden group hover:border-brand-cyan/50 transition-all cursor-pointer"
                    onClick={() => onSelect(release)}
                >
                    <div className="flex items-center justify-between p-4 hover:bg-brand-white/5 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-brand-deep flex items-center justify-center text-xl border border-white/10 group-hover:border-brand-cyan/30 group-hover:text-brand-cyan transition-colors">
                                📦
                            </div>
                            <div className="min-w-0">
                                <Typography variant="h3" className="truncate group-hover:text-brand-cyan transition-colors">
                                    {release.internalTitle || release.filename}
                                </Typography>
                                <div className="flex items-center gap-3 text-brand-text-sec text-xs mt-1">
                                    <span className="font-mono">📅 {release.date || 'Unknown'}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                    <span className="font-mono">🕒 {release.time || '--:--'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <Badge variant="bugfix" label={`${release.bugfixCount}`} />
                                <Badge variant="evolutive" label={`${release.evolutiveCount}`} />
                                {release.isRegression && <Badge variant="regression" label="REGRESSION" />}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-brand-cyan text-sm font-bold">View ›</span>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
