import { showTutorial, isFirstPlay, unlock } from './tutorial.js'
// Game
import * as config from './game/config.js'
Object.assign(window, config) // (Made for compatibility with prior versions)
import * as policy from './game/policy.js'
import * as tech from './game/tech.js'
import * as events from './game/events.js'
import { generateUsers } from './game/users.js'
import { spawnTransaction } from './game/transactions.js'
import { placeTower, enforceAction, initNodes, removeExpiredEnforcementActions, activateNode, checkNodesCompliance, increaseAIaccuracy } from './game/nodes.js'
// UI
import * as UI from './UI/ui-manager.js'
import * as uiTransaction from './UI/ui-transaction.js'
import * as uiUsers from './UI/ui-users.js'
import * as uiTech from './UI/ui-tech.js'
// Canvas
import * as Camera from './canvas/camera.js'
import * as graphics from "./canvas/graphics.js"
import { findNodeAt, findTransactionAt, findUserAt } from './canvas/finders.js'

window.debug = false
let displayCountries = false
const debugAvailable = ['localhost', '127.0.0.1'].includes(location.hostname)

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
graphics.init(canvas, ctx)
Camera.initCamera(canvas)
window.addEventListener('resize', Camera.resizeCanvas.bind(null, ctx))

let effects = []

function handleCanvasClick(screenX, screenY) {
    const tx = findTransactionAt(screenX, screenY)
    if (tx) {
        // Close any open panels
        UI.closeAllPanels()
        // Select new transaction
        UI.setSelectedTransaction(tx)
        Camera.cinematicPanAndZoom(tx.x, tx.y, 3, 1)
        return
    }
    if (unlock.nodes) {
        const node = findNodeAt(screenX, screenY)
        if (node) {
            UI.clearAllSelections()
            UI.showNodeDetails(node, budget, placeTower, enforceAction)
            return
        }
    }
    if (unlock.users) {
        const user = findUserAt(screenX, screenY)
        if (user) {
            UI.clearAllSelections()
            uiUsers.showUserDetails(user)
            return
        }
    }
    // Empty space clicked - clear everything
    UI.clearAllSelections()
}

// Initialization of UI elements, waiting for the DOM (and actually the game data)
document.addEventListener('DOMContentLoaded', () => {

    // Initialize the game
    initNodes()
    generateUsers()
    tech.initTechTree()
    uiTech.initTechUI()
    events.initializeEvents()

    // Initialize UI panels 
    UI.initUI()

    // Set initial canvas size and enable touch/mouse camera actions
    Camera.resizeCanvas(ctx)
    Camera.setCameraActions()

    // First-time setup
    const ctrls = UI.getControls()
    // We show debug controls if relevant
    if (debugAvailable) {
        UI.show(ctrls.debugControls)
    }
    if (isFirstPlay()) {
        UI.hideFullInterface()
    }
    let isDragging = false
    // Unified click handler for canvas
    canvas.addEventListener('mousedown', (e) => {
        isDragging = false
        const transaction = findTransactionAt(e.clientX, e.clientY)
        const node = findNodeAt(e.clientX, e.clientY)
        const user = findUserAt(e.clientX, e.clientY)

        if (transaction || node || user) {
            // Don't start dragging when clicking on interactive elements
            return
        } else {
            Camera.startDrag(e)
            isDragging = true
        }
    })

    canvas.addEventListener('click', (e) => {
        // canvas.onClick = (e) => {

        e.stopPropagation() // Prevent document click handler from interfering

        handleCanvasClick(e.clientX, e.clientY)
    })

    // Handle node approval
    window.addEventListener('approveNode', (e) => {
        const node = e.detail
        if (node) {
            node.active = true // Ensure the node is marked as active
            activateNode(node)
            policy.removePendingNode(node) // Remove from pending after activation
        }
    })

    // // Handle touch interactions
    canvas.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0]

        handleCanvasClick(touch.clientX, touch.clientY)
        // const node = findNodeAt(touch.clientX, touch.clientY)
        // if (node) {
        //     UI.showNodeDetails(node, budget, placeTower, enforceAction)
        // }
    })

    // document.addEventListener('click', handlePanelClose)
    // document.addEventListener('touchstart', handlePanelClose, { passive: false })

    ctrls.centerBtn.addEventListener('click', () => Camera.cinematicCenterMap(activeNodes))
    ctrls.debugBtn.addEventListener('click', () => {
        debug = !debug
        ctrls.debugBtn.style.backgroundColor = debug ? 'rgba(255, 0, 0, 0.2)' : ''
        tech.addResearchPoints(10000)
        budget += 10000
        if (nodes[5]) nodes[5].reputation = 0
    })
    ctrls.countriesBtn.addEventListener('click', () => {
        displayCountries = !displayCountries
        ctrls.countriesBtn.style.backgroundColor = displayCountries ? 'rgba(0, 255, 0, 0.2)' : ''
    })

    ctrls.slowBtn.addEventListener('click', () => setGameSpeed(0.5))
    ctrls.normalBtn.addEventListener('click', () => setGameSpeed(1))
    ctrls.fastBtn.addEventListener('click', () => setGameSpeed(2))

    ctrls.restartBtn.addEventListener('click', () => {
        window.location.reload()
    })

    // Zoom in slightly when the game starts
    if (isFirstPlay()) {
        setGameSpeed(0.4, 0.6)
        // Restauring default after a while
        setTimeout(() => {
            setGameSpeed(1)
        }, 40000)
        showTutorial()
        Camera.centerView(activeNodes, -70)
    } else {
        Camera.centerView(activeNodes, 0)

    }
    // We center view and then zoom initially.
    Camera.cinematicZoom(Camera.getDefaultZoom())
    gameLoop()
})

