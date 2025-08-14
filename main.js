import * as Camera from './js/camera.js'
import * as UI from './js/ui-manager.js'
import * as config from './js/config.js'
Object.assign(window, config) // (Made for compatibility with prior versions)
import * as graphics from './js/graphics.js'
import * as tech from './js/tech.js'
import * as techUI from './js/tech-ui.js'
import { showTutorial, isFirstPlay, unlock } from './js/tutorial.js'
import { selectRandomly, normalRandom } from './js/utils.js'

import * as policy from './js/policy.js'
import * as events from './js/events.js'
// == UI == 
const CLICK_DETECTION_RADIUS = 20
let debug = false
let displayCountries = false
const debugAvailable = ['localhost', '127.0.0.1'].includes(location.hostname)

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
graphics.init(canvas, ctx)
Camera.initCamera(canvas)
window.addEventListener('resize', Camera.resizeCanvas.bind(null, ctx))


let effects = []
let animationFrameId

// == UI/GAME helper functions ==
function findNodeAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    return nodes.find(node => {
        const dx = node.x - worldPos.x
        const dy = node.y - worldPos.y

        return node.active && Math.hypot(dx, dy) < CLICK_DETECTION_RADIUS
    })
}

//to be deprecated
function getEventCoordinates(e) {
    if (e.type.startsWith('touch')) {
        const touch = e.touches?.[0] || e.changedTouches?.[0]
        return touch ? { clientX: touch.clientX, clientY: touch.clientY } : null
    }
    return { clientX: e.clientX, clientY: e.clientY }
}

function findTransactionAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    const activeTransactions = transactions.filter(t => t.active)

    return activeTransactions.find(tx => {
        const dx = tx.x - worldPos.x
        const dy = tx.y - worldPos.y
        const radius = tx.size === 'small' ? 2 : tx.size === 'medium' ? 4 : 6
        return Math.hypot(dx, dy) < Math.max(CLICK_DETECTION_RADIUS, radius * 3)
    })
}



function findUserAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    const activeUsers = users.filter(u => u.active)
    // console.log(`Checking ${activeUsers.length} active users at world position ${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}`)

    if (activeUsers.length === 0) {
        if (debug) console.log('No active users found at', screenX, screenY)
        return null
    }

    const found = activeUsers.find(user => {
        const dx = user.x - worldPos.x
        const dy = user.y - worldPos.y
        const distance = Math.hypot(dx, dy)
        if (distance < CLICK_DETECTION_RADIUS) { // Increased click area for debugging
            // console.log(`User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${distance.toFixed(1)} - MATCH`)
        }
        return distance < CLICK_DETECTION_RADIUS
    })

    if (!found) {
        // console.log('Closest users:')
        activeUsers.slice(0, 3).forEach(user => {
            const dx = user.x - worldPos.x
            const dy = user.y - worldPos.y
            const distance = Math.hypot(dx, dy)
            // console.log(`  User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${distance.toFixed(1)}`)
        })
    }

    return found
}

// TO BE DEPRECATED
function handlePanelClose(e) {
    // Don't handle the event if it's a click on or inside a panel toggle button
    if (e.target.closest('.panel-toggle, .panel-close, .option-button, .game-controls button, .command-button, [role="button"], #gdp-stat-item, .stat-item, select, .compliance-select, .tab-button')) {
        return
    }

    setTimeout(() => {
        const coords = getEventCoordinates(e)
        if (!coords) return

        if (UI.isClickInsideAnyPanel(coords)) return

        const clickedNode = findNodeAt(coords.clientX, coords.clientY)
        if (clickedNode) {
            UI.closeAllPanels(UI.getNodeDetailsPanel())
        } else {
            UI.closeAllPanels()
        }
    }, 50)
}

function handleCanvasClick(screenX, screenY) {
    if (unlock.nodes) {
        const node = findNodeAt(screenX, screenY)
        if (node) {
            UI.clearAllSelections()
            UI.showNodeDetails(node, budget, placeTower, enforceAction)
            return
        }
    }
    const tx = findTransactionAt(screenX, screenY)
    if (tx) {
        // Close any open panels
        UI.closeAllPanels()
        // Select new transaction
        UI.setSelectedTransaction(tx)
        Camera.cinematicPanAndZoom(tx.x, tx.y, 3, 1)
        // Camera.adjustZoom(3)
        UI.showTransactionTooltip(tx)
        return
    }
    const user = findUserAt(screenX, screenY)
    if (user) {
        UI.clearAllSelections()
        UI.showUserDetails(user)
        return
    }
    // Empty space clicked - clear everything
    UI.clearAllSelections()
}

