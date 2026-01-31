import { Select, Typography } from '@design-system'

interface SLAFiltersProps {
    isSticky: boolean
    selectedMonth: string
    onMonthChange: (val: string) => void
    availableMonths: string[]
    selectedPriority: string
    onPriorityChange: (val: string) => void
    availablePriorities: string[]
    filterMode: 'all' | 'failed'
    onFilterModeChange: (mode: 'all' | 'failed') => void
    excludeRejected: boolean
    onExcludeRejectedChange: (val: boolean) => void
    activeTab: 'overview' | 'issues'
    onTabChange: (tab: 'overview' | 'issues') => void
}

export function SLAFilters({
    isSticky,
    selectedMonth,
    onMonthChange,
    availableMonths,
    selectedPriority,
    onPriorityChange,
    availablePriorities,
    filterMode,
    onFilterModeChange,
    excludeRejected,
    onExcludeRejectedChange,
    activeTab,
    onTabChange
}: SLAFiltersProps): JSX.Element {

    return (
        <div className={`flex flex-wrap gap-4 items-center p-4 transition-all duration-300 sticky top-0 z-20 ${isSticky
            ? 'bg-brand-deep/95 backdrop-blur-md border-b-2 border-brand-cyan shadow-2xl shadow-brand-cyan/20 rounded-b-xl mx-0'
            : 'glass-panel rounded-xl mx-0 border border-white/10'
            }`}>
            <Typography variant="mono" className="text-gray-400 font-bold text-xs uppercase">Filter By:</Typography>

            <Select
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="!py-1.5"
            >
                <option value="All">All Months</option>
                {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </Select>

            <Select
                value={selectedPriority}
                onChange={(e) => onPriorityChange(e.target.value)}
                className="!py-1.5"
            >
                <option value="All">All Priorities</option>
                {availablePriorities.map(p => (
                    <option key={p} value={p}>{p}</option>
                ))}
            </Select>

            <div className="h-6 w-px bg-gray-700 mx-2 hidden md:block"></div>

            <div className="flex bg-brand-deep/50 rounded-lg p-1 border border-white/10">
                <button
                    onClick={() => onFilterModeChange('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterMode === 'all' ? 'bg-brand-cyan text-brand-deep shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white'}`}
                >
                    All Issues
                </button>
                <button
                    onClick={() => onFilterModeChange('failed')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterMode === 'failed' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-brand-text-sec hover:text-white'}`}
                >
                    Missed SLA Only
                </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                    <input
                        type="checkbox"
                        checked={excludeRejected}
                        onChange={(e) => onExcludeRejectedChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-gray-800 accent-brand-cyan"
                    />
                    <Typography variant="caption" className="!text-current">Exclude Rejected</Typography>
                </label>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 glass-panel p-1 rounded-lg w-fit border border-white/10">
                <button
                    onClick={() => onTabChange('overview')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-brand-cyan text-brand-deep shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white hover:bg-brand-card'}`}
                >
                    📊 Overview
                </button>
                <button
                    onClick={() => onTabChange('issues')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'issues' ? 'bg-brand-cyan text-brand-deep shadow-lg shadow-brand-cyan/20' : 'text-brand-text-sec hover:text-white hover:bg-brand-card'}`}
                >
                    📋 Issue List
                </button>
            </div>
        </div>
    )
}