// === Economics ===

// Global variables, used in many modules

let budget = 120
// Hacky budget global access. But I like the proxy pattern
Object.defineProperty(window, 'budget', {
    get: () => budget,
    set: (value) => {
        budget = value
        // UI.updateIndicators(...) 
    }
})
window.maintenance = 0

window.transactions = []
Object.defineProperty(window, 'activeTransactions', {
    get() {
        return transactions.filter(n => n.active)
    }
})

window.users = []
Object.defineProperty(window, 'activeUsers', {
    get() {
        return users.filter(n => n.active)
    }
})
window.nodes = []
Object.defineProperty(window, 'activeNodes', {
    get() {
        return nodes.filter(n => n.active)
    }
})
let gdp = 0
let holiday = false
export let dropProbability = 0.00001
let spawnControl = 1
let corruptionSpread = 10
// export let transactions = []
const startTime = Date.now()
let currentDay = 0

// Gameplay
let speedControl = 1
export function getSpeedControl() {
    return speedControl
}

function setGameSpeed(speed, spawn = speed) {
    speedControl = speed
    spawnControl = spawn
}
let isFirstNewNode = false

// Endgame 
let almostWon = 0
let lastWarningTime = 0
let priorNow = Date.now()
let deltaTime = 0
let dailyDetectedTransactions = 0
export function incrementDailyDetectedTransactions() {
    dailyDetectedTransactions++
}

// TODO : restructure with options or an object of effects
export function addEffect(x, y, emoji, type = 'default', color = null) {
    let timer = 0
    switch (type) {
        case 'default':
            timer = 30// Emojis for big actions
            break
        case 'invertedPulse':
        case 'pulseNode':
            timer = 10
            break
        case 'pulse':
            timer = 8
            break
        case 'freeze':
            timer = 180
            break
        default:
            timer = 15 // small text notifications)

    }
    effects.push({ x, y, emoji, timer, type, color })

}

function calculateIndicators() {
    // Remove old transactions from the log (older than 150 seconds, each second is a day)
    // while (gdpLog.length && gdpLog[0].timestamp < Date.now() - 150 * 1000) {
    //     gdpLog.shift()
    // }
    // gdp = gdpLog.reduce((sum, tx) => sum + tx.amount, 0)

    // TODO : use transactions array instead of gdpLog. (currently, tx are cleaned up). E.g.:
    // gdp = transactions.filter(t=>(!t.active&&t.endDate < Date.now()-150*1000)).reduce((sum, tx) => sum + tx.amount, 0)

    budget += maintenance / (60 * 7) * tech.bonus.maintenance// maintenance is per week for balance   

}

function calculateCorruptionSpread() {
    const totalCorruption = activeNodes.reduce((sum, n) => sum + n.corruption, 0)
    return Math.floor((totalCorruption / (HIGH_CORRUPTION_THRESHOLD * activeNodes.length + 2)) * 100)
}