// Initialization of UI elements, waiting for the DOM (and actually the game data)
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI panels 
    UI.initUI()

    // Make arrays available globally for UI manager
    window.transactions = transactions
    window.users = users
    window.nodes = nodes
    window.gdpLog = gdpLog


    // Potential follow button :Active by default
    // document.getElementById('tooltip-follow').addEventListener('click', () => {
    //     const tooltip = document.getElementById('transaction-tooltip')
    //     const tx = tooltip._currentTransaction
    //     if (tx) {
    //         tx.isFollowed = !tx.isFollowed
    //         Camera.panAndZoom(tx.x, tx.y, 3)
    //     }
    // })

    // Hacky budget global access.
    Object.defineProperty(window, 'budget', {
        get: () => budget,
        set: (value) => {
            budget = value
            // UI.updateIndicators(...) 
        }
    })
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
    // Track drag state
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
        tech.addResearchPoints(8000)
        budget += 20000
        if (nodes[5]) nodes[5].reputation = 0
        NEW_NODE_FREQUENCY = 20
    })
    ctrls.countriesBtn.addEventListener('click', () => {
        displayCountries = !displayCountries
        ctrls.countriesBtn.style.backgroundColor = displayCountries ? 'rgba(0, 255, 0, 0.2)' : ''
    })

    ctrls.slowBtn.addEventListener('click', () => {
        speedControl = 0.5
        spawnControl = 0.5

    })
    ctrls.normalBtn.addEventListener('click', () => {
        speedControl = 1
        spawnControl = 1
    })
    ctrls.fastBtn.addEventListener('click', () => {
        speedControl = 2
        spawnControl = 2
    })

    ctrls.restartBtn.addEventListener('click', () => {
        window.location.reload()
    })

    // canvas.addEventListener('mousemove', (e) => {
    //     const rect = canvas.getBoundingClientRect();
    //     lastMouseX = e.clientX - rect.left;
    //     lastMouseY = e.clientY - rect.top;
    //     Camera.moveCamera(e)
    // })


    // Initialize the game
    tech.initTechTree()
    techUI.initTechUI()
    events.initializeEvents()
    initNodes()
    generateUsers()

    // Zoom in slightly when the game starts
    if (isFirstPlay()) {
        speedControl = 0.4
        spawnControl = 0.5
        // Restauring default after a while
        setTimeout(() => {
            spawnControl = 1
            speedControl = 1
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


// == Game data ==
// Game constants
const BASE_SPAWN_RATE = 0.002
const HOLIDAY_SPAWN_BONUS = 10
let NEW_NODE_FREQUENCY = 60
const DISTANCE = {
    MAX_USERTONODE: 150,
    MIN_USERTONODE: 30,
    MIN_USERTOUSER: 25
}
const REPUTATION = {
    STARTING: 80,
    POSTFAILURE: 50,
}

// Economics 
let budget = 120
let maintenance = 0
let gdp = 0
let holiday = false
let dropProbability = 0.00001
let spawnControl = 1
let corruptionSpread = 10
const gdpLog = []
let transactions = []
const startTime = Date.now()
let currentDay = 0
const users = []
let userEdges = []
let nbActiveNodes = 0
let activeNodes = []

// Gameplay
let speedControl = 1
let hoverNode = null
let selectedTransaction = null
let tooltipButtons = [] // Store button coordinates for click detection
let isFirstNewNode = false

// Endgame 
let almostWon = 0
let lastWarningTime = 0
let priorNow = Date.now()
let deltaTime = 0
let dailyDetectedTransactions = 0

const nodes = [
    { id: 0, x: 490, y: 400, corruption: 0, type: 'processor', name: 'PayFlow', active: true },
    { id: 1, x: 500, y: 800, corruption: 0, type: 'processor', name: 'TransactPro' },
    { id: 2, x: 590, y: 640, corruption: 0, type: 'processor', name: 'SecurePay' },
    { id: 3, x: 800, y: 850, corruption: 0, type: 'processor', name: 'FastFunds' },
    { id: 4, x: 950, y: 500, corruption: 0, type: 'processor', name: 'QuickTransfer' },

    { id: 5, x: 600, y: 400, corruption: 0, type: 'bank', name: 'Global Bank', active: true },
    { id: 6, x: 400, y: 450, corruption: 0, type: 'bank', name: 'Trust Bank', active: true },
    { id: 7, x: 350, y: 550, corruption: 3, type: 'bank', name: 'Safe Savings', active: true },
    { id: 8, x: 1050, y: 250, corruption: 0, type: 'bank', name: 'Prime Bank' },
    { id: 9, x: 1130, y: 400, corruption: 0, type: 'bank', name: 'Capital Trust' },
    { id: 10, x: 330, y: 350, corruption: 1, type: 'bank', name: 'Union Bank', active: true },
    { id: 11, x: 540, y: 250, corruption: 0, type: 'bank', name: 'Metro Bank', active: true },
    { id: 12, x: 1100, y: 750, corruption: 5, type: 'bank', name: 'Pioneer Bank' },
    { id: 13, x: 900, y: 300, corruption: 0, type: 'bank', name: 'Elite Bank' },
    { id: 14, x: 800, y: 350, corruption: 0, type: 'bank', name: 'Summit Bank' },
    { id: 15, x: 900, y: 900, corruption: 0, type: 'bank', name: 'Horizon Bank' },
    { id: 16, x: 400, y: 700, corruption: 0, type: 'bank', name: 'Anchor Bank' },
    { id: 17, x: 1000, y: 650, corruption: 4, type: 'bank', name: 'Crest Bank' },
    { id: 18, x: 400, y: 930, corruption: 0, type: 'bank', name: 'Fortune Bank' },
    { id: 19, x: 600, y: 800, corruption: 0, type: 'bank', name: 'Legacy Bank' },
    { id: 20, x: 300, y: 280, corruption: 0, type: 'bank', name: 'Prestige Bank' },

    // New  Fintech nodes
    { id: 21, x: 710, y: 510, corruption: 1, type: 'fintech', name: 'Rocket Pay' },
    { id: 22, x: 810, y: 460, corruption: 0, type: 'fintech', name: 'Astro Finance' },
    { id: 23, x: 1190, y: 400, corruption: 0, type: 'fintech', name: 'Lunar Pay' },
    { id: 24, x: 700, y: 1000, corruption: 1, type: 'fintech', name: 'Orbit Funds' },
    { id: 25, x: 1050, y: 550, corruption: 3, type: 'fintech', name: 'Stellar Bank' },

    // New  Crypto Exchange nodes
    { id: 26, x: 300, y: 750, corruption: 2, type: 'cryptoExchange', name: 'CryptoX' },
    { id: 27, x: 1030, y: 850, corruption: 0, type: 'cryptoExchange', name: 'BitMarket' },
    { id: 28, x: 980, y: 1050, corruption: 6, type: 'cryptoExchange', name: 'CoinTrade' },

]

// Assigns a country to a node based on proximity to country coordinates
function assignCountryToNode(node) {
    let closestCountryKey = null;
    let minDistanceSq = Infinity;

    if (!config.countries || !config.countryKeys) {
        console.error('Country data is not loaded correctly from config.');
        return
    }

    for (const countryKey of config.countryKeys) {
        const country = config.countries[countryKey]

        if (typeof country.x !== 'number' || typeof country.y !== 'number') {
            console.warn(`Country ${countryKey} in config.js is missing x or y coordinates.`)
            continue
        }

        const dx = node.x - country.x;
        const dy = node.y - country.y;
        const distanceSq = dx * dx + dy * dy

        if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            closestCountryKey = countryKey;
        }
    }
    node.country = closestCountryKey
}
function reassignUsersBank(nodeID) {
    //after a bank closure, we reassign users to the nearest bank
    userEdges = userEdges.filter(e => e[1] !== nodeID)
    const usersToUpdate = users.filter(u => u.bankId === nodeID)
    console.log("Users to update", usersToUpdate)
    usersToUpdate.forEach(u => {
        u.bankId = null
        assignNearestBank(u)
    })
}

// for each node, we add empty variables tower:null, detectedAmount:0, receivedAmount:0, reputation:80
function initNodes() {
    nodes.forEach(node => {
        node.tower = null
        node.detectedAmount = 0
        node.receivedAmount = 0
        node.reputation = REPUTATION.STARTING
        node.accuracy = 0
        assignCountryToNode(node); // Assign country based on proximity
        if (isFirstPlay() && node.id != 10 && node.id != 11) {
            node.active = false
        }
        // node.active = true
        // node.reputation = 0
        node.changeReputation = (amount) => {
            if (debugAvailable) {
                console.log(`#${node.id} reputation ${amount > 0 ? "+" : ''}${amount}`)
            }
            node.reputation = Math.min(100, node.reputation + amount)
            if (node.reputation < 0) {
                node.reputation = REPUTATION.POSTFAILURE

                UI.showToast('🚪 Bankruptcy', `Due to its plummeting reputation ${node.name} closes its doors`, 'error')
                policy.changePopularity(-100)
                node.active = false
                node.tower = null
                // Update cached activeNodes immediately since bank failed
                activeNodes = nodes.filter(n => n.active)
                nbActiveNodes = activeNodes.length

                reassignUsersBank(node.id)
            }
        }

        node.completeTransaction = (tx) => {
            //Taxation
            const income = Math.round(tx.amount * policy.getTaxRate())
            budget += income
            if (Camera.getZoom() > 4) {
                addEffect(node.x, node.y, "+" + income, 'budget')
            }

            // Apply legality effects
            node.receivedAmount += tx.amount
            if (tx.legality === 'illegal') {
                addEffect(node.x, node.y, '', 'pulseNode', 'rgba(255, 0, 0, 0.2)')
                // Medium and large transactions increase corruption
                if (tx.size !== 'small') {
                    node.corruption++
                }
                node.changeReputation(-5)
                console.log(`💥 Breach #${node.id}`)
            } else if (tx.legality === 'questionable') {
                node.changeReputation(-1)
                if (debug) console.log(`Questionable transaction at node ${node.id}, from ${tx.path[0]}`)
            } else {
                node.changeReputation(1)
            }

            // Update UI if this node is selected
            if (UI.getSelectedNode()?.id === node.id) {
                UI.showNodeDetails(node, budget, placeTower, enforceAction)
            }
        }
    })
    activeNodes = nodes.filter(n => n.active)
    nbActiveNodes = activeNodes.length
}

const edges = [
    // processor to processor
    [0, 2], [1, 2], [2, 4],
    // processor to banks
    [0, 10], [0, 11], [0, 6], [1, 16], [1, 18], [1, 19], [2, 16], [2, 17], [3, 19], [3, 15], [4, 9], [4, 14], [4, 17], [5, 0],
    // banks to banks
    [6, 7], [8, 13], [9, 13], [10, 11], [10, 20], [11, 13], [11, 14], [12, 17], [13, 14], [15, 17], [16, 18], [17, 19],
    // fintech connections
    [21, 22], [14, 22], [8, 23], [9, 23], [15, 24], [3, 24], [17, 25],
    // crypto exchange connections
    [16, 26], [12, 27], [15, 28],
]

function nameUser(type, country) {
    // todo name based on country too
    switch (type) {
        case 'person':
            // Select a random worldwide common name in alphabet order
            const names = [
                "Alice", "Bob", "Carlos", "David", "Elena", "Fatima", "Giulia", "Hiroshi", "Ines", "Jamal",
                "Khalid", "Linh", "Maria", "Nia", "Omar", "Priya", "Qiang", "Ravi", "Sofia", "Tariq",
                "Umar", "Valeria", "Wei", "Ximena", "Yusuf", "Zara"
            ]
            const vowels = ["a", "e", "i", "o", "u"]
            const conso = country[0]
            let name = conso.toUpperCase()
            for (let i = 0; i < Math.ceil(Math.random() * 2); i++) {
                name += selectRandomly(vowels) + conso.toLowerCase()
            }
            name += selectRandomly(vowels)

            return selectRandomly(names) + ' ' + name

            break;
        case 'business':
            const businessType = ["Cafe", "Salon", "Logistics", "Restaurant", "Hotel", "Shop", "Warehouse", "Factory", "Corp"]
            const businessNames = ["Pink", "Happy", "Twisted", "Arrow", "Star", "Lion", "Panda", "Pirate", "Duck", "Bland", "Ironic", "Hiha"]
            return selectRandomly(businessNames) + ' ' + selectRandomly(businessType)
            break;
        case 'government':
            const governmentType = ["Ministry", "Department", "Agency", "Commission", "Board", "Council", "Office", "Agency", "Commission", "Board", "Council", "Office"]
            const governmentDomains = ["Education", "Health", "Defense", "Justice", "Interior", "Labor", "Transport", "Environment", "Trade", "Tourism", "Science"]
            return selectRandomly(governmentDomains) + ' ' + selectRandomly(governmentType)
            break;
    }
}

function generateUsers(target = false) {
    const targetNodes = target ? [target] : activeNodes.filter(n => n.type !== 'processor')

    targetNodes.forEach(t => {
        const c = nodeTypes[t.type].usersCount
        const finalCount = Math.max(Math.floor(c / 2), Math.ceil(Math.random() * c * 2))  // count/2 to count*2 
        for (let i = 0; i < finalCount; i++) {
            const random = Math.random()
            let type = ''
            if (t.type === 'bank')
                type = random < 0.5 ? 'person' : random < 0.8 ? 'business' : 'government'
            else
                type = random < 0.7 ? 'person' : 'business'
            let user = null;
            let tries = 0;
            let country = nodes[t.id].country
            do {
                const x = t.x + (Math.random() - 0.5) * DISTANCE.MAX_USERTONODE
                const y = t.y + (Math.random() - 0.5) * DISTANCE.MAX_USERTONODE
                const overlapping = nodes.some(n => Math.hypot(x - n.x, y - n.y) < DISTANCE.MIN_USERTONODE) || users.some(u => Math.hypot(x - u.x, y - u.y) < DISTANCE.MIN_USERTOUSER);
                if (!overlapping) {
                    user = {
                        id: `${users.length}`,
                        name: nameUser(type, country),
                        x,
                        y,
                        type: type,
                        country,
                        corruption: Math.floor(Math.random() * countries[country].corruptionRisk), // 0 to 8
                        activity: Math.floor(Math.random() * countries[country].activity),
                        active: true
                    }
                }
                tries++
            } while (!user && tries < 10)

            if (user) {
                // assignNearestBank(user)
                // As we generate around a platform, we don't need to look for the nearest for the moment
                user.bankId = t.id
                userEdges.push([user.id, t.id])
                users.push(user)
            }
        }
    })
}

function assignNearestBank(user) {
    let validNodes = []
    if (user.type === 'government') {
        validNodes = activeNodes.filter(n => n.type === 'bank')
    } else {
        validNodes = activeNodes.filter(n => n.type !== 'processor')
    }
    const nearest = validNodes.sort((a, b) => Math.hypot(user.x - a.x, user.y - a.y) - Math.hypot(user.x - b.x, user.y - b.y))[0]
    if (nearest && Math.hypot(user.x - nearest.x, user.y - nearest.y) < DISTANCE.MAX_USERTONODE) {
        user.bankId = nearest.id;
        userEdges = userEdges.filter(e => e[0] !== user.id);
        userEdges.push([user.id, user.bankId]);
    }
}

function realignUsersBanks() {
    users.forEach(user => {
        const prevBank = user.bankId
        assignNearestBank(user)
        if (user.bankId !== prevBank) {
            const index = userEdges.findIndex(e => e[0] === user.id)
            if (index !== -1) userEdges[index] = [user.id, user.bankId]
        }
    })
}




// == Transaction Management ==



function spawnTransaction() {
    const activeUsers = users.filter(u => u.active)
    if (activeUsers.length === 0) return

    const sourceUser = selectRandomly(activeUsers)
    // let targetUser = selectRandomly(activeUsers.filter(u => u.country !== sourceUser.country))
    const targetUser = selectRandomly(activeUsers.filter(u => u.id !== sourceUser.id))


    if (!sourceUser || !targetUser) {
        // Should never happen
        console.error("Error spawning transaction: missing user.");
        return;
    }
    const sourceBank = nodes[sourceUser.bankId]
    const targetBank = nodes[targetUser.bankId]

    let txPath = []
    if (!sourceBank || !targetBank) {

        txPath = [sourceUser.id, targetUser.id]
    } else {

        const innerPath = getPathFrom(sourceBank.id, targetBank.id)
        if (!innerPath || innerPath.length < 2) return

        txPath = [sourceUser.id, ...innerPath, targetUser.id]
    }

    const newTx = new Transaction(sourceUser, targetUser, txPath, nodes)

    if (debug) {
        console.log(`${newTx.legality === 'illegal' ? '💸' : '💵'} from ${sourceUser.id} to ${newTx.path[newTx.path.length - 1]}`)
    }

    transactions.push(newTx)
    addEffect(sourceUser.x, sourceUser.y, '', 'invertedPulse');

}

function getPathFrom(startId, targetId = null) {
    const visited = new Set();
    const queue = [[startId]];

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        if (!visited.has(current)) {
            visited.add(current);
            for (const [a, b] of edges) {
                const neighbor = (a === current ? b : b === current ? a : null);
                if (neighbor !== null && !visited.has(neighbor) && nodes[neighbor].active) {
                    const newPath = [...path, neighbor];
                    if (neighbor === targetId) return newPath;
                    queue.push(newPath);
                }
            }
        }
    }
    return null;
}

class Transaction {
    constructor(sourceUser, targetUser, path, nodes) {
        this.path = path
        this.index = 0
        this.issuanceDate = Date.now()
        this.x = sourceUser.x
        this.y = sourceUser.y
        this.sourceUser = sourceUser
        this.targetUser = targetUser
        this.active = true
        this.isSelected = false
        this.isFollowed = false
        this.endDate = null
        this.endReason = null
        this.validated = false

        const sourceBank = nodes[sourceUser.bankId]
        this.legality = this._calculateLegality(sourceUser, targetUser, sourceBank)

        // TODO : Updat formula depending on users sizes and for more vairation in amounts. 
        this.amount = Math.round(Math.exp(Math.random() * 4.2)) // 15 on average with log-normal distribution and exponent 4.2 
        this.size = getTransactionSizeName(this.amount) // kept for comptaibility, in the future, we could use directly amount
        this.speed = 0.5 + Math.random() * Math.min(15 / this.amount, 1)
    }

    _calculateLegality(sourceUser, targetUser, sourceBank) {
        // Illegal tx depends on the corruption of the source user (avg 2) and its bank (0 then increase)
        // If corruption is 2, 10% chance of being illegal, 5% chance of being questionable. Increase quickly with bank corruption
        // P2P transactions are more likely to be illegal
        let multi = sourceBank ?
            Math.max(200 / (sourceUser.corruption + sourceBank.corruption * 5 + 1), 20) : // 20 to 200
            Math.max(100 / (sourceUser.corruption + targetUser.corruption + 1), 20)        // 20 to 100

        const dice100 = Math.random() * multi
        return legalityOptions[dice100 < 10 ? 2 : dice100 < 15 ? 1 : 0] // illegal : questionable : legit
    }

    moveTransaction() {
        // Should be updated for P2P tx
        // We are already at the last node. Should not happen
        if (this.index >= this.path.length - 1)
            return
        if (this.freezed)
            return
        const nextId = this.path[this.index + 1]
        const next = this.index + 1 === this.path.length - 1 ?
            users[nextId] :
            nodes[nextId]

        const dx = next.x - this.x
        const dy = next.y - this.y
        const speed = this.speed * tech.bonus.transactionSpeed * speedControl
        const dist = Math.hypot(dx, dy)

        if (dist < speed) {
            // remaining distance to next node is less than the speed of the transaction
            if (!next.active) {
                this.loseTransaction(`Due to ${next.name} closure`)
                return false
            }

            // TODO Could handle active nodes but under audit or investigation. 
            this.index++
            // we check for detection when we reach a node. If detected, there will be no income
            next.receivedAmount += this.amount
            if (detect(next, this)) {
                // TODO : Remove these variables and use log of gdp directly
                next.detectedAmount += this.amount
                dailyDetectedTransactions++
                // we could use a more semantic return to update the tx status
                return
            }


            if (this.index === this.path.length - 2) {
                // We have reached the end of the path
                // in the future, inspection could cost to budget
                // Also, these effect could happen to all nodes, except taxes
                // const isAudited = auditedNodes.some(a => a.id === next.id)
                // if (isAudited) baseIncome = Math.floor(tx.amount / 2)


                // damages will incur
                next.completeTransaction(this)
            }
            if (this.index == this.path.length - 1) {
                // Record for GDP [TODO : we could use transactions array instead]
                gdpLog.push({ amount: this.amount, timestamp: Date.now(), legality: this.legality })

                addEffect(next.x, next.y, '', 'pulse')
                this.endTransaction('completed')

                // Clear selection if this transaction was selected
                if (this.isSelected) {
                    UI.hideTransactionTooltip()
                    UI.clearTransactionSelection()
                }
            }

        } else {
            // Chance of transmission failure
            if (!isFirstPlay() && Math.random() < dropProbability) {
                this.loseTransaction('Due to poor transmissions. Develop the appropriate technologies.')
                return
            }
            //  Move toward target 
            this.x += (dx / dist) * speed
            this.y += (dy / dist) * speed
        }

    }

    loseTransaction(message = '') {
        this.endTransaction('lost')
        console.log("Transaction lost!")
        addEffect(this.x - 2, this.y, "∅", "insitus")
        let lostTransactions = transactions.filter(tx => tx.endReason === 'lost').length
        if (lostTransactions < 2 || lostTransactions % 10 === 0) {
            UI.showToast('∅ Lost transaction', message, 'error')
        }
    }
    validate() {
        let reward = normalRandom(30)
        if (this.validated) {
            UI.showToast('✅ Transaction already validated', `No effect`, 'success')
            return

        }
        switch (this.legality) {
            case 'legit':
                UI.showToast('✅ Transaction validated', `Legit transaction from ${this.sourceUser.name}. `, 'success')
                budget += 1
                addEffect(this.x, this.y, "+1", "budget")
                policy.changePopularity(2)
                this.validated = true

                break;
            case 'questionable':
                if (Math.random() < 0.5) {
                    UI.showToast('✅ Questionable transaction validated', `It was risky, but there with limited consequences`, 'warning')
                    let change = Math.random() < 0.5 ? 5 : -7
                    policy.changePopularity(change)
                    this.validated = true
                    this.legality = 'legit'
                } else {
                    UI.showToast('✅ Questionable transaction validated', `Later reports show that it was part of an illegal scheme, damaging your reputation and budget (-${reward}💰️).`, 'error')
                    policy.changePopularity(reward)
                    budget -= reward
                    this.legality = 'illegal'
                    // (This one is now a normal illegal that could be validated again.)
                }
                break;
            case 'illegal':
                UI.showToast('✅ Illegal transaction validated', `${reward>9?"Strongly damaging":"Damaging"} damaging your reputation (-${reward * 5})`, 'error')
                policy.changePopularity(-reward * 5)
                this.validated = true
                break;
        }
        this.legality = 'legit'
    }
    freeze() {
        let reward = normalRandom(30)
        if (this.wasFreezed) {
            UI.showToast('🧊 Transaction already analyzed', `No effect`, 'warning')
            return
        }
        this.wasFreezed = true
        this.freezed = true
        // addEffect(this.x , this.y, "🧊", "freeze")

        setTimeout(() => {
            this.freezed = false
            switch (this.legality) {
                case 'legit':
                    UI.showToast('🧊 Transaction freezed and analyzed', `Damage in global popularity for freezing a legitimate operation from ${this.sourceUser.name}`, 'error')
                    policy.changePopularity(- reward)
                    break;
                case 'questionable':
                    UI.showToast('🧊 Transaction freezed and analyzed', `Questionable transaction from ${this.sourceUser.name}. Gathering ${reward} in intelligence `, 'error')
                    tech.addResearchPoints(reward)
                    if (Math.random() > 0.5) {
                        this.legality = 'legit'
                    } else {
                        this.legality = 'illegal'
                    }
                    break;
                case 'illegal':
                    UI.showToast('🧊 Transaction freezed and analyzed', `Illegal transaction from ${this.sourceUser.name}. Gathering intelligence ( ${reward * 2}), but the transaction may still cause damage`, 'warning')
                    tech.addResearchPoints(reward * 2)
                    break;
            }

        }, 3000);
    }
    block() {
        console.log('Transaction blocked')
        this.endTransaction('blocked')
        addEffect(this.x - 2, this.y, "❌", "insitus")
        let reward = normalRandom(30)
        switch (this.legality) {
            case 'legit':
                UI.showToast('🛑 Legit transaction blocked', `${reward>9?"Heavy damage":"Damage"} in global popularity (-${reward * 5})`, 'error')
                policy.changePopularity(-reward * 5)
                break;
            case 'questionable':
                if (Math.random() < 0.5) {
                    UI.showToast('🛑 Transaction blocked', `Questionable transaction from ${this.sourceUser.name}. Limited consequences`, 'warning')
                    let change = Math.random() < 0.5 ? 1 : -1
                    policy.changePopularity(change)
                } else {
                    UI.showToast('🛑 Transaction blocked', `Questionable transaction from ${this.sourceUser.name}. Later report show it was part of an illegal scheme, boosting your reputation 🌟 by ${reward}`, 'warning')
                }
                break;
            case 'illegal':
                UI.showToast('🛑 Transaction blocked', `Illegal transaction from ${this.sourceUser.name}has been blocked. Gaining popularity (+${reward})`, 'success')
                policy.changePopularity(reward)
                break;
        }
    }
    endTransaction(reason) {
        this.active = false
        this.endDate = Date.now()
        this.endReason = reason
    // TODO Remove from transactions array 
    // Alternatively we could keep tx for statistics
    // const index = transactions.indexOf(this)
    // if (index > -1) {
    //     transactions.splice(index, 1)
    // }
    }
}

function placeTower(node, towerType) {
    const tower = towerOptions[towerType]


    // Only check if this tower has a tech requirement
    const requiredTech = tower.techRequirement
    if (requiredTech) {
        const progress = tech.getResearchProgress();
        if (!progress[requiredTech]?.researched) {
            UI.showToast('Technology Required', `Research "${requiredTech}" to unlock this tower`, 'error');
            return
        }
    }

    node.accuracy = tower.accuracy * tech.bonus.accuracy + (node.type === 'fintech' ? 0.1 : 0)

    node.tower = towerType
    // node.accuracy = tower.accuracy + (node.type === 'fintech' ? 0.1 : 0)// We move the accuracy to the node for AI usages
    budget -= tower.cost
    maintenance -= tower.maintenance
    console.log(`🛠️ Tower placed at #${node.id}`)
    if (debug) console.log(tower)
    // Update UI immediately after placing tower
    UI.showNodeDetails(node, budget, placeTower, enforceAction)
}

function findConnectedNodes(nodeId) {
    const connectedNodes = []
    for (const [a, b] of edges) {
        if (a === nodeId || b === nodeId) {
            const neighbor = (a === nodeId ? b : a)
            if (nodes[neighbor].active) {
                connectedNodes.push(nodes[neighbor])
            }
        }
    }
    return connectedNodes
}

function enforceAction(node, actionType, free = false) {
    let action = actionOptions[actionType]
    const actionCost = free ? 0 : action.cost * tech.bonus.enforcementCost
    if (budget < actionCost) {
        UI.showToast('Insufficient budget', `You need 💰${actionCost} to perform this action`, 'error')
        return
    } else {
        budget -= actionCost
        node.changeReputation(action.reputationEffect * tech.bonus.reputationDamage)//negative
        policy.changePopularity(action.popularityEffect)
        node.enforcementAction = actionType
        node.enforcementEnd = Date.now() + action.duration * 1000
        if (action.affectsConnected) {
            // identify connected nodes
            let connectedNodes = findConnectedNodes(node.id)
            console.log(`Enforcing ${action.name} on connected nodes:`, connectedNodes)
            connectedNodes.forEach(n => {
                enforceAction(n, 'raid', true)
            })
        }
    }
}

let firstDetection = false
let firstFalsePositive = false
// TODO : Could be a method of the node
function detect(node, tx) {
    // defensive check
    if (!node || !tx)
        console.error("Detect(): Node or tx found", node, tx)

    // No detection if there is no tower
    if (!node.tower)
        return false


    const { detectMod, fpMod } = policy.regulationLevels[policy.state.current]
    let detectionChance = node.accuracy * detectMod * events.detectMod

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5; // Reduce accuracy for small transactions (TODO : could be removed)
    }

    if (debug) console.log(`Detection rolls at ${node.id} with chance ${detectionChance} (Event mod:`, events.detectMod, "PolicyMod", detectMod, "False Positive Mod", fpMod, ").")

    switch (tx.legality) {
        case 'legit':
            if (!isFirstPlay()) {
                // console.log("We check a legit tx with chance ", detectionChance)
                // small chance of false flag, inversely proportional to accuracy, then 10% unless robust tech
                if (Math.random() > detectionChance && Math.random() < towerOptions[node.tower].errors * 0.01 * tech.bonus.falsePositive * fpMod) {
                    addEffect(node.x, node.y, '🔴', "tower")
                    tx.endTransaction("falsePositive")
                    console.log(`🔴 False postive at`, node.name)
                    node.changeReputation(-5) // harmful for reputation, but not for corruption. Also the transaction ends when it shouldn't have, reducing income
                    if (!firstFalsePositive) {
                        UI.showToast(`🔴 First false postive at`, `Reputation damaged at ${node.name}`, 'error')
                        firstFalsePositive = true
                    }
                    return true
                } else {
                    return false
                }
            }
            break;

        case 'questionable':
            if (!isFirstPlay()) {
                // TODO (with better logic on how to improve this tradeoff over time)
                // Questionable tx can be detected as illegal
                if (Math.random() < detectionChance / 2) {
                    console.log(`Suspicious❗ Potential illegal tx detected at #${node.id}`)
                    return true
                    // Questionable tx are more likely to be detected as false positive
                } else if (Math.random() > detectionChance / 2 && Math.random() < towerOptions[node.tower].errors * 0.01 * tech.bonus.falsePositive * fpMod) {
                    console.log(`Suspicious: 🛑 Potential false positive at #${node.id}`)
                    return true
                }
            }

            return false
            break;

        case 'illegal':
            if (Math.random() < detectionChance) {
                tx.endTransaction("detected")
                addEffect(node.x, node.y, '✔️', "tower")
                if (!firstDetection) {
                    UI.showToast('First illegal transaction blocked!', `Detected at ${node.name} (${towerOptions[node.tower].name})`, 'success')
                    firstDetection = true
                }
                console.log(`✔️ Illegal tx blocked #${node.id}`)
                if (debug) console.log(tx)

                // Gain reputation for successful detection
                node.changeReputation(3)

                // Update panel if the detection happens at the selected node
                if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
                    UI.showNodeDetails(node, budget, placeTower, enforceAction)
                }

                return true
            } else {
                return false
            }
            break;

        default:
            console.error("Tx has no legality")
            break;
    }
}

