// Module for pure UI management. 
import { towerOptions, actionOptions, countries, legalityOptions, legalityColorMap } from './config.js'
import * as tech from './tech.js'
import { uiFont } from './graphics.js'

let indicators = null
let controls = null
let instructions = null
let nodeDetails = null
let policy = null
let research = null
let userDetails = null
let analytics = null
let panels = null

let selectedNode = null

export function initUI() {
    indicators = {
        budget: document.getElementById('budget'),
        gdp: document.getElementById('gdp'),
        maintenance: document.getElementById('maintenance'),
        day: document.getElementById('day'),
        holiday: document.getElementById('holiday')
    }

    controls = {
        centerBtn: document.getElementById('center-view'),
        debugBtn: document.getElementById('toggle-debug'),
        countriesBtn: document.getElementById('toggle-countries'),
        slowBtn: document.getElementById('slow'),
        normalBtn: document.getElementById('normal'),
        fastBtn: document.getElementById('fast'),
        restartBtn: document.getElementById('restart-game'),
        gdpStatItem: document.getElementById('gdp-stat-item'),
        maintenanceStatItem: document.getElementById('maintenance-stat-item'),
        debugControls: document.getElementById('debug-controls'),
        policyBtn: document.getElementById('policy-button'),
        gameControls: document.getElementById('game-controls')
    }

    instructions = {
        panel: document.getElementById('instructions'),
        toggle: document.getElementById('toggle-instructions'),
        close: document.getElementById('close-instructions')
    }

    instructions.toggle.addEventListener('click', togglePanel('instructions'))
    instructions.close.addEventListener('click', togglePanel('instructions'))

    document.getElementById('restart-tutorial').addEventListener('click', () => {
        import('./tutorial.js').then(tutorial => {
            tutorial.resetTutorial()
        })
    })

    nodeDetails = {
        panel: document.getElementById('node-details-panel'),
        title: document.getElementById('panel-title'),
        countryName: document.getElementById('country-name'),
        type: document.getElementById('panel-type'),
        corruption: document.getElementById('panel-corruption'),
        received: document.getElementById('panel-received'),
        detected: document.getElementById('panel-detected'),
        reputationBar: document.getElementById('reputation-bar'),
        reputationValue: document.getElementById('reputation-value'),
        towerOptions: document.getElementById('tower-options'),
        actionOptions: document.getElementById('action-options'),
        close: document.getElementById('close-panel')
    }

    nodeDetails.close.addEventListener('click', hideNodeDetails)

    // User details panel
    userDetails = {
        panel: document.getElementById('user-details-panel'),
        name: document.getElementById('user-name'),
        country: document.getElementById('user-country'),
        type: document.getElementById('user-type'),
        userTransactions: document.getElementById('user-transactions'),
        close: document.getElementById('close-user-panel')
    }

    userDetails.close.addEventListener('click', () => hide(userDetails.panel))

    policy = {
        panel: document.getElementById('policy-panel'),

    }
    research = {
        panel: document.getElementById('research-panel'),
    }

    analytics = {
        panel: document.getElementById('gdp-panel'),
        close: document.getElementById('close-gdp'),
        chart: document.getElementById('gdp-chart'),
        chartContainer: document.getElementById('gdp-chart-container'),
        volumeBtn: document.getElementById('volume-btn'),
        countBtn: document.getElementById('count-btn'),
        chartTab: document.getElementById('chart-tab'),
        transactionsTab: document.getElementById('transactions-tab'),
        chartSection: document.getElementById('chart-section'),
        transactionsSection: document.getElementById('transactions-section'),
        allTransactions: document.getElementById('all-transactions'),
        currentView: 'volume',
        currentTab: 'transactions'
    }


    if (analytics.close) {
        analytics.close.addEventListener('click', () => hide(analytics.panel))
    }

    if (analytics.volumeBtn && analytics.countBtn) {
        analytics.volumeBtn.addEventListener('click', () => switchGDPView('volume'))
        analytics.countBtn.addEventListener('click', () => switchGDPView('count'))
    }

    if (analytics.chartTab && analytics.transactionsTab) {
        analytics.chartTab.addEventListener('click', () => switchAnalyticsTab('chart'))
        analytics.transactionsTab.addEventListener('click', () => switchAnalyticsTab('transactions'))
    }

    // Make GDP stat item clickable
    const gdpStatItem = document.getElementById('gdp-stat-item')
    if (gdpStatItem) {
        gdpStatItem.style.cursor = 'pointer'
        gdpStatItem.addEventListener('click', (e) => {
            e.stopPropagation()
            showGDPPanel()
        })
    }

    // helper array for iterations on panels
    panels = [
        nodeDetails.panel,
        instructions.panel,
        policy.panel,
        research.panel,
        userDetails.panel,
        analytics.panel
    ]
}

