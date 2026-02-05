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
    selectedIssueType: string
    onIssueTypeChange: (type: string) => void
    issueTypes: { raw: string, label: string }[]
    onReset: () => void
    onExport: () => void
    onRefresh?: () => void
    isRefreshing?: boolean
    showLegend: boolean
    onShowLegendChange: (show: boolean) => void
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
    onTabChange,
    selectedIssueType,
    onIssueTypeChange,
    issueTypes,
    onReset,
    onExport,
    onRefresh,
    isRefreshing,
    showLegend,
    onShowLegendChange
}: SLAFiltersProps): JSX.Element {

    return (
        <div className={`flex flex-wrap gap-4 items-center p-4 transition-all duration-300 sticky top-0 z-20 ${isSticky
            ? 'bg-brand-deep/95 backdrop-blur-md border-b-2 border-brand-cyan rounded-b-xl mx-0'
            : 'glass-panel rounded-xl mx-0 border border-gray-200 dark:border-white/10'
            }`}>
            <Typography variant="mono" className="text-brand-text-sec font-bold text-xs uppercase">Filter By:</Typography>

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

            <div className="flex bg-brand-deep/50 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                <button
                    onClick={() => onFilterModeChange('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterMode === 'all' ? 'bg-brand-cyan text-brand-deep shadow-lg ' : 'text-brand-text-sec hover:text-brand-text-pri'}`}
                >
                    All Issues
                </button>
                <button
                    onClick={() => onFilterModeChange('failed')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterMode === 'failed' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-brand-text-sec hover:text-brand-text-pri'}`}
                >
                    Missed SLA Only
                </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-2 text-sm text-brand-text-sec cursor-pointer hover:text-brand-text-pri transition-colors">
                    <input
                        type="checkbox"
                        checked={excludeRejected}
                        onChange={(e) => onExcludeRejectedChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-gray-800 accent-brand-cyan"
                    />
                    <Typography variant="caption" className="!text-current">Exclude Rejected</Typography>
                </label>

                <label className="flex items-center gap-2 text-sm text-brand-text-sec cursor-pointer hover:text-brand-text-pri transition-colors ml-4">
                    <input
                        type="checkbox"
                        checked={showLegend}
                        onChange={(e) => onShowLegendChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-gray-800 accent-brand-cyan"
                    />
                    <Typography variant="caption" className="!text-current">Show Legend</Typography>
                </label>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 glass-panel p-1 rounded-lg w-fit border border-gray-200 dark:border-white/10">
                <button
                    onClick={() => onTabChange('overview')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-brand-cyan text-brand-deep shadow-lg ' : 'text-brand-text-sec hover:text-brand-text-pri hover:bg-brand-card/50'}`}
                >
                    📊 Overview
                </button>
                <button
                    onClick={() => onTabChange('issues')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'issues' ? 'bg-brand-cyan text-brand-deep shadow-lg' : 'text-brand-text-sec hover:text-brand-text-pri hover:bg-brand-card/50'}`}
                >
                    📋 Issue List
                </button>
            </div>

            <div className="flex bg-brand-deep/50 rounded-lg p-1 border border-gray-200 dark:border-white/10 ml-4">
                {issueTypes.map((type, idx) => (
                    <button
                        key={idx}
                        onClick={() => onIssueTypeChange(type.raw)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${selectedIssueType === type.raw ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-brand-text-sec hover:text-brand-text-pri'}`}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <div className="ml-4 border-l border-gray-300 dark:border-gray-700 pl-4 flex items-center gap-2">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className={`flex items-center gap-2 text-xs text-brand-cyan hover:text-brand-text-pri font-medium border border-brand-cyan/30 px-3 py-1.5 rounded-lg hover:bg-brand-cyan/20 transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={`${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
                        {isRefreshing ? 'Refreshing...' : 'Sync Jira'}
                    </button>
                )}
                <button
                    onClick={onExport}
                    className="flex items-center gap-2 text-xs text-brand-cyan hover:text-brand-text-pri font-medium border border-brand-cyan/30 px-3 py-1.5 rounded-lg hover:bg-brand-cyan/20 transition-all"
                >
                    <span>📥</span> Export CSV
                </button>
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-medium border border-red-900/50 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
                >
                    <span>🗑</span> Reset
                </button>
            </div>
        </div>
    )
}