// TODO : restructure with options or an object of effects
function addEffect(x, y, emoji, type = 'default', color = null) {
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
    while (gdpLog.length && gdpLog[0].timestamp < Date.now() - 150 * 1000) {
        gdpLog.shift()
    }
    gdp = gdpLog.reduce((sum, tx) => sum + tx.amount, 0)

    // TODO : use transactions array instead of gdpLog. (currently, tx are cleaned up). E.g.:
    // gdp = transactions.filter(t=>(!t.active&&t.endDate < Date.now()-150*1000)).reduce((sum, tx) => sum + tx.amount, 0)

    budget += maintenance / (60 * 7) * tech.bonus.maintenance// maintenance is per week for balance   

}

function removeExpiredEnforcementActions(now) {
    nodes.filter(node => node.enforcementAction)
        .forEach(node => {
            if (node.enforcementEnd <= now) {
                let endingAction = actionOptions[node.enforcementAction]
                node.corruption = Math.round(node.corruption * endingAction.corruptionEffect / tech.bonus.enforcementEfficiency)
                node.enforcementAction = null
                node.enforcementEnd = null
                UI.showToast(`${endingAction.icon} ${endingAction.name} ended`, `Corruption reduced at ${node.name}`, 'info')
                console.log(`✅ Enforcement action ended at node ${node.id}`)

                // Update the panel if the audited node is selected
                if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
                    UI.showNodeDetails(node, budget, placeTower, enforceAction)
                }
            }
        })
}

