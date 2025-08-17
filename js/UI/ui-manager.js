// Ideally provides the API to all other UI files
import { towerOptions, actionOptions, countries, legalityOptions, legalityColorMap } from '../game/config.js'
import * as tech from '../game/tech.js'
import { uiFont } from '../canvas/graphics.js'
import { selectRandomly } from '../utils.js'
import { showTransactionTooltip } from './ui-transaction.js'
import { closeUserDetails } from './ui-users.js'

let indicators = null
let controls = null
let instructions = null
let nodeDetails = null
let policy = null
let research = null
export let userDetails = null
let analytics = null
// let transactionsPanel = null
export let tooltip = null
let panels = null
// let txButtons = null
// let txActions = null

let selectedNode = null
let selectedTransaction = null
let selectedUser = null

export function initUI() {
    indicators = {
        budget: document.getElementById('budget'),
        gdp: document.getElementById('gdp'),
        maintenance: document.getElementById('maintenance'),
        day: document.getElementById('day'),
        holiday: document.getElementById('holiday'),
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
        txStatItem: document.getElementById('tx-stat-item'),
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
        import('../tutorial.js').then(tutorial => {
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
    // txActions = document.getElementById('tx-actions')
    // txButtons = {
    //     validate: document.getElementById('validate-tx'),
    //     block: document.getElementById('block-tx'),
    //     analyze: document.getElementById('analyze-tx'),
    // }

    nodeDetails.close.addEventListener('click', hideNodeDetails)

    // Transaction detail handlers
    // document.getElementById('back-to-transactions').addEventListener('click', () => {
    //     // Clear transaction update interval
    //     if (currentTransactionUpdateInterval) {
    //         clearInterval(currentTransactionUpdateInterval)
    //         currentTransactionUpdateInterval = null
    //     }

    //     // Clear selection from all transactions
    //     if (window.transactions) {
    //         window.transactions.forEach(tx => tx.isSelected = false)
    //     }

    //     transactionsPanel.listSection.classList.remove('hidden')
    //     transactionsPanel.detailsSection.classList.add('hidden')

    //     // Refresh the transaction list to update visual state
    //     updateTransactionsList()
    // })

    // User details panel
    userDetails = {
        panel: document.getElementById('user-details-panel'),
        name: document.getElementById('user-name'),
        country: document.getElementById('user-country'),
        type: document.getElementById('user-type'),
        badge: document.getElementById('user-badge'),
        userTransactions: document.getElementById('user-transactions'),
        close: document.getElementById('close-user-panel')
    }

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
        currentView: 'volume'
    }

    // transactionsPanel = {
    //     panel: document.getElementById('transactions-panel'),
    //     close: document.getElementById('close-transactions'),
    //     allTransactions: document.getElementById('all-transactions'),
    //     listSection: document.getElementById('transactions-list-section'),
    //     detailsSection: document.getElementById('transaction-details')
    // }

    tooltip = {
        panel: document.getElementById('transaction-tooltip'),
        title: document.getElementById('tooltip-title'),
        content: document.getElementById('tooltip-content'),
        motive: document.getElementById('tooltip-motive'),
        actions: document.getElementById('tooltip-actions'),
        close: document.getElementById('close-tooltip'),
        allowBtn: document.getElementById('tooltip-allow'),
        blockBtn: document.getElementById('tooltip-block'),
        freezeBtn: document.getElementById('tooltip-freeze')
    }

    analytics.close.addEventListener('click', () => hide(analytics.panel))

    analytics.volumeBtn.addEventListener('click', () => switchGDPView('volume'))
    analytics.countBtn.addEventListener('click', () => switchGDPView('count'))

    // transactionsPanel.close.addEventListener('click', () => {
    //     if (transactionListUpdateInterval) {
    //         clearInterval(transactionListUpdateInterval)
    //         transactionListUpdateInterval = null
    //     }
    //     hide(transactionsPanel.panel)
    // })

    // Make GDP stat item clickable
    controls.gdpStatItem.style.cursor = 'pointer'
    controls.gdpStatItem.addEventListener('click', (e) => {
        e.stopPropagation()
        showGDPPanel()
    })

    // Make transactions stat item clickable
    // controls.txStatItem.style.cursor = 'pointer'
    // controls.txStatItem.addEventListener('click', (e) => {
    //     e.stopPropagation()
    //     showTransactionsPanel()
    // })

    // helper array for iterations on panels
    panels = [
        nodeDetails.panel,
        instructions.panel,
        policy.panel,
        research.panel,
        userDetails.panel,
        analytics.panel,
        // transactionsPanel.panel,
        tooltip.panel
    ]

    // Setup HTML tooltip button handlers
    tooltip.allowBtn.addEventListener('click', () => {
        getSelectedTransaction().validate()
        clearAllSelections()
    })

    tooltip.blockBtn.addEventListener('click', () => {
        getSelectedTransaction().block()
        clearAllSelections()
    })

    tooltip.freezeBtn.addEventListener('click', () => {
        getSelectedTransaction().freeze()
        clearAllSelections()
    })

    // txButtons.validate.onclick = () => {
    //     getSelectedTransaction().validate()
    //     clearAllSelections()
    // }
    // txButtons.block.onclick = () => {
    //     getSelectedTransaction().block()
    //     clearAllSelections()
    // }
    // txButtons.analyze.onclick = () => {
    //     getSelectedTransaction().freeze()
    //     clearAllSelections()
    // }
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
    const exceptId = exceptPanel?.id || null
    panels.forEach(panel => {
        if (panel && !panel.classList.contains('hidden') && panel.id !== exceptId) {
            if (panel.id === 'node-details-panel') {
                hideNodeDetails()
                // } else if (panel.id === 'transaction-tooltip') {
                //     hideTransactionTooltip()
            } else if (panel.id === 'user-details-panel') {
                closeUserDetails()
            } else {
                hide(panel)
            }
        }
    })
}

export function clearAllSelections() {
    // Clear transaction selection 
    clearTransactionSelection()
    // tooltip 
    // Clear all UI panels
    closeAllPanels()
    // Clear selected user and node
    selectedUser = null
    selectedNode = null
}

export function updateIndicators(budget, gdp, maintenance) {
    if (maintenance > 0) {

        indicators.budget.textContent = `${budget.toFixed(0)} (- ${maintenance.toFixed(0)})`
    } else {
        indicators.budget.textContent = budget.toFixed(0)
    }
    // indicators.gdp.textContent = gdp.toFixed(0);
    // indicators.maintenance.textContent = maintenance;
    // indicators.txCounter.textContent = window.transactions.length
}

export function updateDate(day, holiday) {
    indicators.day.textContent = day
    indicators.holiday.textContent = holiday ? ' 🎉' : ''
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
    const progress = tech.getResearchProgress()

    Object.keys(actionOptions).forEach(actionType => {
        // Check if technology requirement is met
        const techRequirement = actionOptions[actionType].techRequirement
        const techUnlocked = !techRequirement || progress[techRequirement]?.researched

        // Only show actions that have been unlocked through research
        if (techUnlocked) {
            createActionButton(actionType, node, budget, enforceAction)
            foundOption = true
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
    const progress = tech.getResearchProgress()

    let foundOption = false
    Object.keys(towerOptions).forEach(towerType => {
        // Check if this tower depends on the current tower and is not already installed
        const validUpgrade = towerOptions[towerType].depend === node.tower && node.tower !== towerType

        // Check if technology requirement is met (if any)
        const techRequirement = towerOptions[towerType].techRequirement
        const techUnlocked = !techRequirement || progress[techRequirement]?.researched

        // Only show options that are valid upgrades and have their tech requirements met
        if (validUpgrade && techUnlocked) {
            createTowerButton(towerType, node, budget, placeTower)
            foundOption = true
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

export function showRestartButton() {
    show(controls.restartBtn)
}

export function getSelectedNode() {
    return selectedNode
}

export function setSelectedUser(user) {
    selectedUser = user
    return selectedUser
}

export function getSelectedUser() {
    return selectedUser
}

export function clearSelectedUser() {
    selectedUser = null
    return selectedUser
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

    updateGDPChart()
}

// export function showTransactionsPanel() {
//     if (!transactionsPanel || !transactionsPanel.panel) {
//         return
//     }
//     closeAllPanels(transactionsPanel.panel)
//     show(transactionsPanel.panel)

//     // Show the list section and hide details
//     show(transactionsPanel.listSection)
//     hide(transactionsPanel.detailsSection)

//     updateTransactionsList()

//     // Start simple interval to update every 500ms
//     if (!transactionListUpdateInterval) {
//         transactionListUpdateInterval = setInterval(() => {
//             if (!transactionsPanel.panel.classList.contains('hidden')) {
//                 updateTransactionsList()
//             }
//         }, 500)
//     }
// }


// Temporarely deprecated
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
    if (gdpLog && window.length > lastProcessedLogIndex) {
        const newTransactions = gdpLog.slice(lastProcessedLogIndex)

        newTransactions.forEach(logEntry => {
            if (logEntry.timestamp >= currentBucket.startTime) {
                const legality = logEntry.legality || 'legit'
                currentBucket[legality].count++
                currentBucket[legality].amount += logEntry.amount
            }
        })

        lastProcessedLogIndex = gdpLog.length
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
        updateGDPChart()
    }
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1)
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

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    if (key === 'tab') {
        e.preventDefault()
        if (selectedTransaction) {
            clearTransactionSelection()
        }
        let tx = selectRandomly(window.transactions)
        tx.isSelected = true
        selectedTransaction = tx
        return
    }

    // Keyboard shortcuts for towers (numbers) and actions (letters)

    if (!getSelectedNode()) return
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

// Node transactions functionality removed - now using dedicated transactions panel

// function showTransactionDetails(tx) {
//     // Mark this transaction as selected
//     setSelectedTransaction(tx)

//     if (tx.active) {
//         Camera.cinematicPanAndZoom(tx.x, tx.y, 3)
//     }

//     // Hide transaction list, show details
//     hide(transactionsPanel.listSection)
//     show(transactionsPanel.detailsSection)

//     // Show transaction summary at top using unified format
//     const summaryEl = document.getElementById('tx-summary')
//     summaryEl.innerHTML = formatTransaction(tx, null, false)

//     // Show enhanced path with current position
//     displayTransactionPath(tx)

//     // Show action buttons only if transaction is active and relevant to current node
//     if (tx.active) {
//         show(txActions)
//         // Update button handlers with current transaction

//     } else {
//         hide(txActions)
//         // SHould rarely happen
//         console.warn('Transaction is not active, hiding actions')
//         tx.isSelected = false

//     }
// }

// let currentTransactionUpdateInterval = null
// let transactionListUpdateInterval = null

// // Deprecated for the moment
// function displayTransactionPath(tx) {
//     const pathDiv = document.getElementById('tx-path')

//     if (!tx.path || tx.path.length === 0) {
//         pathDiv.innerHTML = '<div class="path-node">Direct transfer</div>'
//         return
//     }

//     // Clear any existing update interval
//     if (currentTransactionUpdateInterval) {
//         clearInterval(currentTransactionUpdateInterval)
//     }

//     // Function to update the path display
//     const updatePath = () => {
//         if (!tx.active) {
//             hide(txActions)
//             tx.isSelected = false
//         }

//         const currentStepIndex = tx.active ? tx.index : tx.path.length

//         // Clear existing content
//         pathDiv.innerHTML = ''

//         tx.path.forEach((pathId, stationIndex) => {
//             const user = window.users.find(u => u.id === pathId)
//             const node = window.nodes.find(n => n.id === pathId)
//             const name = user?.name || node?.name || pathId

//             const isCompleted = stationIndex < currentStepIndex
//             const isCurrent = stationIndex === currentStepIndex
//             const isValidated = stationIndex <= currentStepIndex
//             const isPending = stationIndex > currentStepIndex

//             // Create step container
//             const stepDiv = document.createElement('div')
//             stepDiv.className = 'path-step'

//             // Add dot if current position and active
//             const showDot = tx.active && stationIndex === currentStepIndex
//             if (showDot) {
//                 const dotDiv = document.createElement('div')
//                 dotDiv.className = 'path-dot'
//                 stepDiv.appendChild(dotDiv)
//             }

//             // Create node span
//             const nodeSpan = document.createElement('span')
//             nodeSpan.textContent = name
//             nodeSpan.className = 'path-node'

//             if (isCurrent) nodeSpan.classList.add('current')
//             if (isCompleted || isValidated) nodeSpan.classList.add('completed')
//             if (isPending) nodeSpan.classList.add('pending')

//             if (user || node) {
//                 nodeSpan.classList.add('clickable-user')
//                 nodeSpan.addEventListener('click', (e) => {
//                     e.stopPropagation()
//                     if (user) {
//                         showUserDetails(user)
//                     } else if (node) {
//                         showNodeDetailsByID(pathId)
//                     }
//                 })
//             }

//             stepDiv.appendChild(nodeSpan)
//             pathDiv.appendChild(stepDiv)

//             // Add connector line between steps (except after last step)
//             if (stationIndex < tx.path.length - 1) {
//                 const connectorDiv = document.createElement('div')
//                 connectorDiv.className = 'path-connector'
//                 pathDiv.appendChild(connectorDiv)
//             }
//         })
//     }

//     // Initial update
//     updatePath()

//     // Set up real-time updates if transaction is active
//     if (tx.active) {
//         currentTransactionUpdateInterval = setInterval(updatePath, 500) // Update every 500 ms
//     }
// }

export function hideFullInterface() {
    // Simplified interface when using the tutorial
    hide(controls.gdpStatItem)
    hide(controls.maintenanceStatItem)
    hide(controls.gameControls)
}

export function showFullInterface() {
    // show(controls.gdpStatItem)
    // show(controls.maintenanceStatItem)
    show(controls.gameControls)
}

// Helper function to show node details by ID  
export function showNodeDetailsByID(nodeId) {
    const node = window.nodes?.find(n => n.id === nodeId)
    if (node) {
        showNodeDetails(node)
    }
}

export function isTransactionTooltipVisible() {
    return tooltip.panel.classList.contains('hidden')
}

export function hideTransactionTooltip() {
    hide(tooltip.panel)
}

// Little transaction selection management
export function getSelectedTransaction() {
    return selectedTransaction
}

export function setSelectedTransaction(tx) {
    if (selectedTransaction) {
        selectedTransaction.isSelected = false
    }
    tx.isSelected = true
    selectedTransaction = tx
    showTransactionTooltip(tx)
}

export function clearTransactionSelection() {
    if (selectedTransaction) {
        selectedTransaction.isSelected = false
    }
    selectedTransaction = null
}