export function isClickInsideAnyPanel({ clientX, clientY }) {
    return panels.some(panel => {
        if (!panel || panel.classList.contains('hidden')) return false
        const rect = panel.getBoundingClientRect()
        return clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom
    })
}

export function closeAllPanels(exceptPanel) {
    const exceptId = exceptPanel?.id || null;
    panels.forEach(panel => {
        if (panel && !panel.classList.contains('hidden') && panel.id !== exceptId) {
            if (panel.id === 'node-details-panel') {
                hideNodeDetails()
            } else {
                hide(panel)
            }
        }
    });
}

export function updateIndicators(budget, gdp, maintenance) {
    indicators.budget.textContent = budget.toFixed(0);
    indicators.gdp.textContent = gdp.toFixed(0);
    indicators.maintenance.textContent = maintenance;
}

export function updateDate(day, holiday) {
    indicators.day.textContent = day;
    indicators.holiday.textContent = holiday ? ' 🎉' : '';
}

export function showToast(title, message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast ${type}`

    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `
    const toastContainer = document.getElementById('toast-container')
    toastContainer.appendChild(toast)

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show')
    }, 10)

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show')
        setTimeout(() => {
            toast.remove()
        }, 300)
    }, 4000)
}

export function togglePanel(panelId, updateCallback = null) {
    return function (e) {
        if (e) e.stopPropagation()
        const panel = document.getElementById(panelId)
        closeAllPanels(panel)
        panel.classList.toggle('hidden')

        if (!panel.classList.contains('hidden') && updateCallback) {
            updateCallback()
        }
    }
}


export function showNodeDetails(node, budget, placeTower, enforceAction) {
    selectedNode = node
    nodeDetails.title.textContent = node.name
    nodeDetails.type.textContent = node.type.charAt(0).toUpperCase() + node.type.slice(1)
    nodeDetails.corruption.textContent = node.corruption
    nodeDetails.received.textContent = node.receivedAmount
    nodeDetails.detected.textContent = node.detectedAmount

    nodeDetails.reputationValue.textContent = node.reputation.toFixed(0)
    nodeDetails.reputationBar.style.width = node.reputation + '%'

    // Set reputation bar color
    if (node.reputation > 70) {
        nodeDetails.reputationBar.className = 'bar-fill good'
    } else if (node.reputation > 30) {
        nodeDetails.reputationBar.className = 'bar-fill medium'
    } else {
        nodeDetails.reputationBar.className = 'bar-fill poor'
    }
    nodeDetails.countryName.textContent = countries[node.country].name + ' ' + countries[node.country].flag
    nodeDetails.countryName.title = countries[node.country].description

    updateTowerOptions(node, budget, placeTower)
    updateActionOptions(node, budget, enforceAction)
    // Todo: harmonize display
    show(nodeDetails.panel)
    return selectedNode
}