function calculateCorruptionSpread() {
    const totalCorruption = activeNodes.reduce((sum, n) => sum + n.corruption, 0)
    return Math.floor((totalCorruption / (HIGH_CORRUPTION_THRESHOLD * activeNodes.length + 2)) * 100)
}

function increaseAIaccuracy() {
    nodes.filter(n => n.active && (n.tower === "ai" || n.tower === "super"))
        .forEach(n => {
            if (n.tower === "ai" && n.accuracy < 0.85) {
                n.accuracy *= 1.005 * tech.bonus.aiLearning
            } else if (n.tower === "super" && n.accuracy < 0.98) {
                n.accuracy += 1.01 * tech.bonus.aiLearning
            }
        })
}

function getTowerLevel(tower) {
    if (!tower) return 0
    if (tower === 'basic') return 1
    if (tower === 'medium') return 2
    return 3
}

function checkNodesCompliance() {
    if (policy.state.minCompliance === 0) {
        return
    }

    // We check 10% of the time 
    if (Math.random() > 0.1) {
        return
    }

    const nonCompliantNodes = nodes.filter(node =>
        node.active && getTowerLevel(node.tower) < policy.state.minCompliance
    )

    if (nonCompliantNodes.length > 0) {
        const node = selectRandomly(nonCompliantNodes)
        const targetTower = ['basic', 'medium'][policy.state.minCompliance - 1]

        let cost = config.towerOptions[targetTower].cost
        if (targetTower === 'medium' && !node.tower) {
            cost += config.towerOptions.basic.cost
        }

        if (budget >= cost) {
            node.tower = targetTower
            node.accuracy = config.towerOptions[targetTower].accuracy
            budget -= cost

            UI.showToast('🏛️ Automated Compliance',
                `${node.name} installed ${config.towerOptions[targetTower].name} (-${cost})`,
                'warning')

            // Update UI if this node is selected
            if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
                UI.showNodeDetails(node, budget, placeTower, enforceAction)
            }
        } else {
            UI.showToast(`🏛️ Automated Compliance Failure`,
                `Insufficient funds for compliance at ${node.name}. Reputation and popularity penalty.`,
                `error`)
            node.reputation -= 10
            policy.changePopularity(-10)
        }
    }
}

