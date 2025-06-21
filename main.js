import * as Camera from './js/camera.js'
import * as UI from './js/ui-manager.js'
import * as config from './js/config.js'
Object.assign(window, config) // (Made for compatibility with prior versions)
import * as graphics from './js/graphics.js'
import * as tech from './js/tech.js'
import * as techUI from './js/tech-ui.js'
import { showTutorial, isFirstPlay } from './js/tutorial.js'

import * as policy from './js/policy.js'
// == UI == 
let debug = false
let displayCountries = false
const debugAvailable = ['localhost', '127.0.0.1'].includes(location.hostname)

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
graphics.init(canvas, ctx)
Camera.initCamera(canvas)
window.addEventListener('resize', Camera.resizeCanvas.bind(null, ctx))

const centerBtn = document.getElementById('center-view')
const debugBtn = document.getElementById('toggle-debug')
const countriesBtn = document.getElementById('toggle-countries')
const slowBtn = document.getElementById('slow')
const normalBtn = document.getElementById('normal')
const fastBtn = document.getElementById('fast')
const restartBtn = document.getElementById('restart-game')

let effects = []
let animationFrameId

// == UI/GAME helper functions ==
function findNodeAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    return nodes.find(node => {
        const dx = node.x - worldPos.x
        const dy = node.y - worldPos.y

        return node.active && Math.hypot(dx, dy) < 20
    })
}

function getEventCoordinates(e) {
    if (e.type.startsWith('touch')) {
        const touch = e.touches?.[0] || e.changedTouches?.[0]
        return touch ? { clientX: touch.clientX, clientY: touch.clientY } : null
    }
    return { clientX: e.clientX, clientY: e.clientY }
}

function findUserAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    const activeUsers = users.filter(u => u.active)
    console.log(`Checking ${activeUsers.length} active users at world position ${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}`)

    if (activeUsers.length === 0) {
        console.log('No active users found')
        return null
    }

    const found = activeUsers.find(user => {
        const dx = user.x - worldPos.x
        const dy = user.y - worldPos.y
        const distance = Math.hypot(dx, dy)
        if (distance < 20) { // Increased click area for debugging
            console.log(`User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${distance.toFixed(1)} - MATCH`)
        }
        return distance < 20
    })

    if (!found) {
        console.log('Closest users:')
        activeUsers.slice(0, 3).forEach(user => {
            const dx = user.x - worldPos.x
            const dy = user.y - worldPos.y
            const distance = Math.hypot(dx, dy)
            console.log(`  User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${distance.toFixed(1)}`)
        })
    }

    return found
}