function updateActionOptions(node, budget, enforceAction) {
    nodeDetails.actionOptions.innerHTML = ''
    let foundOption = false

    // Get research progress
    const progress = tech.getResearchProgress();

    Object.keys(actionOptions).forEach(actionType => {
        // Check if technology requirement is met
        const techRequirement = actionOptions[actionType].techRequirement
        const techUnlocked = !techRequirement || progress[techRequirement]?.researched;

        // Only show actions that have been unlocked through research
        if (techUnlocked) {
            createActionButton(actionType, node, budget, enforceAction);
            foundOption = true;
        }
    })
    if (!foundOption) {
        const maxMessage = document.createElement('div')
        maxMessage.className = 'max-tier'
        maxMessage.textContent = `No actions available`
        nodeDetails.actionOptions.appendChild(maxMessage)
    }
}

function createButtonTemplate(icon, name, cost, maintenance, duration, description, disabled) {
    const costText = `💰${cost}`
    const maintenanceText = maintenance ? `, 🛠️ -${maintenance}` : ''
    const durationText = duration ? `, ⏱️ ${duration}` : ''

    const button = document.createElement('button')
    button.disabled = disabled
    button.innerHTML = `
        <span class="option-icon">${icon}</span>
        <div class="option-info">   
            <div class="option-name">${name} (${costText}${maintenanceText}${durationText})</div>
            <div class="option-desc">${description}</div>
        </div>
    `
    return button
}

function createActionButton(actionType, node, budget, enforceAction) {
    const action = actionOptions[actionType]
    // compute effective enforcement cost based on tech bonus
    const effectiveCost = Math.ceil(action.cost * tech.bonus.enforcementCost)
    const disabled = (budget < effectiveCost) || node.enforcementAction

    const button = createButtonTemplate(
        action.icon, action.name, effectiveCost, null, action.duration, action.description, disabled
    )
    button.className = 'option-button'
    button.onclick = (e) => {
        if (budget >= effectiveCost) {
            enforceAction(node, actionType)
            showToast(action.name + ' launched', 'Action executed at ' + node.name, 'info')
            e.currentTarget.disabled = true
        }
    }

    nodeDetails.actionOptions.appendChild(button)
}

function updateTowerOptions(node, budget, placeTower) {
    nodeDetails.towerOptions.innerHTML = ''
    const progress = tech.getResearchProgress();


    let foundOption = false;
    Object.keys(towerOptions).forEach(towerType => {
        // Check if this tower depends on the current tower and is not already installed
        const validUpgrade = towerOptions[towerType].depend === node.tower && node.tower !== towerType;

        // Check if technology requirement is met (if any)
        const techRequirement = towerOptions[towerType].techRequirement
        const techUnlocked = !techRequirement || progress[techRequirement]?.researched;

        // Only show options that are valid upgrades and have their tech requirements met
        if (validUpgrade && techUnlocked) {
            createTowerButton(towerType, node, budget, placeTower);
            foundOption = true;
        }
    })
    if (!foundOption) {
        const maxMessage = document.createElement('div')
        maxMessage.className = 'max-tier'
        maxMessage.textContent = `Maximum filter already installed` //${towerOptions[node.tower].name}
        nodeDetails.towerOptions.appendChild(maxMessage)
    }
}

function createTowerButton(towerType, node, budget, placeTower) {
    const tower = towerOptions[towerType]
    const disabled = budget < tower.cost

    const button = createButtonTemplate(
        tower.icon, tower.name, tower.cost, tower.maintenance, null, tower.description, disabled
    )
    button.className = 'option-button'
    button.onclick = () => {
        if (budget >= tower.cost) {
            placeTower(node, towerType)
        }
    }

    nodeDetails.towerOptions.appendChild(button)
}

export function hideNodeDetails() {
    hide(nodeDetails.panel)
    selectedNode = null
    return selectedNode
}