function checkEndGame() {
    const now = Date.now()

    // Warning states
    if (now - lastWarningTime > 30000) {
        if (corruptionSpread >= 80 && corruptionSpread < 100) {
            UI.showToast('⚠️ Critical Warning', 'Corruption is dangerously high!', 'error')
            lastWarningTime = now
        } else if (budget < 0 && budget >= -100) {
            UI.showToast('💰 Financial Warning', 'Budget is critically low!', 'error')
            lastWarningTime = now
        } else if (policy.popularity <= 100 && policy.popularity > 0) {
            UI.showToast('😡 Sentiment Warning', 'Your popularity is very low!', 'error')
            lastWarningTime = now
        }
    }

    // Loosing cases
    if (corruptionSpread >= 100) {
        graphics.drawEndGame('Corruption has reached critical levels!')
        UI.showRestartButton()
        return true
    }

    if (budget < -100) {
        graphics.drawEndGame('The country is bankrupt!')
        UI.showRestartButton()
        return true
    }

    if (policy.popularity <= 0) {
        graphics.drawEndGame('The ecosystem disapproves of your policies!')
        UI.showRestartButton()
        return true
    }

    // Victory condition Low corruption maintained
    if (corruptionSpread < 2) {
        if (almostWon > 7) {
            graphics.drawEndGame('You maintained corruption below 2%!', true)
            return true
        } else {
            almostWon++
            if (almostWon === 5) {
                UI.showToast('🎯 Victory Approaching', 'Maintain low corruption for 3 more days to win!', 'success')
            }
        }
    } else {
        almostWon = 0
    }

    // Victory condition Economic prosperity
    if (gdp > 1000000) {
        graphics.drawEndGame('You built a thriving financial ecosystem!', true)
        return true
    }
}
function spawnNode() {
    const inactiveNodes = nodes.filter(n => !n.active && edges.some(([a, b]) => (a === n.id && nodes[b].active) || (b === n.id && nodes[a].active)))
    if (inactiveNodes.length > 0) {
        const newNode = inactiveNodes[Math.floor(Math.random() * inactiveNodes.length)]
        if (policy.state.requireValidation) {
            policy.addPendingNode(newNode)
            UI.showToast('⚖️  Approval needed', `${newNode.name} awaits regulatory clearance`, 'info')
        } else {
            activateNode(newNode)
            if (!isFirstNewNode) {
                Camera.cinematicCenterPoint(newNode.x, newNode.y, 2)
                isFirstNewNode = false
                setTimeout(() => {
                    Camera.cinematicCenterMap(nodes.filter(n => n.active))
                }, 2000) // Come back after 2 seconds
            }
        }
    }
}

function checkForHoliday(currentDay) {
    // We perform the following tasks once a day
    const dayOfYear = currentDay % 365 + 1
    // const year = Math.floor(currentDay / 365)
    // After the first drawing, we slow the game to ask for the tutorial 
    if (!isFirstPlay()) {
        // No holidway while first play
        holiday = false
        // Check for specific holidays
        switch (dayOfYear) {
            case 15: // Lunar New Year
                holiday = true
                UI.showToast('🎆 Holiday!', 'Happy Lunar New Year!', 'info')
                break
            case 85: // Eid
                holiday = true
                UI.showToast('🫖 Holiday!', 'Happy Eid!', 'info')
                break
            case 356: // Christmas
                holiday = true
                UI.showToast('🎁 Holiday!', 'Merry Christmas!', 'info')
                break
        }
    }
}

function drawGame() {
    const now = Date.now()

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (debug) Camera.drawCameraInfo(ctx)
    if (debug || window.showFPS) {
        const newDeltaTime = now - priorNow
        priorNow = now
        ctx.font = '18px sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.fillText(`FPS: ${Math.round(1000 / ((deltaTime + newDeltaTime) / 2))}`, 10, 70)
        deltaTime = newDeltaTime
    }
    Camera.applyCamera(ctx)
    if (debug) graphics.drawDebugGrid(ctx)
    userEdges.forEach(edge => graphics.drawUserEdge(edge, users, nodes))
    edges.filter(([a, b]) => nodes[a].active && nodes[b].active)
        .forEach(edge => graphics.drawEdge(edge, nodes))
    activeNodes.forEach(node => graphics.drawNode(node, debug))
    activeUsers.forEach(user => graphics.drawUser(user, debug))
    activeTransactions.forEach(tx => {
        graphics.drawTransaction(tx)
    })
    graphics.drawEffects(effects)
    // Filter out expired effects
    effects = effects.filter(e => e.timer > 0)
    if (displayCountries) {
        graphics.drawCountries(nodes, users)
    }
    Camera.restoreCamera(ctx)
    if (unlock.corruption) {
        graphics.drawCorruptionMeter(corruptionSpread)
    }
    if (unlock.reputation) {
        graphics.drawPopularityMeter(policy.popularity)
    }

    // Draw tooltips in screen space (after camera restore)
    const selectedTx = UI.getSelectedTransaction()
    if (selectedTx) {
        if (graphics.isMobile) {
            Camera.panAndZoom(selectedTx.x, selectedTx.y + 40, 3)
        } else {
            Camera.panAndZoom(selectedTx.x, selectedTx.y, 3)
        }
        // Only show tooltip if it's not already visible
        if (!UI.isTransactionTooltipVisible()) {
            uiTransaction.showTransactionTooltip(selectedTx)
        }
    } else {
        UI.hideTransactionTooltip()
    }
}