function handlePanelClose(e) {
    // Don't handle the event if it's a click on or inside a panel toggle button
    if (e.target.closest('.panel-toggle, .panel-close, .option-button, .game-controls button, .command-button, [role="button"], #gdp-stat-item, .stat-item')) {
        return
    }

    setTimeout(() => {
        const coords = getEventCoordinates(e)
        if (!coords) return

        if (UI.isClickInsideAnyPanel(coords)) return

        const clickedNode = findNodeAt(coords.clientX, coords.clientY)
        if (clickedNode) {
            UI.closeAllPanels(document.getElementById('node-details-panel'))
        } else {
            UI.closeAllPanels()
        }
    }, 50)
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
    // Set initial canvas size and enable touch/mouse camera actions
    Camera.resizeCanvas(ctx)
    Camera.setCameraActions()

    // First-time setup
    if (isFirstPlay()) {
        document.getElementById('gdp-stat-item').style.display = 'none'
        document.getElementById('maintenance-stat-item').style.display = 'none'
    }
    if (!debugAvailable) {
        document.getElementById('debug-controls').style.display = "none"
    }

    // Track drag state
    let isDragging = false

    // Unified click handler for canvas
    canvas.addEventListener('mousedown', (e) => {
        isDragging = false
        const node = findNodeAt(e.clientX, e.clientY)
        const user = findUserAt(e.clientX, e.clientY)

        if (node || user) {
            // Don't start dragging when clicking on interactive elements
            return
        } else {
            Camera.startDrag(e)
            isDragging = true
        }
    })

    canvas.addEventListener('click', (e) => {
        if (isDragging) return

        e.stopPropagation() // Prevent document click handler from interfering

        const user = findUserAt(e.clientX, e.clientY)
        if (user) {
            UI.showUserDetails(user)
            return
        }

        const node = findNodeAt(e.clientX, e.clientY)
        if (node) {
            UI.showNodeDetails(node, budget, placeTower, enforceAction)
            return
        }

        // Empty space clicked - hide all panels
        UI.closeAllPanels()
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

    // Handle touch interactions
    canvas.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0]
        const node = findNodeAt(touch.clientX, touch.clientY)
        if (node) {
            UI.showNodeDetails(node, budget, placeTower, enforceAction)
        }
    })

    document.addEventListener('click', handlePanelClose)
    document.addEventListener('touchstart', handlePanelClose, { passive: false })


    centerBtn.addEventListener('click', Camera.centerView.bind(null, nodes))
    debugBtn.addEventListener('click', () => {
        debug = !debug
        debugBtn.style.backgroundColor = debug ? 'rgba(255, 0, 0, 0.2)' : ''
        tech.addResearchPoints(8000)
        budget += 20000
        if (nodes[5]) nodes[5].reputation = 0
        speedControl = 0.5
        NEW_NODE_FREQUENCY = 20
    })
    countriesBtn.addEventListener('click', () => {
        displayCountries = !displayCountries
        countriesBtn.style.backgroundColor = displayCountries ? 'rgba(0, 255, 0, 0.2)' : ''
    })

    slowBtn.addEventListener('click', () => {
        speedControl = 0.5
        spawnControl = 0.5

    })
    normalBtn.addEventListener('click', () => {
        speedControl = 1
        spawnControl = 1
    })
    fastBtn.addEventListener('click', () => {
        speedControl = 2
        spawnControl = 2
    })

    restartBtn.addEventListener('click', () => {
        window.location.reload()
    })

    // canvas.addEventListener('mousemove', (e) => {
    //     const rect = canvas.getBoundingClientRect();
    //     lastMouseX = e.clientX - rect.left;
    //     lastMouseY = e.clientY - rect.top;
    //     Camera.moveCamera(e)
    // })

    setTimeout(() => {
        document.getElementById('policy-button').style.display = 'block'
        document.getElementById('policy-button').classList.remove('hidden')
    }, debugAvailable ? 120 : 100000)

    // Initialize the game
    tech.initTechTree()
    techUI.initTechUI()
    initNodes()
    generateUsers()

    // Zoom in slightly when the game starts
    if (isFirstPlay()) {
        speedControl = 0.5
        spawnControl = 0.5
        // Restauring default after a while
        setTimeout(() => {
            spawnControl = 1
        }, 10000)
        setTimeout(() => {
            speedControl = 1
        }, 20000)
        setTimeout(() => {
            document.getElementById('gdp-stat-item').style.display = 'block'
            document.getElementById('maintenance-stat-item').style.display = 'block'
        }, 100000)
        showTutorial()
        Camera.centerView(nodes, -50)

    } else {
        Camera.centerView(nodes, 0)

    }
    Camera.cinematicZoom(window.innerWidth < 600 ? 1.1 : 1.8)
    gameLoop()
})


// == Game data ==
// Economics & Game play
let budget = 120
let maintenance = 0
let gdp = 0
// let globalReputation = 100 // Todo
let holiday = false
let dropProbability = 0.00001
let speedControl = 1
let spawnControl = 1
let almostWon = 0
let spread = 5
let lastWarningTime = 0

// Game constants
const BASE_SPAWN_RATE = 0.002
const HOLIDAY_SPAWN_BONUS = 10
const MAX_DISTANCE_USERTONODE = 150
let NEW_NODE_FREQUENCY = 60

