// Statistics panel with comprehensive analytics using Chart.js
import { countries, countryKeys, legalityOptions, legalityColorMap, nodeTypes, userTypes } from '../game/config.js'
import * as policy from '../game/policy.js'
import { show, hide } from './ui-manager.js'
import { isMobile } from '../canvas/visual-constants.js'
let statisticsPanel = null
let charts = {}

// Utility functions for transaction filtering
function getTransactionsByDays(days) {
    const timeThreshold = Date.now() - (days * 1000)
    return (window.transactions || []).filter(tx => tx.issuanceDate >= timeThreshold)
}

function getTransactionsByWeeks(weeks) {
    const timeThreshold = Date.now() - (weeks * 7 * 1000) // 7 days per week at 1000ms per day
    return (window.transactions || []).filter(tx => tx.issuanceDate >= timeThreshold)
}

function getGameDayFromTimestamp(timestamp) {
    // Use consistent variable name with main.js
    const gameStart = window.startTime || (Date.now() - (30 * 1000)) // Default to 30 seconds ago
    const daysSinceStart = Math.floor((timestamp - gameStart) / 1000) // 1 day = 1 second
    return Math.max(1, daysSinceStart + 1) // Ensure at least day 1
}

function getGameWeekFromTimestamp(timestamp) {
    const gameStart = window.startTime || (Date.now() - (30 * 1000))
    const daysSinceStart = Math.floor((timestamp - gameStart) / 1000)
    const weeksSinceStart = Math.floor(daysSinceStart / 7) // 7 days per week
    return Math.max(1, weeksSinceStart + 1) // Ensure at least week 1
}
function groupTransactionsByDay(transactions, maxDays = 10) {
    const currentDay = window.currentDay || 1
    const startDay = Math.max(1, currentDay - maxDays + 1)
    const groups = Array(maxDays).fill(null).map((_, i) => ({
        day: startDay + i,
        transactions: [],
        count: 0, completed: 0, detected: 0, blocked: 0, illegal: 0, volume: 0
    }))

    // Single pass through transactions
    transactions.forEach(tx => {
        const txDay = getGameDayFromTimestamp(tx.issuanceDate)
        const dayIndex = txDay - startDay
        if (dayIndex >= 0 && dayIndex < maxDays) {
            const group = groups[dayIndex]
            group.transactions.push(tx)
            group.count++
            group.volume += tx.amount || 0

            if (tx.endReason === 'completed') group.completed++
            else if (tx.endReason === 'detected') group.detected++
            else if (tx.endReason === 'blocked') group.blocked++

            if (tx.legality === 'illegal') group.illegal++
        }
    })

    // Debug logging to help troubleshoot
    if (window.debug && transactions.length > 0) {
        console.log('groupTransactionsByDay:', {
            currentDay: currentDay,
            startDay: startDay,
            maxDays: maxDays,
            totalTransactions: transactions.length,
            groupsWithData: groups.filter(g => g.count > 0).length,
            sampleGroup: groups.find(g => g.count > 0) || groups[groups.length - 1]
        })
    }

    return groups
}

function groupTransactionsByWeek(transactions, maxWeeks = 6) {
    const currentDay = window.currentDay || 1
    const currentWeek = Math.max(1, Math.floor(currentDay / 7) + 1)
    const startWeek = Math.max(1, currentWeek - maxWeeks + 1)

    const groups = Array(maxWeeks).fill(null).map((_, i) => ({
        week: startWeek + i,
        transactions: [],
        count: 0, completed: 0, detected: 0, blocked: 0, illegal: 0, volume: 0
    }))

    // Single pass through transactions
    transactions.forEach(tx => {
        const txWeek = getGameWeekFromTimestamp(tx.issuanceDate)
        const weekIndex = txWeek - startWeek
        if (weekIndex >= 0 && weekIndex < maxWeeks) {
            const group = groups[weekIndex]
            group.transactions.push(tx)
            group.count++
            group.volume += tx.amount || 0

            if (tx.endReason === 'completed') group.completed++
            else if (tx.endReason === 'detected') group.detected++
            else if (tx.endReason === 'blocked') group.blocked++

            if (tx.legality === 'illegal') group.illegal++
        }
    })

    // Debug logging to help troubleshoot
    if (window.debug && transactions.length > 0) {
        console.log('groupTransactionsByWeek:', {
            currentDay: currentDay,
            currentWeek: currentWeek,
            startWeek: startWeek,
            maxWeeks: maxWeeks,
            totalTransactions: transactions.length,
            groupsWithData: groups.filter(g => g.count > 0).length,
            sampleGroup: groups.find(g => g.count > 0) || groups[groups.length - 1]
        })
    }

    return groups
}