function formatTransactionList(transactions, userId = null) {
    const emptyMessage = 'No transactions found'

    if (!transactions || transactions.length === 0) {
        return `<div class="no-transactions">${emptyMessage}</div>`
    }

    return transactions.map(tx => {
        const statusColor = legalityColorMap[tx.legality]

        let displayContent = `<div class="transaction-amount" style="color: ${statusColor}">$${tx.amount}</div>`

        if (userId) {
            // User-specific view: show counterparty and direction
            let counterparty, arrow
            if (tx.path[0] === userId) {
                counterparty = window.users?.find(u => u.id === tx.path[tx.path.length - 1])
                arrow = '→'
            } else {
                counterparty = window.users?.find(u => u.id === tx.path[0])
                arrow = '←'
            }
            displayContent += `
                <div class="transaction-counterparty">${arrow} ${counterparty?.name}</div>
            `
        } else {
            // All transactions view: show sender → receiver
            const sender = window.users?.find(u => u.id === tx.path?.[0])
            const receiver = window.users?.find(u => u.id === tx.path?.[tx.path.length - 1])
            const senderName = sender?.name || 'Unknown'
            const receiverName = receiver?.name || 'Unknown'

            displayContent += `
                <div class="transaction-counterparty">${senderName} (${countries[sender.country].flag}) \t→\t ${receiverName} (${countries[receiver.country].flag})</div>
            `
        }

        return `<div class="transaction-item">${displayContent}</div>`
    }).join('')
}

export function showUserDetails(user) {
    userDetails.name.textContent = user.name || 'John Doe'
    userDetails.country.textContent = countries[user.country].flag
    userDetails.type.textContent = user.type

    const userTransactions = window.transactions.filter(tx =>
        tx.active && tx.path && (tx.path[0] === user.id || tx.path[tx.path.length - 1] === user.id)
    )

    userDetails.userTransactions.innerHTML = formatTransactionList(userTransactions, user.id)

    show(userDetails.panel)
}


export function showRestartButton() {
    show(controls.restartBtn)
}

export function getSelectedNode() {
    return selectedNode
}

export function getControls() {
    return controls
}

export function getNodeDetailsPanel() {
    return nodeDetails?.panel
}

// UI utilities
export function show(element) {
    if (element) element.classList.remove('hidden')
}

export function hide(element) {
    if (element) element.classList.add('hidden')
}

export function updateCurrentNodeDetails(budget, placeTower, enforceAction) {
    if (selectedNode) {
        showNodeDetails(selectedNode, budget, placeTower, enforceAction)
    }
}

export function showGDPPanel() {
    if (!analytics || !analytics.panel) {
        return
    }
    closeAllPanels(analytics.panel)
    show(analytics.panel)

    updateAnalyticsPanel()
}



// Store historical chart data - each bucket represents a fixed time period (e.g., 10 days)
let historicalBuckets = []
let lastProcessedLogIndex = 0
let currentBucket = null
const BUCKET_DURATION = 10 * 1000 // 10 seconds per bucket (representing 10 days in game time)
const MAX_BUCKETS = 15 // Show last 15 periods

function calculateBuckets() {
    const now = Date.now()

    // Initialize current bucket if needed
    if (!currentBucket || now - currentBucket.startTime >= BUCKET_DURATION) {
        // Finalize previous bucket if it exists
        if (currentBucket) {
            historicalBuckets.push({ ...currentBucket })
            if (historicalBuckets.length > MAX_BUCKETS) {
                historicalBuckets = historicalBuckets.slice(-MAX_BUCKETS)
            }
        }

        // Create new current bucket
        currentBucket = {
            startTime: now,
            legit: { count: 0, amount: 0 },
            questionable: { count: 0, amount: 0 },
            illegal: { count: 0, amount: 0 },
        }
    }

    // Only process new transactions since last update
    // TODO: Update to use transacitons array instead of window.gdpLog
    if (window.gdpLog && window.gdpLog.length > lastProcessedLogIndex) {
        const newTransactions = window.gdpLog.slice(lastProcessedLogIndex)

        newTransactions.forEach(logEntry => {
            if (logEntry.timestamp >= currentBucket.startTime) {
                const legality = logEntry.legality || 'legit'
                currentBucket[legality].count++
                currentBucket[legality].amount += logEntry.amount
            }
        })

        lastProcessedLogIndex = window.gdpLog.length
    }


    return [...historicalBuckets, currentBucket]
}