// Game internal data 
const gdpLog = []
let transactions = []
const startTime = Date.now()
let currentDay = 0
const users = []
let userEdges = []


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
        return;
    }

    for (const countryKey of config.countryKeys) {
        const country = config.countries[countryKey]

        if (typeof country.x !== 'number' || typeof country.y !== 'number') {
            console.warn(`Country ${countryKey} in config.js is missing x or y coordinates.`)
            continue;
        }

        const dx = node.x - country.x;
        const dy = node.y - country.y;
        const distanceSq = dx * dx + dy * dy

        if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            closestCountryKey = countryKey;
        }
    }
    node.country = closestCountryKey;
}

// for each node, we add empty variables tower:null, detectedAmount:0, receivedAmount:0, reputation:80
function initNodes() {
    nodes.forEach(node => {
        node.tower = null
        node.detectedAmount = 0
        node.receivedAmount = 0
        node.reputation = 80 // Default node reputation
        node.accuracy = 0
        assignCountryToNode(node); // Assign country based on proximity
        if (isFirstPlay() && node.id != 10 && node.id != 11) {
            node.active = false
        }
        // node.active = true
        // node.reputation = 0
        node.changeReputation = (amount) => {
            console.log(`${node.name} reputation changed by ${amount}`)
            node.reputation = Math.min(100, node.reputation + amount)
            if (node.reputation < 0) {
                node.reputation = 50 // Magical number for post-bankruptcy

                UI.showToast('Bankruptcy', `Due to its plummeting reputation ${node.name} closes its doors`, 'errors')
                node.active = false
                node.tower = null
                userEdges = userEdges.filter(e => e[1] !== node.id)
                const usersToUpdate = users.filter(u => u.bankId === node.id)
                console.log("Users to update", usersToUpdate)
                // usersToUpdate.forEach(u => u.active = false)
                usersToUpdate.forEach(u => {
                    u.bankId = null
                    assignNearestBank(u)
                }
                )
            }
        }
    })
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
    const activeNodes = nodes.filter(n => n.type !== 'processor' && n.active)
    const targetNodes = target ? [target] : activeNodes

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
                const x = t.x + (Math.random() - 0.5) * 150;
                const y = t.y + (Math.random() - 0.5) * 150;
                const overlapping = nodes.some(n => Math.hypot(x - n.x, y - n.y) < 30) || users.some(u => Math.hypot(x - u.x, y - u.y) < 25);
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
    let activeNodes = []
    if (user.type === 'government') {
        activeNodes = nodes.filter(n => n.type === 'bank' && n.active)
    } else {
        activeNodes = nodes.filter(n => n.type !== 'processor' && n.active)
    }
    const nearest = activeNodes.sort((a, b) => Math.hypot(user.x - a.x, user.y - a.y) - Math.hypot(user.x - b.x, user.y - b.y))[0]
    if (nearest && Math.hypot(user.x - nearest.x, user.y - nearest.y) < MAX_DISTANCE_USERTONODE) {
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


function selectRandomly(array) {
    return array[Math.floor(Math.random() * array.length)];
}
// == Canvas drawing functions == 

function spawnTransaction() {
    const activeUsers = users.filter(u => u.active)
    if (activeUsers.length === 0) return

    const sourceUser = selectRandomly(activeUsers)
    // let targetUser = selectRandomly(activeUsers.filter(u => u.country !== sourceUser.country))
    let targetUser = selectRandomly(activeUsers.filter(u => u.id !== sourceUser.id))


    if (!sourceUser || !targetUser) {
        // Should never happen
        console.error("Error spawning transaction: missing user.");
        return;
    }
    const sourceBank = nodes[sourceUser.bankId]
    const targetBank = nodes[targetUser.bankId]

    let multi = 1
    let txPath = []
    if (!sourceBank || !targetBank) {
        // we have no bank connecting users, they will do a P2P transaction. it is more likely to be illegal
        // Multi is 20 to 100, 25
        multi = Math.max(100 / (sourceUser.corruption + targetUser.corruption + 1), 20)
        txPath = [sourceUser.id, targetUser.id]
    } else {

        // Illegal tx depends on the corruption of the source user (avg 2) and its bank (0 then increase)
        // If corruption is 2, 10% chance of being illegal, 5% chance of being questionable. Increase quickly with bank corruption
        multi = Math.max(200 / (sourceUser.corruption + sourceBank.corruption * 5 + 1), 20) // 20 to 200 
        // console.log("factor", 30 / (sourceUser.corruption + sourceBank.corruption * 5 + 1))
        // console.log(multi, sourceUser.corruption, sourceBank.corruption)
        const innerPath = getPathFrom(sourceBank.id, targetBank.id)
        if (!innerPath || innerPath.length < 2) return

        txPath = [sourceUser.id, ...innerPath, targetUser.id]
    }

    const dice100 = Math.random() * multi
    const legality = legalityOptions[dice100 < 10 ? 2 : dice100 < 15 ? 1 : 0]
    const amount = Math.round(Math.exp(Math.random() * 4.2)) // 15 in average with a log normal distribution
    const size = amount < 9 ? 'small' : amount < 30 ? 'medium' : 'large'

    const newTx = {
        path: txPath,
        index: 0,
        issuanceDate: Date.now(),
        terminationDate: null,
        x: sourceUser.x,
        y: sourceUser.y,
        speed: 0.5 + Math.random() * Math.min(15 / amount, 1),
        legality,
        size, // kept for comptaibility, in the future, we could use directly amount
        amount,
        sourceUser,
        active: true,
    }
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

let lostTransactions = 0
function loseTransaction(tx, message = '') {
    tx.active = false
    tx.end = "lost"
    console.log("Transaction lost!")
    addEffect(tx.x - 2, tx.y, "∅", "insitus")
    if (lostTransactions < 2 || lostTransactions % 10 === 0) {
        UI.showToast('∅ Lost transaction', message, 'error')
    }
    lostTransactions++
}
function moveTransaction(tx) {
    const prec = nodes[tx.path[tx.index]]
    let next
    //convoluted approach as we store nodes and users in different tables
    // could be either joined or final destination stored separately
    if (tx.index == tx.path.length - 2) {
        next = users[tx.path[tx.index + 1]]
    } else {
        next = nodes[tx.path[tx.index + 1]]
    }
    if (!next) return  // we had reached the end of the path

    const dx = next.x - tx.x
    const dy = next.y - tx.y
    let speed = tx.speed * tech.bonus.transactionSpeed * speedControl

    const dist = Math.hypot(dx, dy)

    if (dist < speed) {
        // remaining distance to next node is less than the speed of the transaction
        if (!next.active) {
            loseTransaction(tx, `Due to ${next.name} closure`)
            return
        }
        tx.index++
        // we check for detection when we reach a node. If detected, there will be no income
        next.receivedAmount += tx.amount
        if (detect(tx)) {
            dailyDetectedTransactions++
            tx.active = false
            return
        }
        if (tx.index == tx.path.length - 2) {
            // We have reached the end of the path
            // in the future, inspection could cost to budget
            // Also, these effect could happen to all nodes, except taxes
            // const isAudited = auditedNodes.some(a => a.id === next.id)
            // if (isAudited) baseIncome = Math.floor(tx.amount / 2)
            gdpLog.push({ amount: tx.amount, timestamp: Date.now(), legality: tx.legality })
            let income = Math.round(tx.amount * policy.getTaxRate())
            budget += income


            // Budget effect. Only if zoomed to reduce load
            if (Camera.getZoom() > 4) {
                addEffect(next.x, next.y, "+" + income, 'budget')
            }


            if (tx.legality === 'illegal') {

                addEffect(next.x, next.y, '', 'pulseNode', 'rgba(255, 0, 0, 0.2)')

                next.corruption++
                // addEffect(next.x, next.y, '💥')
                next.changeReputation(-5) // Reputation decrease when illegal transactions go through
                // UI.showToast('Illegal transaction completed', 'Corruption increased at ' + next.name, 'error')
                console.log(`💥 Breach at node ${next.id}, from ${tx.path[0]}`)
            } else if (tx.legality === 'questionable') {
                // addEffect(next.x, next.y, '', 'pulseNode', 'rgba(255, 187, 0, 0.2)')
                if (debug) console.log(`Questionable transaction at node ${next.id}, from ${tx.path[0]}`)
                // no particular effect
            } else {
                next.changeReputation(1)// Small reputation gain for legitimate transactions
                // addEffect(next.x, next.y, '', 'pulseNode', 'rgba(0, 255, 0, 0.2)')

            }

            // Update panel if the affected node is selected
            if (UI.getSelectedNode() && UI.getSelectedNode().id === next.id) {
                UI.showNodeDetails(next, budget, placeTower)
            }

        }
        if (tx.index == tx.path.length - 1) {
            addEffect(next.x, next.y, '', 'pulse')
            tx.active = false
            tx.end = 'success'
        }
    } else {
        if (Math.random() < dropProbability) {
            loseTransaction(tx, `Due to poor tranmissions. Develop the appropriate technologies.`)

        }
        tx.x += (dx / dist) * speed
        tx.y += (dy / dist) * speed
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
            return;
        }
    }

    node.accuracy = tower.accuracy * tech.bonus.accuracy + (node.type === 'fintech' ? 0.1 : 0)

    node.tower = towerType
    // node.accuracy = tower.accuracy + (node.type === 'fintech' ? 0.1 : 0)// We move the accuracy to the node for AI usages
    budget -= tower.cost
    maintenance -= tower.maintenance
    console.log(`🛠️ Tower placed at node ${node.id}`)
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
function detect(tx) {
    const node = nodes[tx.path[tx.index]]

    if (!node || !node.tower) return false


    const { detectMod, fpMod } = policy.regulationLevels[policy.state.current]

    let detectionChance = node.accuracy * detectMod // towerOptions[node.tower].accuracy

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5; // Reduce accuracy for small transactions
    }
    if (tx.legality === 'legit') {
        // console.log("We check a legit tx with chance ", detectionChance)
        // small chance of false flag, inversely proportional to accuracy, then 10% unless robust tech
        if (Math.random() > detectionChance && Math.random() < towerOptions[node.tower].errors * 0.01 * tech.bonus.falsePositive * fpMod) {
            addEffect(node.x, node.y, '🛑', "tower")
            tx.active = false
            tx.end = "FalsePositive"
            console.log(`🛑 False postive at `, node.name)
            node.changeReputation(-5) // harmful for reputation, but not for corruption. Also the transaction ends when it shouldn't have, reducing income
            if (!firstFalsePositive) {
                UI.showToast(`🛑 First false postive at`, `Reputation damaged at ${node.name}`, 'error')
                firstFalsePositive = true
            }
            return true

        }
    }


    if (tx.legality !== 'illegal') return

    if (debug) console.log(`Detection roll at ${node.id}, chance: ${detectionChance}`)


    if (Math.random() < detectionChance) {
        tx.active = false
        tx.end = "detected"
        addEffect(node.x, node.y, '✔️', "tower")
        if (!firstDetection) {
            UI.showToast('First illegal transaction blocked!', `Detected at ${node.name} (${towerOptions[node.tower].name})`, 'success')
            firstDetection = true
        }
        console.log(`✔️ Illegal tx blocked at node ${node.id}`)
        node.detectedAmount += tx.amount
        node.receivedAmount += tx.amount

        // To be refined, a percentage of the amount could still reach the budget 
        let income = Math.round(tx.amount * policy.getTaxRate())
        budget += income
        addEffect(node.x, node.y, income, 'budget')

        // Gain reputation for successful detection
        node.changeReputation(3)

        // Update panel if the detection happens at the selected node
        if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
            UI.showNodeDetails(node, budget, placeTower, enforceAction)
        }

        if (debug) console.log(tx)
        return true
    } else {
        return false
    }
}

function addEffect(x, y, emoji, type = 'default', color = null) {
    let timer = 0
    switch (type) {
        case 'default':
            timer = 30// Emojis for big actions
            break
        case 'invertedPulse':
        case 'pulseNode':
            timer = 10
            break;
        case 'pulse':
            timer = 8
            break
        default:
            timer = 15 // small text notifications)

    }
    effects.push({ x, y, emoji, timer: timer, type: type, color: color })

}

let hoverNode = null
let hoverTimeout = null

function calculateIndicators() {
    // Remove old transactions from the log (older than 150 seconds, each second is a day)
    while (gdpLog.length && gdpLog[0].timestamp < Date.now() - 150 * 1000) {
        gdpLog.shift()
    }
    gdp = gdpLog.reduce((sum, tx) => sum + tx.amount, 0)

    budget += maintenance / (60 * 7) * tech.bonus.maintenance// maintenance is per week for balance   

}

function removeExpiredEnforcementActions(now) {
    nodes.filter(node => node.enforcementAction)
        .forEach(node => {
            if (node.enforcementEnd <= now) {
                let endingAction = actionOptions[node.enforcementAction]
                node.corruption = Math.round(node.corruption * endingAction.corruptionEffect * tech.bonus.enforcementEfficiency)
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
    let activeNodes = nodes.filter(n => n.active)
    const totalCorruption = activeNodes.reduce((sum, n) => sum + n.corruption, 0)
    return Math.floor((totalCorruption / (HIGH_CORRUPTION_THRESHOLD * activeNodes.length + 2)) * 100)
}

function increaseAIaccuracy() {
    nodes.filter(n => n.active && n.tower === "ai" || n.tower === "super")
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
                `Insufficient funds for compliance at ${node.name}. Reputation and sentiment penalty.`,
                `error`)
            node.reputation -= 10
            policy.changeSentiment(-10)
        }
    }
}

function activateNode(node) {
    node.active = true
    console.log(`🌟 New node activated: ${node.name}`);
    UI.showToast('🌟 A new actor has emerged', `Welcome ${node.name}`, 'info');
    if (node.reputation !== 50) {
        generateUsers(node)
    } else {
        realignUsersBanks()
    }
}

let priorNow = Date.now()
let deltaTime = 0
let dailyDetectedTransactions = 0


function checkEndGame() {

    const now = Date.now();

    // Warning states
    if (now - lastWarningTime > 30000) {
        if (spread >= 80 && spread < 100) {
            UI.showToast('⚠️ Critical Warning', 'Corruption is dangerously high!', 'error');
            lastWarningTime = now;
        } else if (budget < -50 && budget >= -100) {
            UI.showToast('💰 Financial Warning', 'Budget is critically low!', 'error');
            lastWarningTime = now;
        } else if (policy.sentiment <= 20 && policy.sentiment > 0) {
            UI.showToast('😡 Sentiment Warning', 'Public sentiment is very low!', 'error');
            lastWarningTime = now;
        }
    }

    // Loosing cases
    if (spread >= 100) {
        graphics.drawEndGame('Corruption has reached critical levels!')
        restartBtn.classList.remove('hidden')
        return true
    }

    if (budget < -100) {
        graphics.drawEndGame('The country is bankrupt!')
        restartBtn.classList.remove('hidden')
        return true
    }

    if (policy.sentiment <= 0) {
        graphics.drawEndGame('The ecosystem disapproves of your policies!')
        restartBtn.classList.remove('hidden')
        return true
    }

    // Victory condition Low corruption maintained
    if (spread < 2) {
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

function gameLoop() {

    // == Update the game state == 
    const now = Date.now()
    const newCurrentDay = Math.floor((now - startTime) / 1000) // in seconds
    if (newCurrentDay !== currentDay) {
        currentDay = newCurrentDay
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
        // We perform the following tasks once a day
        UI.updateDate(currentDay, holiday)
        if (currentDay % Math.round(NEW_NODE_FREQUENCY / spawnControl) === 0) {
            // Every 60 days, a new node is added
            const inactiveNodes = nodes.filter(n => !n.active && edges.some(([a, b]) => (a === n.id && nodes[b].active) || (b === n.id && nodes[a].active)));
            if (inactiveNodes.length > 0) {
                const newNode = inactiveNodes[Math.floor(Math.random() * inactiveNodes.length)];
                if (policy.state.requireValidation) {
                    policy.addPendingNode(newNode);
                    UI.showToast('⚖️  Approval needed', `${newNode.name} awaits regulatory clearance`, 'info');
                } else {
                    activateNode(newNode);
                }
            }
            policy.tickSentiment()
        }
        const researchPointsGain = tech.calculateResearchPointsGain(gdp, dailyDetectedTransactions)
        tech.addResearchPoints(researchPointsGain)
        if (researchPointsGain > 0) {
            //   UI.showToast('Research Progress', `Gained ${researchPointsGain} Research Points`, 'info')
        }
        dailyDetectedTransactions = 0
        techUI.updateResearchUI();


        increaseAIaccuracy()
        checkNodesCompliance()
        if (UI.getSelectedNode()) {
            UI.updateCurrentNodeDetails(budget, placeTower, enforceAction)
        }

        removeExpiredEnforcementActions(now)
        spread = calculateCorruptionSpread()
        if (!isFirstPlay()) {
            if (checkEndGame()) return
        }
    }
    if (transactions.filter(t => t.active).length === 0) {
        // ensure there is always a transaction going
        spawnTransaction()
    } else {
        const nbActiveNodes = nodes.filter(n => n.active).length
        const holidayBonus = holiday ? HOLIDAY_SPAWN_BONUS : 1
        const spawnRate = nbActiveNodes * holidayBonus * Math.log10(currentDay + 1) * BASE_SPAWN_RATE * spawnControl
        if (Math.random() < spawnRate) {
            spawnTransaction()
        }
    }

    calculateIndicators()

    // == Updade the game display ==
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (debug) Camera.drawCameraInfo(ctx)
    if (debug) {
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
    nodes.filter(n => n.active).forEach(node => graphics.drawNode(node, debug));
    users.filter(n => n.active).forEach(user => graphics.drawUser(user, debug))
    transactions = transactions.filter(t => t.active);
    window.transactions = transactions; // Keep global reference updated
    transactions.forEach(tx => {
        moveTransaction(tx)
        graphics.drawTransaction(tx)
    })
    graphics.drawEffects(effects)
    // Filter out expired effects
    effects = effects.filter(e => e.timer > 0)
    if (displayCountries) {
        graphics.drawCountries(nodes, users)
    }


    Camera.restoreCamera(ctx)

    // == Update the UI ==
    UI.updateIndicators(budget, gdp, maintenance * tech.bonus.maintenance)

    // Update GDP panel (function will check if visible)
    UI.updateGDPPanel()

    if (hoverNode && !UI.getSelectedNode()) {
        graphics.drawTooltip(hoverNode)
    } else {
        // const worldPos = Camera.getWorldPosition(lastMouseX, lastMouseY)
        // const hoveredUser = users.find(user => Math.hypot(worldPos.x - user.x, worldPos.y - user.y) < 15)
        // if (hoveredUser) drawUserTooltip(hoveredUser)
    }

    if (!isFirstPlay()) {
        graphics.drawCorruptionMeter(spread)
    }

    animationFrameId = requestAnimationFrame(gameLoop)
}