function calculateWeeklyGDPData(maxWeeks = 6) {
    const currentDay = window.currentDay || 1
    const currentWeek = Math.max(1, Math.floor(currentDay / 7) + 1)
    const startWeek = Math.max(1, currentWeek - maxWeeks + 1)

    const gdpData = []

    for (let i = 0; i < maxWeeks; i++) {
        const week = startWeek + i
        const weekStartDay = (week - 1) * 7 + 1
        const weekEndDay = week * 7

        // Calculate time range for this week (in milliseconds)
        const gameStart = window.startTime || (Date.now() - (30 * 1000))
        const weekStartTime = gameStart + (weekStartDay - 1) * 1000
        const weekEndTime = gameStart + weekEndDay * 1000

        // Get transactions completed during this week
        const weekTransactions = (window.transactions || []).filter(tx =>
            !tx.active &&
            tx.endDate &&
            tx.endDate >= weekStartTime &&
            tx.endDate < weekEndTime
        )

        const weekGDP = weekTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
        gdpData.push({
            week: week,
            gdp: weekGDP,
            transactions: weekTransactions.length
        })
    }

    // Calculate growth rates
    gdpData.forEach((data, index) => {
        if (index > 0) {
            const previousGDP = gdpData[index - 1].gdp
            data.growthRate = previousGDP > 0 ? ((data.gdp - previousGDP) / previousGDP) * 100 : 0
        } else {
            data.growthRate = 0 // First week has no growth rate
        }
    })

    return gdpData
}

// Colors for consistent theming
const CHART_COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    secondary: '#6b7280',
    terciary: '#a8a8a8ff',
    accent: '#8b5cf6'
}

export function initStatistics() {
    statisticsPanel = {
        panel: document.getElementById('statistics-panel'),
        close: document.getElementById('close-statistics')
    }

    // Add panel to UI if it doesn't exist
    if (!statisticsPanel.panel) {
        createStatisticsPanel()
    }

    // Event listeners
    if (statisticsPanel.close) {
        statisticsPanel.close.addEventListener('click', hideStatistics)
    }

    // Tab switching
    document.querySelectorAll('#statistics-panel .tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchStatisticsTab(e.target.dataset.tab)
        })
    })
}

function createStatisticsPanel() {
    // Create the statistics panel HTML structure
    const panelHTML = /*html*/`
        <style>
            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            .stat-card {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #374151;
                border-radius: 8px;
                padding: 1em;
                min-height: 200px;
                max-height: 300px;
            }
            .stat-card h4 {
                margin: 0 0 10px 0;
                color: #e5e7eb;
                font-size: 12px;
                text-align: center;
            }
            .stat-card canvas {
                max-width: 100% !important;
                max-height: 180px !important;
                width: 100% !important;
                height: auto !important;
            }
            .metrics {
                padding: 2em;
            }
            .metric {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                font-size: 11px;
            }
            .metric-label {
                color: #9ca3af;
            }
            .metric-value {
                color: #e5e7eb;
                font-weight: bold;
            }
            @media (max-width: 699px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }
                .stat-card {
                    min-height: 250px;
                    max-height: 350px;
                    padding: 12px;
                }
                .stat-card h4 {
                    font-size: 14px;
                    margin-bottom: 12px;
                }
                .stat-card canvas {
                    max-height: 220px !important;
                }
                .metric {
                    font-size: 13px;
                    margin: 10px 0;
                }
            }
        </style>
        <aside id="statistics-panel" class="panel command-panel hidden">
            <div class="panel-header">
                <h2>📊 Analytics </h2>
                <button id="close-statistics" class="close-button">×</button>
            </div>
            <div class="panel-tabs">
                <button class="tab-button active" data-tab="network">Network</button>
                <button class="tab-button" data-tab="security">Security</button>
                <button class="tab-button" data-tab="economics">Economics</button>
            </div>
            <div class="panel-content">
                <div id="stats-network-tab" class="tab-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Network Status & Performance</h4>
                            <div class="metrics">
                                <div class="metric">
                                    <span class="metric-label">Active Nodes</span>
                                    <span class="metric-value" id="active-nodes-count" title="Number of currently operational financial institutions in the network">0</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Avg Corruption</span>
                                    <span class="metric-value" id="avg-corruption" title="Average corruption level across all active nodes (0-9 scale)">0%</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Avg Processing Time</span>
                                    <span class="metric-value" id="avg-processing-time" title="Average time from transaction start to completion (seconds)">0s</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">System Efficiency</span>
                                    <span class="metric-value" id="system-efficiency" title="Detection rate minus (false positive rate × 2)">0%</span>
                                </div>
                                <!-- <div class="metric">
                                    <span class="metric-label">Network Capacity</span>
                                    <span class="metric-value" id="network-capacity" title="Current transaction load as percentage of total network capacity (nodes × 100)">0%</span>
                                </div> -->
                                <div class="metric">
                                    <span class="metric-label">Transactions Processed</span>
                                    <span class="metric-value" id="total-transactions" title="Total number of transactions that have been processed by the network">0</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <h4>Cross-Border Activity</h4>
                            <canvas id="cross-border-chart"></canvas>
                        </div>
                        <div class="stat-card">
                            <h4>Weekly Transaction Volume</h4>
                            <canvas id="historical-trends-chart"></canvas>
                        </div>
                        <div class="stat-card">
                            <h4>Transaction Path Length</h4>
                            <canvas id="transaction-flow-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div id="stats-security-tab" class="tab-content hidden">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Security Summary</h4>
                        <div class="metrics">
                            <div class="metric">
                                <span class="metric-label">Detection Rate</span>
                                <span class="metric-value" id="detection-rate" title="Percentage of illegal transactions that were detected">0%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">False Positive Rate</span>
                                <span class="metric-value" id="false-positive-rate" title="Percentage of legitimate transactions incorrectly flagged as illegal">0%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Financial Institutions with Filters</span>
                                <span class="metric-value" id="nodes-with-filters" title="Number of FI that have detection filters installed">0</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Manual Actions</span>
                                <span class="metric-value" id="manual-actions" title="Number of transactions manually blocked by player">0</span>
                            </div>
                        </div>
                    </div>
                        <div class="stat-card">
                            <h4>Transactions by Risk Category</h4>
                            <canvas id="transaction-risk-chart"></canvas>
                        </div>
                        <div class="stat-card">
                            <h4>Detection Performance</h4>
                            <canvas id="detection-performance-chart"></canvas>
                        </div>
                        <div class="stat-card">
                            <h4>Detection Filter Distribution</h4>
                            <canvas id="filter-distribution-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div id="stats-economics-tab" class="tab-content hidden">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Economic Health</h4>
                            <div class="metrics">
                                <div class="metric">
                                    <span class="metric-label">Revenue/Day</span>
                                    <span class="metric-value" id="daily-revenue" title="Income generated from tax collection on completed transactions">$0</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Operating Costs</span>
                                    <span class="metric-value" id="operating-costs" title="Daily maintenance costs plus recent expenditures (filters, enforcement, compliance)">$0</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Avg Transaction Size</span>
                                    <span class="metric-value" id="avg-transaction-size" title="Average monetary value of all transactions">$0</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Tax Efficiency</span>
                                    <span class="metric-value" id="tax-efficiency" title="Percentage of potential tax revenue successfully collected">0%</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Victory Progress</span>
                                    <span class="metric-value" id="victory-progress" title="Progress toward $1M GDP economic victory condition">0%</span>
                                </div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <h4>Revenue Analysis</h4>
                            <canvas id="revenue-analysis-chart"></canvas>
                        </div>
                        <div class="stat-card">
                            <h4>Cost Breakdown (past 30 days)</h4>
                            <canvas id="cost-breakdown-chart"></canvas>
                        </div>
                        <div class="stat-card">
                            <h4>Economic Growth (GDP)</h4>
                            <canvas id="budget-trends-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    `

    document.body.insertAdjacentHTML('beforeend', panelHTML)

    // Update references
    statisticsPanel = {
        panel: document.getElementById('statistics-panel'),
        close: document.getElementById('close-statistics')
    }
}

function switchStatisticsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#statistics-panel .tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName)
    })

    // Update tab content
    const tabs = ['network', 'security', 'economics']
    tabs.forEach(tab => {
        const tabElement = document.getElementById(`stats-${tab}-tab`)
        if (tabElement) {
            if (tab === tabName) {
                show(tabElement)
                tabElement.classList.remove('hidden')
            } else {
                hide(tabElement)
                tabElement.classList.add('hidden')
            }
        }
    })

    // Update charts for the active tab
    updateChartsForTab(tabName)
}

export function showStatistics() {
    if (!statisticsPanel || !statisticsPanel.panel) {
        initStatistics()
    }

    show(statisticsPanel.panel)

    // Small delay to ensure panel is visible before creating charts
    setTimeout(() => {
        initializeAllCharts()
        updateAllCharts()
    }, 100)
}

export function hideStatistics() {
    if (statisticsPanel && statisticsPanel.panel) {
        hide(statisticsPanel.panel)
    }
}

// Historical data collection removed - now using direct transaction array filtering

// Cache for expensive calculations
let cachedMetrics = null
let lastCacheTime = 0
const CACHE_DURATION = 2000 // 1 second cache

function analyzeCurrentGameState() {
    const now = Date.now()
    if (cachedMetrics && (now - lastCacheTime) < CACHE_DURATION) {
        return cachedMetrics
    }

    const transactions = window.transactions || []
    const nodes = window.activeNodes || []
    const users = window.activeUsers || []

    // Pre-calculate cross-border data once
    const crossBorderCount = transactions.filter(tx =>
        tx.sourceUser?.country !== tx.targetUser?.country
    ).length

    // Transaction analysis with single pass
    const legalityCount = { legit: 0, questionable: 0, illegal: 0 }
    const endReasonCount = { completed: 0, detected: 0, blocked: 0, lost: 0, falsePositive: 0 }
    const sizeCount = { small: 0, medium: 0, large: 0 }
    const countryStats = {}
    const userTypeStats = {}
    const nodeTypeStats = {}

    // Initialize country stats
    countryKeys.forEach(country => {
        countryStats[country] = { total: 0, illegal: 0, detected: 0, volume: 0 }
    })

    // Initialize user type stats
    Object.keys(userTypes).forEach(type => {
        userTypeStats[type] = { total: 0, illegal: 0 }
    })

    // Initialize node type stats
    Object.keys(nodeTypes).forEach(type => {
        nodeTypeStats[type] = { total: 0, detected: 0, avgCorruption: 0, count: 0 }
    })

    // Analyze transactions
    transactions.forEach(tx => {
        legalityCount[tx.legality]++
        sizeCount[tx.size]++

        if (tx.endReason) {
            endReasonCount[tx.endReason]++
        }

        // Country analysis
        if (tx.sourceUser && tx.sourceUser.country && countryStats[tx.sourceUser.country]) {
            countryStats[tx.sourceUser.country].total++
            countryStats[tx.sourceUser.country].volume += tx.amount || 0
            if (tx.legality === 'illegal') {
                countryStats[tx.sourceUser.country].illegal++
            }
            if (tx.endReason === 'detected') {
                countryStats[tx.sourceUser.country].detected++
            }
        }

        // User type analysis
        if (tx.sourceUser && tx.sourceUser.type && userTypeStats[tx.sourceUser.type]) {
            userTypeStats[tx.sourceUser.type].total++
            if (tx.legality === 'illegal') {
                userTypeStats[tx.sourceUser.type].illegal++
            }
        }
    })

    // Analyze nodes
    nodes.forEach(node => {
        if (nodeTypeStats[node.type]) {
            nodeTypeStats[node.type].count++
            nodeTypeStats[node.type].total += node.receivedAmount || 0
            nodeTypeStats[node.type].detected += node.detectedAmount || 0
            nodeTypeStats[node.type].avgCorruption += node.corruption || 0
        }
    })

    // Calculate averages for node types
    Object.keys(nodeTypeStats).forEach(type => {
        const stats = nodeTypeStats[type]
        if (stats.count > 0) {
            stats.avgCorruption = stats.avgCorruption / stats.count
        }
    })

    // Calculate metrics
    const totalTransactions = Object.values(legalityCount).reduce((sum, count) => sum + count, 0)
    const illegalTransactions = legalityCount.illegal
    const detectedTransactions = endReasonCount.detected
    const falsePositives = endReasonCount.falsePositive

    const detectionRate = illegalTransactions > 0 ? Math.min(100, (detectedTransactions / illegalTransactions) * 100) : 0
    const falsePositiveRate = totalTransactions > 0 ? Math.min(100, (falsePositives / totalTransactions) * 100) : 0
    const avgCorruption = nodes.length > 0 ? nodes.reduce((sum, node) => sum + (node.corruption || 0), 0) / nodes.length : 0

    // Validate all calculated values
    const safeDetectionRate = isFinite(detectionRate) ? detectionRate : 0
    const safeFalsePositiveRate = isFinite(falsePositiveRate) ? falsePositiveRate : 0
    const safeAvgCorruption = isFinite(avgCorruption) ? avgCorruption : 0

    cachedMetrics = {
        totalTransactions,
        legalityCount,
        endReasonCount,
        sizeCount,
        countryStats,
        userTypeStats,
        nodeTypeStats,
        detectionRate: safeDetectionRate,
        falsePositiveRate: safeFalsePositiveRate,
        avgCorruption: safeAvgCorruption,
        activeNodes: nodes.length,
        activeUsers: users.length,
        budget: window.budget || 0,
        maintenance: window.maintenance || 0,
        popularity: policy.popularity || 0,
        crossBorderCount // Pre-calculated value
    }

    lastCacheTime = now
    return cachedMetrics
}