function activateNode(node) {
    node.active = true
    console.log(`🌟 New node activated #${node.id}`);
    UI.showToast('🌟 A new actor has emerged', `Welcome ${node.name}`, 'info');
    if (node.reputation !== 50) {
        generateUsers(node)
    } else {
        realignUsersBanks()
    }
}

function checkEndGame() {
    const now = Date.now();

    // Warning states
    if (now - lastWarningTime > 30000) {
        if (corruptionSpread >= 80 && corruptionSpread < 100) {
            UI.showToast('⚠️ Critical Warning', 'Corruption is dangerously high!', 'error');
            lastWarningTime = now;
        } else if (budget < 0 && budget >= -100) {
            UI.showToast('💰 Financial Warning', 'Budget is critically low!', 'error');
            lastWarningTime = now;
        } else if (policy.popularity <= 100 && policy.popularity > 0) {
            UI.showToast('😡 Sentiment Warning', 'Your popularity is very low!', 'error');
            lastWarningTime = now;
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
                UI.showToast('🎯 Victory Approaching', 'Maintain low corruption for 3 more days to win!', 'success');
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
    const inactiveNodes = nodes.filter(n => !n.active && edges.some(([a, b]) => (a === n.id && nodes[b].active) || (b === n.id && nodes[a].active)));
    if (inactiveNodes.length > 0) {
        const newNode = inactiveNodes[Math.floor(Math.random() * inactiveNodes.length)];
        if (policy.state.requireValidation) {
            policy.addPendingNode(newNode);
            UI.showToast('⚖️  Approval needed', `${newNode.name} awaits regulatory clearance`, 'info');
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
    // == Updade the game display ==
    const now = Date.now()

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (debug) Camera.drawCameraInfo(ctx)
    if (debug || window.showFPS) {
        const newDeltaTime = now - priorNow
        priorNow = now
        ctx.font = '18px sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`FPS: ${Math.round(1000 / ((deltaTime + newDeltaTime) / 2))}`, 10, 70)
        deltaTime = newDeltaTime
    }
    Camera.applyCamera(ctx)
    if (debug) Camera.drawDebugGrid(ctx)
    userEdges.forEach(edge => graphics.drawUserEdge(edge, users, nodes))
    edges.filter(([a, b]) => nodes[a].active && nodes[b].active)
        .forEach(edge => graphics.drawEdge(edge, nodes));
    nodes.filter(n => n.active).forEach(node => graphics.drawNode(node, debug))
    users.filter(n => n.active).forEach(user => graphics.drawUser(user, debug))
    transactions.forEach(tx => {
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
        // if (!UI.isTransactionTooltipVisible()) {
        UI.showTransactionTooltip(selectedTx)
        // }
    } else {
        // UI.hideTransactionTooltip()
        // if (hoverNode && !UI.getSelectedNode()) {
        //     graphics.drawTooltip(hoverNode)
        // }
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
        techUI.updateResearchUI();
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
        activeNodes = nodes.filter(n => n.active) // light optimisation, we check once a day: checkNodesCompliance and spawnNodes might have changed the count. 
        nbActiveNodes = activeNodes.length
        dailyDetectedTransactions = 0 // reinit at the end of a new day, tx will accumulate during the frames of the day. 
    }
    transactions = transactions.filter(t => t.active);
    window.transactions = transactions // Keep global reference updated

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
        const spawnRate = nbActiveNodes * holidayBonus * Math.log10(currentDay + 1) * BASE_SPAWN_RATE * spawnControl
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
    animationFrameId = requestAnimationFrame(gameLoop)
}

