import { ReleaseData } from '../types'
import { Card, Badge, Button, Typography } from '@design-system'

interface ReleaseCardProps {
    release: ReleaseData
    onClick: () => void
    onDelete: (filename: string) => void
}

export function ReleaseCard({ release, onClick, onDelete }: ReleaseCardProps): JSX.Element {
    return (
        <Card variant="glass" hoverable className="flex flex-col group relative overflow-hidden h-full" onClick={onClick}>
            <button
                className="absolute top-2 right-2 p-2 z-20 text-brand-text-sec hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete(release.filename)
                }}
                title="Delete Release"
            >
                🗑️
            </button>
            {release.isRegression && (
                <div className="absolute top-0 right-0 p-2 bg-red-500/20 rounded-bl-xl border-l border-b border-red-500/30 z-10">
                    <Typography variant="mono" className="text-red-400 font-bold uppercase text-[10px]">Regression</Typography>
                </div>
            )}

            <div className="mb-4 pr-6">
                <h3 className="text-lg font-semibold text-white truncate group-hover:text-brand-cyan transition-colors" title={`${release.internalTitle || release.filename} - ${release.date || 'Unknown Date'}`}>
                    {release.internalTitle || release.filename}
                </h3>
                <Typography variant="mono" className="text-xs text-brand-text-sec mt-1">
                    📅 {release.date || 'Unknown'}  🕒 {release.time || '--:--'}
                </Typography>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                <Badge variant="bugfix" label={`${release.bugfixCount} Bugs`} />
                <Badge variant="evolutive" label={`${release.evolutiveCount} Feat`} />
            </div>

            <div className="text-sm text-brand-text-sec line-clamp-3 leading-relaxed mb-4 p-3 rounded flex-grow font-mono text-xs border border-white/5 bg-brand-deep/50">
                {(release.content || '').slice(0, 200)}...
            </div>

            <div className="mt-auto flex gap-2">
                <Button
                    variant="primary"
                    className="flex-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClick()
                    }}
                >
                    View Details
                </Button>
            </div>
        </Card>
    )
}