function switchGDPView(view) {
    analytics.currentView = view

    // Update button states
    analytics.volumeBtn.classList.toggle('active', view === 'volume')
    analytics.countBtn.classList.toggle('active', view === 'count')

    updateGDPChart()
}

function updateGDPChart() {
    drawTransactionChart(calculateBuckets(), analytics.currentView)
}

export function updateAnalyticsPanel() {
    if (analytics && !analytics.panel.classList.contains('hidden')) {
        if (analytics.currentTab === 'chart') {
            updateGDPChart()
        } else if (analytics.currentTab === 'transactions') {
            updateTransactionsList()
        }
    }
}
function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}
function drawTransactionChart(buckets, viewMode) {
    const canvas = analytics.chart
    const ctx = canvas.getContext('2d')
    const container = analytics.chartContainer

    // Set canvas size from container
    if (container) {
        const rect = container.getBoundingClientRect()
        canvas.width = Math.max(400, rect.width - 20)
        canvas.height = 200
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const margin = { top: 20, right: 20, bottom: 40, left: 60 }
    const chartWidth = canvas.width - margin.left - margin.right
    const chartHeight = canvas.height - margin.top - margin.bottom

    // Find max value for scaling
    const maxValue = Math.max(...buckets.map(bucket => {
        let sum = 0
        for (const type of legalityOptions) {
            const typeData = bucket[type]
            if (typeData) {
                const value = viewMode === 'volume' ? typeData.amount : typeData.count
                sum += value
            }
        }
        return sum
    })) || 1

    const barWidth = Math.max(chartWidth / buckets.length - 2, 8)

    // Draw bars with game-style effects
    const currentTime = Date.now()
    buckets.forEach((bucket, i) => {
        const x = margin.left + i * (chartWidth / buckets.length) + 1
        let yOffset = margin.top + chartHeight
        const isCurrentBucket = i === buckets.length - 1

        for (const type of legalityOptions) {
            const typeData = bucket[type]
            if (typeData) {
                const value = viewMode === 'volume' ? typeData.amount : typeData.count
                if (value > 0) {
                    const barHeight = (value / maxValue) * chartHeight
                    yOffset -= barHeight

                    ctx.fillStyle = legalityColorMap[type]
                    ctx.fillRect(x, yOffset, barWidth, barHeight)

                    // Add subtle border for depth
                    ctx.strokeStyle = `rgba(255, 255, 255, ${isCurrentBucket ? 0.3 : 0.1})`
                    ctx.lineWidth = 1
                    ctx.strokeRect(x, yOffset, barWidth, barHeight)

                    // Reset effects
                    ctx.globalAlpha = 1
                }
            }
        }
    })

    // Get CSS color values
    const borderColor = 'rgba(255, 255, 255, 0.1)'
    const textDimColor = 'rgba(240, 240, 240, 0.7)'

    // Draw subtle grid pattern inspired by game's debug grid
    ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`
    ctx.lineWidth = 1
    ctx.beginPath()

    // Vertical grid lines
    for (let i = 1; i < buckets.length; i++) {
        const x = margin.left + i * (chartWidth / buckets.length)
        ctx.moveTo(x, margin.top)
        ctx.lineTo(x, margin.top + chartHeight)
    }

    // Horizontal grid lines
    for (let i = 1; i < 5; i++) {
        const y = margin.top + (i / 5) * chartHeight
        ctx.moveTo(margin.left, y)
        ctx.lineTo(margin.left + chartWidth, y)
    }
    ctx.stroke()

    // Draw main axes with game styling
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(margin.left, margin.top)
    ctx.lineTo(margin.left, margin.top + chartHeight)
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight)
    ctx.stroke()

    // Y-axis labels with game styling
    ctx.fillStyle = textDimColor
    ctx.font = `10px ${uiFont}`
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
        const y = margin.top + chartHeight - (i / 5) * chartHeight
        const value = (i / 5) * maxValue
        const label = viewMode === 'volume' ? `$${Math.round(value)}` : Math.round(value).toString()
        ctx.fillText(label, margin.left - 5, y + 3)
    }

    // X-axis labels with game styling (positioned above legend)
    ctx.textAlign = 'center'
    const periodsAgo = buckets.length - 1
    if (periodsAgo == 0) {
        ctx.fillText('Current', margin.left + chartWidth / 2, canvas.height - 30)

    } else {
        ctx.fillText(`${periodsAgo * 10} days ago`, margin.left + 30, canvas.height - 25)
        ctx.fillText('Current', margin.left + chartWidth - 20, canvas.height - 25)

    }
    // Draw legend background with game styling
    const legendHeight = 40
    const legendY = canvas.height - legendHeight
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, legendY, canvas.width, legendHeight)

    // Draw legend border
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 1
    ctx.strokeRect(0, legendY, canvas.width, legendHeight)

    // Draw legend items horizontally at bottom
    ctx.textAlign = 'center'
    ctx.font = `12px  ${uiFont}`

    const itemWidth = canvas.width / legalityOptions.length
    legalityOptions.forEach((legality, i) => {
        const centerX = itemWidth * i + itemWidth / 2
        const textY = legendY + 20

        // Draw colored indicator
        ctx.fillStyle = legalityColorMap[legality]
        ctx.fillRect(centerX, textY, 16, 16)

        // Draw text
        ctx.textAlign = 'left'

        ctx.fillStyle = textDimColor
        ctx.fillText(`${capitalizeFirstLetter(legality)}`, centerX + 25, textY + 12)
    })

    // Add animated transaction flow indicators
    const flowY = legendY - 5
    for (let i = 0; i < 3; i++) {
        const flowX = margin.left + (currentTime * 0.1 + i * 100) % chartWidth
        const alpha = 0.3 + 0.2 * Math.sin(currentTime * 0.01 + i)

        ctx.fillStyle = `rgba(58, 123, 213, ${alpha})`
        ctx.fillRect(flowX, flowY, 3, 3)
    }
}

function switchAnalyticsTab(tab) {
    if (!analytics) return

    analytics.currentTab = tab

    // Update tab button states
    analytics.chartTab.classList.toggle('active', tab === 'chart')
    analytics.transactionsTab.classList.toggle('active', tab === 'transactions')

    // Show/hide sections
    analytics.chartSection.classList.toggle('hidden', tab !== 'chart')
    analytics.transactionsSection.classList.toggle('hidden', tab !== 'transactions')

    updateAnalyticsPanel()
}

function updateTransactionsList() {
    if (!analytics || !analytics.allTransactions) return

    const allTransactions = window.transactions || []

    analytics.allTransactions.innerHTML = formatTransactionList(allTransactions)
}

// Keyboard shortcuts for towers (numbers) and actions (letters)
window.addEventListener('keydown', (e) => {
    if (!getSelectedNode()) return

    const key = e.key.toLowerCase()

    // Numbers 1-9 for towers (in UI order)
    if (/^[1-9]$/.test(key)) {
        const towerButtons = document.querySelectorAll('#tower-options .option-button')
        const index = parseInt(key) - 1
        if (towerButtons[index] && !towerButtons[index].disabled) {
            towerButtons[index].click()
        }
    }

    // Letters for actions (a, r, i)
    const actionMap = { 'a': 'audit', 'r': 'raid', 'i': 'international_task_force' }
    if (actionMap[key]) {
        const actionButtons = document.querySelectorAll('#action-options .option-button')
        const actionButton = Array.from(actionButtons).find(btn =>
            btn.textContent.toLowerCase().includes(actionMap[key].replace('_', ' ').split(' ')[0])
        )
        if (actionButton && !actionButton.disabled) {
            actionButton.click()
        }
    }
})

export function activatePolicy() {
    show(controls.policyBtn)
}

export function hideFullInterface() {
    // Simplified interface when using the tutorial
    hide(controls.gdpStatItem)
    hide(controls.maintenanceStatItem)
    hide(controls.gameControls)
}

export function showFullInterface() {
    show(controls.gdpStatItem)
    show(controls.maintenanceStatItem)
    show(controls.gameControls)
}