function initializeAllCharts() {
    // Economics charts
    initChart('revenue-analysis-chart', 'line')
    initChart('cost-breakdown-chart', 'pie')
    initChart('budget-trends-chart', 'line')

    // Network charts
    initChart('cross-border-chart', 'pie')
    initChart('historical-trends-chart', 'line')
    initChart('transaction-flow-chart', 'bar')

    // Security charts
    initChart('transaction-risk-chart', 'doughnut')
    initChart('detection-performance-chart', 'bar')
    initChart('filter-distribution-chart', 'pie')
}

function initChart(chartId, type) {
    const canvas = document.getElementById(chartId)
    if (!canvas) return

    // Set fixed canvas dimensions to prevent expansion
    canvas.style.maxWidth = '100%'
    canvas.style.maxHeight = '180px'
    canvas.width = 300
    canvas.height = 180

    const ctx = canvas.getContext('2d')

    // Destroy existing chart if it exists
    if (charts[chartId]) {
        charts[chartId].destroy()
    }

    const config = getChartConfig(chartId, type)
    charts[chartId] = new Chart(ctx, config)
}

function getChartConfig(chartId, type) {
    const baseConfig = {
        type: type,
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            layout: {
                padding: 0,
                paddingTop: 20
            },
            plugins: {
                legend: {
                    display: false,
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            hover: {
                animationDuration: 0
            },
            scales: type === 'line' || type === 'bar' ? {
                x: {
                    ticks: {
                        color: '#9ca3af',
                        font: { size: isMobile ? 11 : 9 }
                    },
                    grid: { color: '#374151' }
                },
                y: {
                    ticks: {
                        color: '#9ca3af',
                        font: { size: isMobile ? 11 : 9 }
                    },
                    grid: { color: '#374151' }
                }
            } : {},
            animation: false
        }
    }

    // Customize specific chart configurations
    switch (chartId) {
        case 'historical-trends-chart':
            baseConfig.options.interaction = { intersect: false }
            baseConfig.options.elements = { point: { radius: 2 } }
            break
        case 'budget-trends-chart':
            // GDP chart with logarithmic scale
            baseConfig.options.interaction = { intersect: false }
            baseConfig.options.elements = { point: { radius: 3 } }
            baseConfig.options.scales = {
                y: {
                    type: 'logarithmic',
                    display: true,
                    // title: { display: true, text: 'GDP ($) - Log Scale', color: '#9ca3af' },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 10 },
                        callback: function (value) {
                            // Format as currency with K/M abbreviations
                            if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M'
                            if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K'
                            return '$' + value
                        }
                    },
                    grid: { color: '#374151' },
                    min: 1, // Start from $1 to avoid log(0) issues
                    max: 10000000 // Go beyond victory target for better visualization
                }
            }
            break
        case 'threat-distribution-chart':
            baseConfig.options.scales = {
                r: {
                    ticks: { color: '#9ca3af', font: { size: 8 } },
                    grid: { color: '#374151' }
                }
            }
            break
        case 'cross-border-chart':
            baseConfig.options.plugins.legend = {
                display: true,
                labels: { color: '#e5e7eb', font: { size: isMobile ? 10 : 8 } },
                position: 'bottom',
            }
            break
        case 'transaction-risk-chart':
            baseConfig.options.plugins.legend = {
                display: true,
                labels: { color: '#e5e7eb', font: { size: isMobile ? 10 : 8 } },
                position: 'bottom',
            }
            break
        case 'filter-distribution-chart':
            baseConfig.options.plugins.legend = {
                display: true,
                labels: { color: '#e5e7eb', font: { size: isMobile ? 10 : 8 } },
                position: 'bottom',
            }
            break
        case 'cost-breakdown-chart':
            baseConfig.options.plugins.legend = {
                display: true,
                labels: { color: '#e5e7eb', font: { size: isMobile ? 10 : 8 } },
                position: 'bottom',
            }
            break

    }

    return baseConfig
}