function gameLoop() {
    // == Update the game state == 
    const now = Date.now()
    const newCurrentDay = Math.floor((now - startTime) / 1000) // in seconds
    if (newCurrentDay !== currentDay) {
        //Daily actions
        currentDay = newCurrentDay
        checkForHoliday(currentDay)
        UI.updateDate(currentDay, holiday)
        const researchPointsGain = tech.calculateResearchPointsGain(gdp, dailyDetectedTransactions)
        tech.addResearchPoints(researchPointsGain)
        if (researchPointsGain > 0) {
            //   UI.showToast('Research Progress', `Gained ${researchPointsGain} Research Points`, 'info')
        }
        increaseAIaccuracy()
        checkNodesCompliance()
        removeExpiredEnforcementActions(now)
        corruptionSpread = calculateCorruptionSpread()
        if (!isFirstPlay()) {
            if (checkEndGame()) return
        }
        uiTech.updateResearchUI()
        if (UI.getSelectedNode()) {
            UI.updateCurrentNodeDetails(budget, placeTower, enforceAction)
        }
        if (currentDay % Math.round(NEW_NODE_FREQUENCY / spawnControl) === 0) {
            // Every 60 days, a new node is added and we check for popularity
            if (!isFirstPlay()) {
                spawnNode()
                policy.tickPopularity()
            }
        }
        // updateActiveNodes()
        dailyDetectedTransactions = 0 // reinit at the end of a new day, tx will accumulate during the frames of the day. 
    }
    // TODO : save old tx. Also, could be done when tx end.
    // transactions = transactions.filter(t => t.active)
    // window.transactions = transactions // Keep global reference updated (why not unecesary as reference?)

    // Clear selected transaction if it's no longer active
    const selectedTx = UI.getSelectedTransaction()
    if (selectedTx && !selectedTx.active) {
        UI.clearTransactionSelection()
    }
    if (transactions.length === 0) {
        // ensure there is always a transaction going
        spawnTransaction()
    } else {
        const holidayBonus = holiday ? HOLIDAY_SPAWN_BONUS : 1
        const spawnRate = activeNodes.length * holidayBonus * Math.log10(currentDay + 1) * BASE_SPAWN_RATE * spawnControl
        if (Math.random() < spawnRate) {
            spawnTransaction()
        } else if (window.launderingAlert && Math.random() < spawnRate * 0.1) {
            // If laundering alert is active, spawn burst of structured transactions
            UI.showToast('💸 Laundering Scheme!', 'Structured transactions detected.', 'warning')
            // During laundering create structured transactions (multiple small amounts)
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    spawnTransaction() // Create a new transaction each time
                    let newTx = transactions[transactions.length - 1]
                    if (newTx) {
                        newTx.legality = "illegal"
                        newTx.amount = 2 + Math.floor(Math.random() * 7) // 2 to 9
                        newTx.size = "small"
                    }
                }, i * 500) // Reduced delay to 1 second intervals
            }
        }
    }

    // Check for events
    events.checkForEvents(startTime)

    // Apply event effects if any choice was made
    if (window.eventBudgetChange) {
        budget += window.eventBudgetChange
        window.eventBudgetChange = 0 // Reset after applying
    }
    if (window.eventMaintenanceChange) {
        let eventMaintenance = window.eventMaintenanceChange
        maintenance += eventMaintenance
        // Reset maintenance after duration
        if (window.eventDuration) {
            setTimeout(() => {
                maintenance -= eventMaintenance
            }, window.eventDuration)
        }
        window.eventMaintenanceChange = 0 // Reset after applying
        window.eventDuration = 0
    }

    transactions.forEach(tx => {
        tx.moveTransaction()
    })

    calculateIndicators()

    // == Update the UI ==
    UI.updateIndicators(budget, gdp, maintenance * tech.bonus.maintenance)
    // Update Analytics panel (function will check if visible)
    UI.updateAnalyticsPanel()

    // == Draw the game ==
    drawGame()
    // animationFrameId = 
    requestAnimationFrame(gameLoop)
}