function updateAllCharts() {
    const analysis = analyzeCurrentGameState()

    // Only update the currently active tab to improve performance
    const activeTab = document.querySelector('#statistics-panel .tab-button.active')
    const activeTabName = activeTab ? activeTab.dataset.tab : 'network'

    updateChartsForTab(activeTabName, analysis)
}

function updateChartsForTab(tabName, analysis = null) {
    if (!analysis) {
        analysis = analyzeCurrentGameState()
    }

    switch (tabName) {
        case 'economics':
            updateEconomicsCharts(analysis)
            break
        case 'network':
            updateNetworkCharts(analysis)
            break
        case 'security':
            updateSecurityCharts(analysis)
            break
    }
}

function updateNetworkCharts(analysis) {
    // Cross-Border Activity Chart
    if (charts['cross-border-chart']) {
        const crossBorderCount = (window.transactions || []).filter(tx =>
            tx.sourceUser?.country !== tx.targetUser?.country
        ).length
        const domesticCount = analysis.totalTransactions - crossBorderCount

        charts['cross-border-chart'].data = {
            labels: ['Domestic', 'Cross-Border'],
            datasets: [{
                data: [domesticCount, analysis.crossBorderCount],
                backgroundColor: [CHART_COLORS.primary, CHART_COLORS.accent]
            }]
        }
        charts['cross-border-chart'].update('none')
    }

    // Weekly Transaction Volume Chart (showing new transactions per week)
    if (charts['historical-trends-chart']) {
        const chart = charts['historical-trends-chart']
        const transactions = window.transactions || []

        // Only process if we have transactions, otherwise show empty chart
        if (transactions.length > 0) {
            const maxWeeks = 6 // Show last 6 weeks for better averaging
            const weeklyTxData = groupTransactionsByWeek(getTransactionsByWeeks(maxWeeks), maxWeeks)
            const currentDay = window.currentDay || 1
            const currentWeek = Math.max(1, Math.floor(currentDay / 7) + 1)
            const startWeek = Math.max(1, currentWeek - maxWeeks + 1)

            // Create labels and data from actual transaction groupings
            const labels = weeklyTxData.map((_, index) => `Week ${startWeek + index}`)
            const weeklyNewTransactions = weeklyTxData.map(weekData => weekData.count || 0)

            // Debug logging for development
            if (window.debug) {
                console.log('Weekly Chart Debug:', {
                    currentDay: window.currentDay,
                    currentWeek: currentWeek,
                    startTime: window.startTime,
                    transactionCount: transactions.length,
                    weeklyTxData: weeklyTxData.slice(-2), // Last 2 weeks
                    labels: labels.slice(-2),
                    data: weeklyNewTransactions.slice(-2)
                })
            }

            chart.data.labels = labels
            chart.data.datasets = [
                {
                    label: 'Weekly New Transactions',
                    data: weeklyNewTransactions,
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primary + '40',
                    tension: 0.3,
                    fill: true
                }
            ]
        } else {
            // Show placeholder data when no transactions exist
            chart.data.labels = ['Week 1', 'Week 2', 'Week 3']
            chart.data.datasets = [
                {
                    label: 'Weekly New Transactions',
                    data: [0, 0, 0],
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primary + '40',
                    tension: 0.3,
                    fill: true
                }
            ]
        }
        chart.update('none')
    }

    // Transaction Flow Analysis Chart (shows transaction paths)
    if (charts['transaction-flow-chart']) {
        const chart = charts['transaction-flow-chart']
        const transactions = window.transactions || []
        const pathLengths = { 'Direct': 0, 'Short (1-2)': 0, 'Medium (3-4)': 0, 'Long (5+)': 0 }

        transactions.forEach(tx => {
            if (tx.path) {
                const pathLength = tx.path.length
                if (pathLength <= 2) pathLengths['Direct']++
                else if (pathLength <= 4) pathLengths['Short (1-2)']++
                else if (pathLength <= 6) pathLengths['Medium (3-4)']++
                else pathLengths['Long (5+)']++
            }
        })

        chart.data.labels = Object.keys(pathLengths)
        chart.data.datasets[0] = {
            label: 'Transaction Count',
            data: Object.values(pathLengths),
            backgroundColor: [
                CHART_COLORS.success,
                CHART_COLORS.primary,
                CHART_COLORS.warning,
                CHART_COLORS.danger
            ]
        }
        chart.update('none')
    }

    // Update network metrics
    updateElement('active-nodes-count', analysis.activeNodes)
    updateElement('avg-corruption', Math.round(analysis.avgCorruption) + '%')
    updateElement('total-transactions', analysis.totalTransactions)

    // Calculate and update performance metrics with safe fallbacks
    const transactions = window.transactions || []
    const completedTransactions = transactions.filter(tx => tx.endDate && tx.issuanceDate)

    let avgProcessingTime = 0
    if (completedTransactions.length > 0) {
        const totalTime = completedTransactions.reduce((sum, tx) => sum + (tx.endDate - tx.issuanceDate), 0)
        avgProcessingTime = totalTime / completedTransactions.length / 1000 // Convert to seconds
    }

    const systemEfficiency = Math.max(0, analysis.detectionRate - (analysis.falsePositiveRate * 2))
    // TODO revisit this idea of effiency
    // const totalCapacity = analysis.activeNodes * 100 /
    // const networkCapacity = totalCapacity > 0 ? Math.min(100, (analysis.totalTransactions / totalCapacity) * 100) : 0

    // Update with safe fallbacks for NaN values
    updateElement('avg-processing-time', isNaN(avgProcessingTime) ? '0s' : Math.round(avgProcessingTime) + 's')
    updateElement('system-efficiency', isNaN(systemEfficiency) ? '0%' : Math.round(systemEfficiency) + '%')
    // updateElement('network-capacity', isNaN(networkCapacity) ? '0%' : Math.round(networkCapacity) + '%')
}

function updateSecurityCharts(analysis) {
    // Transaction Risk Categories Chart (only active transactions)
    if (charts['transaction-risk-chart']) {
        const activeTransactions = (window.transactions || []).filter(tx => tx.active)
        const activeLegalityCount = { legit: 0, questionable: 0, illegal: 0 }

        activeTransactions.forEach(tx => {
            if (activeLegalityCount.hasOwnProperty(tx.legality)) {
                activeLegalityCount[tx.legality]++
            }
        })

        const chart = charts['transaction-risk-chart']
        chart.data.labels = ['Legitimate', 'Questionable', 'Illegal']
        chart.data.datasets[0] = {
            data: [activeLegalityCount.legit, activeLegalityCount.questionable, activeLegalityCount.illegal],
            backgroundColor: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger]
        }
        chart.update('none')
    }

    // Detection Performance
    if (charts['detection-performance-chart']) {
        charts['detection-performance-chart'].data = {
            labels: ['Detected', 'Blocked', 'False Positives', 'Missed'],
            datasets: [{
                label: 'Count',
                data: [
                    analysis.endReasonCount.detected,
                    analysis.endReasonCount.blocked,
                    analysis.endReasonCount.falsePositive,
                    analysis.legalityCount.illegal - analysis.endReasonCount.detected - analysis.endReasonCount.blocked
                ],
                backgroundColor: [CHART_COLORS.success, CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.danger]
            }]
        }
        charts['detection-performance-chart'].update('none')
    }

    // Filter Distribution Chart
    if (charts['filter-distribution-chart']) {
        const nodes = window.activeNodes || []
        const filterTypes = {}
        let noFilterCount = 0

        nodes.forEach(node => {
            if (node.tower) {
                const filterName = node.tower.charAt(0).toUpperCase() + node.tower.slice(1)
                filterTypes[filterName] = (filterTypes[filterName] || 0) + 1
            } else {
                noFilterCount++
            }
        })

        const labels = [...Object.keys(filterTypes), 'No Filter']
        const data = [...Object.values(filterTypes), noFilterCount]

        charts['filter-distribution-chart'].data = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    CHART_COLORS.secondary,
                    CHART_COLORS.terciary,
                    CHART_COLORS.primary,
                    CHART_COLORS.warning,
                    CHART_COLORS.accent,
                ]
            }]
        }
        charts['filter-distribution-chart'].update('none')
    }

    // Update security metrics
    const nodesWithFilters = (window.activeNodes || []).filter(node => node.tower).length
    const manualActions = analysis.endReasonCount.blocked || 0

    updateElement('detection-rate', Math.round(analysis.detectionRate) + '%')
    updateElement('false-positive-rate', Math.round(analysis.falsePositiveRate) + '%')
    updateElement('nodes-with-filters', nodesWithFilters)
    updateElement('manual-actions', manualActions)
}

// Removed unused updateGeographyCharts function

// Removed unused updateRegionalInsights function

function updateEconomicsCharts(analysis) {
    // Revenue Analysis (Daily Income) - using direct transaction filtering
    if (charts['revenue-analysis-chart']) {
        const maxWeeks = 6 // Use weekly data for consistency
        const weeklyRevenue = groupTransactionsByWeek(getTransactionsByWeeks(maxWeeks), maxWeeks)
        const currentDay = window.currentDay || 1
        const currentWeek = Math.max(1, Math.floor(currentDay / 7) + 1)
        const startWeek = Math.max(1, currentWeek - maxWeeks + 1)

        // Create labels and calculate weekly tax income
        const labels = weeklyRevenue.map((_, index) => `Week ${startWeek + index}`)
        const weeklyIncomes = weeklyRevenue.map(weekData => {
            // Calculate weekly tax income from transactions
            const taxRate = policy.getTaxRate ? policy.getTaxRate() : 0.1
            return weekData.transactions.reduce((sum, tx) => sum + (tx.amount * taxRate), 0)
        })

        charts['revenue-analysis-chart'].data = {
            labels: labels,
            datasets: [{
                label: 'Weekly Income',
                data: weeklyIncomes,
                borderColor: CHART_COLORS.success,
                backgroundColor: CHART_COLORS.success + '40',
                tension: 0.3,
                fill: true
            }]
        }
        charts['revenue-analysis-chart'].update('none')
    }

    // Cost Breakdown - show actual costs only
    if (charts['cost-breakdown-chart']) {
        const towerCosts = Math.abs(analysis.maintenance) || 0  // Actual tower maintenance

        // Calculate expenditures over the past 30 days (30 seconds at 1000ms per day)
        const thirtyDaysAgo = Date.now() - (30 * 1000)
        const recentExpenditures = (window.expenditures || []).filter(exp => exp.timestamp >= thirtyDaysAgo)

        // Group expenditures by type
        const expendituresByType = {}
        recentExpenditures.forEach(exp => {
            if (!expendituresByType[exp.type]) {
                expendituresByType[exp.type] = 0
            }
            expendituresByType[exp.type] += exp.cost
        })

        // Only show costs that actually exist
        const costs = []
        const labels = []
        const colors = []

        // Add tower maintenance (ongoing cost)
        if (towerCosts > 0) {
            costs.push(towerCosts)
            labels.push('Filter Maintenance')
            colors.push(CHART_COLORS.warning)
        }

        // Add expenditures from past 30 days
        if (expendituresByType.tower > 0) {
            costs.push(expendituresByType.tower)
            labels.push('Filter Installations')
            colors.push(CHART_COLORS.primary)
        }

        if (expendituresByType.enforcement > 0) {
            costs.push(expendituresByType.enforcement)
            labels.push('Enforcement Actions')
            colors.push(CHART_COLORS.danger)
        }

        if (expendituresByType.compliance > 0) {
            costs.push(expendituresByType.compliance)
            labels.push('Compliance Measures')
            colors.push(CHART_COLORS.accent)
        }

        // Handle empty state
        if (costs.length === 0) {
            costs.push(1)
            labels.push('No Operating Costs')
            colors.push(CHART_COLORS.secondary)
        }

        charts['cost-breakdown-chart'].data = {
            labels: labels,
            datasets: [{
                data: costs,
                backgroundColor: colors
            }]
        }
        charts['cost-breakdown-chart'].update('none')
    }

    // Economic Growth Progress Chart - GDP progress toward victory and growth rate
    if (charts['budget-trends-chart']) {
        const gdpData = calculateWeeklyGDPData(6) // 6 weeks of data
        const currentGDP = window.gdp || 0
        const victoryTarget = 1000000

        if (gdpData.length > 0) {
            const labels = gdpData.map(data => `Week ${data.week}`)
            const gdpValues = gdpData.map(data => Math.max(1, data.gdp)) // Ensure minimum of 1 for log scale

            // Add current GDP as the latest data point
            labels[labels.length - 1] = `Week ${gdpData[gdpData.length - 1].week}`
            gdpValues[gdpValues.length - 1] = Math.max(1, Math.max(gdpValues[gdpValues.length - 1], currentGDP))

            charts['budget-trends-chart'].data = {
                labels: labels,
                datasets: [
                    {
                        label: 'GDP ($)',
                        data: gdpValues,
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: CHART_COLORS.primary + '40',
                        tension: 0.3,
                        fill: true
                    }
                ]
            }

            // Debug logging for development
            if (window.debug) {
                console.log('Economic Growth Chart Debug:', {
                    currentGDP: currentGDP,
                    victoryProgress: ((currentGDP / victoryTarget) * 100).toFixed(1) + '%',
                    gdpData: gdpData.slice(-2), // Last 2 weeks
                    labels: labels.slice(-2),
                    gdpValues: gdpValues.slice(-2)
                })
            }
        } else {
            // Empty state
            charts['budget-trends-chart'].data = {
                labels: ['Week 1', 'Week 2', 'Week 3'],
                datasets: [
                    {
                        label: 'GDP ($)',
                        data: [1, 1, Math.max(1000, currentGDP)], // Use 1000 as minimum for log scale
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: CHART_COLORS.primary + '40',
                        tension: 0.3,
                        fill: true
                    }
                ]
            }
        }

        charts['budget-trends-chart'].update('none')
    }

    // Update economic metrics with safe fallbacks
    const recentTransactions = getTransactionsByDays(1)
    const taxRate = policy.getTaxRate ? policy.getTaxRate() : 0.1
    const dailyRevenue = recentTransactions.reduce((sum, tx) => sum + (tx.amount * taxRate), 0)

    // Calculate average transaction size with fallback
    const transactions = window.transactions || []
    const avgTransactionSize = transactions.length > 0 ?
        transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0) / transactions.length : 0

    // Calculate tax efficiency with safe division
    const totalTransactionValue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
    const actualRevenue = Math.max(0, dailyRevenue)
    const taxEfficiency = totalTransactionValue > 0 ? (actualRevenue / (totalTransactionValue * taxRate)) * 100 : 0

    // Calculate budget peak
    const budgetPeak = window.budget || 0

    // Calculate operating costs including recent expenditures (past day = 1000ms)
    const oneDayAgo = Date.now() - 1000
    const dailyExpenditures = (window.expenditures || [])
        .filter(exp => exp.timestamp >= oneDayAgo)
        .reduce((sum, exp) => sum + exp.cost, 0)
    const totalOperatingCosts = Math.abs(analysis.maintenance) + dailyExpenditures

    // Calculate victory progress toward $1M GDP goal
    const currentGDP = window.gdp || 0
    const victoryTarget = 1000000
    const victoryProgress = Math.min(100, (currentGDP / victoryTarget) * 100)

    updateElement('daily-revenue', '$' + Math.round(Math.max(0, dailyRevenue)))
    updateElement('operating-costs', '$' + Math.round(totalOperatingCosts))
    updateElement('avg-transaction-size', '$' + Math.round(avgTransactionSize))
    updateElement('tax-efficiency', Math.round(Math.min(100, taxEfficiency)) + '%')
    updateElement('victory-progress', Math.round(victoryProgress) + '%')
}

// Removed large unused functions (over 300 lines): 
// - updatePerformanceCharts, updatePerformanceMetrics, updatePlayerProfile
// - updateRegionalInsights, updateStrategicAssessment 
// These functions were not called from any active code path

function updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) {
        // Sanitize value and handle edge cases
        let safeValue = value
        if (value === null || value === undefined) {
            safeValue = '0'
        } else if (typeof value === 'number') {
            if (isNaN(value) || !isFinite(value)) {
                safeValue = '0'
            } else {
                safeValue = value.toString()
            }
        }
        element.innerHTML = safeValue
    }
}

// Track last update time to throttle updates
let lastUpdateTime = 0
const UPDATE_INTERVAL = 7000 // Update every 7 seconds instead of every frame

// Update statistics periodically during gameplay
export function updateStatistics() {
    const now = Date.now()

    // Only update if panel is visible and enough time has passed
    if (statisticsPanel &&
        !statisticsPanel.panel.classList.contains('hidden') &&
        now - lastUpdateTime > UPDATE_INTERVAL) {

        lastUpdateTime = now

        // Use requestAnimationFrame to avoid blocking the main thread
        requestAnimationFrame(() => {
            updateAllCharts()
        })
    }
}
