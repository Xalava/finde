import * as Camera from './js/camera.js'
import * as UI from './js/ui-manager.js'
import { towerOptions, legalityOptions, txSizeOptions, nodeTypes, actionOptions, userTypes, CORRUPTION_THRESHOLD } from './js/config.js'
import * as tech from './js/tech.js'
import * as techUI from './js/tech-ui.js'
// == UI == 
let debug = false
const debugAvailable = ['localhost', '127.0.0.1'].includes(location.hostname);

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
Camera.initCamera(canvas)
window.addEventListener('resize', Camera.resizeCanvas.bind(null, ctx))

const centerBtn = document.getElementById('center-view')
const debugBtn = document.getElementById('toggle-debug')

let effects = []
const uiFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
let animationFrameId

// Initialization of UI elements, waiting for the DOM (and actually the game data)
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI panels 
    UI.initUI()
    // Set initial canvas size and enable touch/mouse camera actions
    Camera.resizeCanvas(ctx)
    Camera.setCameraActions()
    if (!debugAvailable) document.getElementById('toggle-debug').style.display = "none"

    centerBtn.addEventListener('click', Camera.centerView.bind(null, nodes))
    debugBtn.addEventListener('click', () => {
        debug = !debug
        debugBtn.style.backgroundColor = debug ? 'rgba(255, 0, 0, 0.2)' : ''
        tech.addResearchPoints(1000)
    })
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Check if clicked on a node
        const worldPos = Camera.getWorldPosition(e.clientX, e.clientY)
        let clickedNode = nodes.find(node => {
            const dx = node.x - worldPos.x
            const dy = node.y - worldPos.y
            return Math.hypot(dx, dy) < 20
        })

        if (clickedNode) {
            UI.showNodeDetails(clickedNode, budget, placeTower, enforceAction)
        } else {
            Camera.startDrag(e)
        }
    })
    // Handle touch taps for mobile: show node details
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault()
        const touch = e.changedTouches[0]
        const worldPos = Camera.getWorldPosition(touch.clientX, touch.clientY)
        let clickedNode = nodes.find(node => {
            const dx = node.x - worldPos.x
            const dy = node.y - worldPos.y
            return Math.hypot(dx, dy) < 20
        })
        if (clickedNode) UI.showNodeDetails(clickedNode, budget, placeTower, enforceAction)
    })
    // canvas.addEventListener('mousemove', (e) => {
    //     const rect = canvas.getBoundingClientRect();
    //     lastMouseX = e.clientX - rect.left;
    //     lastMouseY = e.clientY - rect.top;
    //     Camera.moveCamera(e)
    // })

    Camera.centerView(nodes)
    // Zoom in slightly when the game starts
    Camera.cinematicZoom(window.innerWidth < 600 ? 1.1 : 1.8)
    // Initialize the game
    tech.initTechTree()
    techUI.initTechUI()
    gameLoop()
})


// == Game data ==
// Economics & Game play
let budget = 100
let maintenance = 0
let taxRate = 0.2 // 20% tax rate
let gdp = 0
// let globalReputation = 100 // Todo
let holiday = false
let dropProbability = 0.00001


let BASE_SPAWN_RATE = 0.002
let HOLIDAY_SPAWN_BONUS = 10

// Game internal data 
const gdpLog = []
let transactions = []
const startTime = Date.now()
let currentDay = 0
const users = []
const userEdges = []


const nodes = [
    { id: 0, x: 250, y: 200, corruption: 0, type: 'processor', name: 'PayFlow', active: true },
    { id: 1, x: 300, y: 600, corruption: 0, type: 'processor', name: 'TransactPro' },
    { id: 2, x: 400, y: 350, corruption: 0, type: 'processor', name: 'SecurePay' },
    { id: 3, x: 600, y: 650, corruption: 0, type: 'processor', name: 'FastFunds' },
    { id: 4, x: 750, y: 300, corruption: 0, type: 'processor', name: 'QuickTransfer' },

    { id: 5, x: 400, y: 200, corruption: 0, type: 'bank', name: 'Global Bank', active: true },
    { id: 6, x: 200, y: 250, corruption: 0, type: 'bank', name: 'Trust Bank', active: true },
    { id: 7, x: 150, y: 350, corruption: 3, type: 'bank', name: 'Safe Savings', active: true },
    { id: 8, x: 950, y: 50, corruption: 0, type: 'bank', name: 'Prime Bank' },
    { id: 9, x: 900, y: 200, corruption: 0, type: 'bank', name: 'Capital Trust' },
    { id: 10, x: 100, y: 150, corruption: 0, type: 'bank', name: 'Union Bank', active: true },
    { id: 11, x: 300, y: 50, corruption: 0, type: 'bank', name: 'Metro Bank', active: true },
    { id: 12, x: 900, y: 550, corruption: 0, type: 'bank', name: 'Pioneer Bank' },
    { id: 13, x: 800, y: 100, corruption: 0, type: 'bank', name: 'Elite Bank' },
    { id: 14, x: 600, y: 250, corruption: 0, type: 'bank', name: 'Summit Bank' },
    { id: 15, x: 700, y: 700, corruption: 0, type: 'bank', name: 'Horizon Bank' },
    { id: 16, x: 200, y: 500, corruption: 0, type: 'bank', name: 'Anchor Bank' },
    { id: 17, x: 800, y: 450, corruption: 4, type: 'bank', name: 'Crest Bank' },
    { id: 18, x: 200, y: 730, corruption: 0, type: 'bank', name: 'Fortune Bank' },
    { id: 19, x: 400, y: 600, corruption: 0, type: 'bank', name: 'Legacy Bank' },

    // New 🚀 Fintech nodes
    { id: 20, x: 550, y: 140, corruption: 0, type: 'fintech', name: 'Rocket Pay' },
    { id: 21, x: 650, y: 160, corruption: 0, type: 'fintech', name: 'Astro Finance' },
    { id: 22, x: 950, y: 200, corruption: 0, type: 'fintech', name: 'Lunar Pay' },
    { id: 23, x: 500, y: 800, corruption: 0, type: 'fintech', name: 'Orbit Funds' },
    { id: 24, x: 850, y: 300, corruption: 0, type: 'fintech', name: 'Stellar Bank' },

    // New  Crypto Exchange nodes
    { id: 25, x: 100, y: 550, corruption: 0, type: 'cryptoExchange', name: 'CryptoX' },
    { id: 26, x: 630, y: 550, corruption: 0, type: 'cryptoExchange', name: 'BitMarket' },
    { id: 27, x: 950, y: 750, corruption: 0, type: 'cryptoExchange', name: 'CoinTrade' },

]

// for each node, we add empty variables tower:null, detectedAmount:0, receivedAmount:0, reputation:80
nodes.forEach(node => {
    node.tower = null
    node.detectedAmount = 0
    node.receivedAmount = 0
    node.reputation = 80 // Default node reputation
    node.accuracy = 0
    // node.active = true
})

const edges = [
    // processor to processor
    [0, 2], [1, 2], [2, 4],
    // processor to banks
    [0, 10], [0, 11], [0, 6], [1, 16], [1, 18], [1, 19], [2, 16], [3, 19], [3, 15], [4, 9], [4, 14], [4, 17], [5, 0],
    // banks to banks
    [6, 7], [8, 13], [9, 13], [10, 11], [11, 13], [11, 14], [12, 17], [13, 14], [15, 17], [16, 17], [16, 18], [17, 19],
    // fintech connections
    [20, 21], [14, 21], [8, 22], [9, 22], [15, 23], [3, 23], [13, 24], [17, 24],
    // crypto exchange connections
    [16, 25], [12, 27], [3, 26],
]
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
            do {
                const x = t.x + (Math.random() - 0.5) * 150;
                const y = t.y + (Math.random() - 0.5) * 150;
                const overlapping = nodes.some(n => Math.hypot(x - n.x, y - n.y) < 30) || users.some(u => Math.hypot(x - u.x, y - u.y) < 25);
                if (!overlapping) {
                    user = {
                        id: `${users.length}`,
                        x,
                        y,
                        type: type,
                        corruption: Math.floor(Math.random() * 5), // 0 to 4
                        activity: Math.random(),
                        active: true
                    }
                }
                tries++
            } while (!user && tries < 10)

            if (user) {
                users.push(user)
                // assignNearestBank(user)
                // As we generate around a platform, we don't need to look for the nearest for the moment
                user.bankId = t.id
                userEdges.push([user.id, t.id])
            }
        }
    })
}

// Not used in the current design
function assignNearestBank(user) {
    let activeNodes = []
    if (user.type === 'government') {
        activeNodes = nodes.filter(n => n.type === 'bank' && n.active)
    } else {
        activeNodes = nodes.filter(n => n.type !== 'processor' && n.active)
    }
    const nearest = activeNodes.sort((a, b) => Math.hypot(user.x - a.x, user.y - a.y) - Math.hypot(user.x - b.x, user.y - b.y))[0]
    if (nearest) {
        user.bankId = nearest.id
        userEdges.push([user.id, nearest.id])
    }
}

function realignUserBanks() {
    users.forEach(user => {
        const prevBank = user.bankId
        assignNearestBank(user)
        if (user.bankId !== prevBank) {
            const index = userEdges.findIndex(e => e[0] === user.id)
            if (index !== -1) userEdges[index] = [user.id, user.bankId]
        }
    })
}

generateUsers();

// == Canvas drawing functions == 

function spawnTransaction() {
    const activeUsers = users.filter(u => u.active)
    if (activeUsers.length === 0) return

    const sourceUser = activeUsers[Math.floor(Math.random() * activeUsers.length)]
    // const activeNodes = nodes.filter(n => n.active && n.type !== 'processor')
    // const targetNode = activeNodes[Math.floor(Math.random() * activeNodes.length)]
    const targetUser = activeUsers[Math.floor(Math.random() * activeUsers.length)]
    const sourceBank = nodes[sourceUser.bankId]
    const targetBank = nodes[targetUser.bankId]

    // Illegal tx depends on the corruption of the source user (avg 2) and its bank (0 then increase)
    // If corruption is 2, 10% chance of being illegal, 5% chance of being questionable. Increase quickly with bank corruption
    const dice10 = Math.random() * 30 / (sourceUser.corruption + sourceBank.corruption * 5 + 1)
    // console.log("factor", 30 / (sourceUser.corruption + sourceBank.corruption * 5 + 1))
    const legality = legalityOptions[dice10 < 1 ? 2 : dice10 < 1.5 ? 1 : 0]
    const dice3 = Math.floor(Math.random() * 3)
    const size = ['small', 'medium', 'large'][dice3]


    if (!sourceUser || !targetUser || !sourceBank) {
        console.log("Error spawning transaction: missing user, bank, or target.");
        return;
    }

    const innerPath = getPathFrom(sourceBank.id, targetBank.id)
    if (!innerPath || innerPath.length < 2) return

    const txPath = [sourceUser.id, ...innerPath, targetUser.id]

    const newTx = {
        path: txPath,
        index: 0,
        issuanceDate: Date.now(),
        terminationDate: null,
        x: sourceUser.x,
        y: sourceUser.y,
        speed: 0.5 + Math.random() * (dice3 + 1) / 2,
        legality,
        size,
        amount: txSizeOptions[size].amount,
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

let firstLostTransaction = false
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
    let speed = debug ? tx.speed / 3 : tx.speed * tech.bonus.transactionSpeed

    const dist = Math.hypot(dx, dy)

    if (dist < speed) {
        // remaining distance to next node is less than the speed of the transaction
        tx.index++
        // we check for detection when we reach a node. If detected, there will be no income
        if (detect(tx)) {
            dailyDetectedTransactions++
            tx.active = false
            return
        }
        if (tx.index == tx.path.length - 2) {
            // We have reached the end of the path
            next.receivedAmount += tx.amount
            // in the future, inspection could cost to budget
            // Also, these effect could happen to all nodes, except taxes
            // const isAudited = auditedNodes.some(a => a.id === next.id)
            // if (isAudited) baseIncome = Math.floor(tx.amount / 2)
            gdpLog.push({ amount: tx.amount, timestamp: Date.now() })
            let income = tx.amount * taxRate
            budget += income
            // addEffect(next.x, next.y, "+" + tx.amount * taxRate, 'bonus')
            addEffect(next.x, next.y, "+" + income, 'budget')

            if (tx.legality === 'illegal') {
                addEffect(next.x, next.y, '', 'pulseNode', 'rgba(255, 0, 0, 0.2)')

                next.corruption++
                // addEffect(next.x, next.y, '💥')
                next.reputation = Math.max(0, next.reputation - 5) // Reputation decreases when illegal transactions go through
                // UI.showToast('Illegal transaction completed', 'Corruption increased at ' + next.name, 'error')
                console.log(`💥 Breach at node ${next.id}, from ${tx.path[0]}`)
            } else if (tx.legality === 'questionable') {
                // addEffect(next.x, next.y, '', 'pulseNode', 'rgba(255, 187, 0, 0.2)')

                // no particular effect
            } else {
                next.reputation = Math.min(100, next.reputation + 1) // Small reputation gain for legitimate transactions
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
            tx.active = false
            tx.end = "lost"
            console.log("Transaction lost!")
            addEffect(tx.x - 2, tx.y, "∅", "insitus")
            if (!firstLostTransaction) {
                UI.showToast('∅ Lost transaction', `Develop the appropriate Technology to reduce errors`, 'error')
                firstLostTransaction = true
            }
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


function enforceAction(node, action) {
    const actionCost = actionOptions[action].cost * tech.bonus.enforcementCost
    if (budget < actionCost) {
        UI.showToast('Insufficient budget', `You need 💰${actionCost} to perform this action`, 'error')
        return
    } else {
        budget -= actionCost
        node.reputation += actionOptions[action].reputationEffect * tech.bonus.reputationDamage//negative
        node.enforcementAction = action
        node.enforcementEnd = Date.now() + actionOptions[action].duration * 1000
    }
}

let firstDetection = false
let firstFalsePositive = false
function detect(tx) {
    const node = nodes[tx.path[tx.index]]

    if (!node || !node.tower) return false

    let detectionChance = node.accuracy // towerOptions[node.tower].accuracy

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5; // Reduce accuracy for small transactions
    }
    if (tx.legality === 'legit') {
        // console.log("We check a legit tx with chance ", detectionChance)
        // small chance of false flag, inversely proportional to accuracy, then 10% unless robust tech
        if (Math.random() > detectionChance && Math.random() < towerOptions[node.tower].errors * 0.01 * tech.bonus.falsePositive) {
            addEffect(node.x, node.y, '🛑')
            tx.active = false
            tx.end = "FalsePositive"
            console.log(`🛑 False postive at `, node.name)
            node.reputation -= 5 // harmful for reputation, but not for corruption. Also the transaction ends when it shouldn't have
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
        addEffect(node.x, node.y, '✔️')
        if (!firstDetection) {
            UI.showToast('First illegal transaction blocked!', `Detected at ${node.name} (${towerOptions[node.tower].name})`, 'success')
            firstDetection = true
        }
        console.log(`✔️ Illegal tx blocked at node ${node.id}`)
        node.detectedAmount += tx.amount
        node.receivedAmount += tx.amount

        // To be refined, a percentage of the amount could still reach the budget 
        let income = tx.amount * taxRate
        budget += income
        addEffect(node.x, node.y, income, 'budget')

        // Gain reputation for successful detection
        node.reputation += 3

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
            timer = 60// Emojis for big actions
            break
        case 'invertedPulse':
        case 'pulse':
        case 'pulseNode':
            timer = 14
            break
        default:
            timer = 30 // small text notifications)

    }
    effects.push({ x, y, emoji, timer: timer, type: type, color: color })

}

function drawEffects() {
    effects.forEach(e => {
        e.timer -= 1
        switch (e.type) {
            case 'insitus':
                ctx.font = `6px ${uiFont}`
                ctx.fillText(e.emoji, e.x, e.y)
            case 'malus':
                ctx.fillStyle = 'red'
                ctx.font = `12px ${uiFont}`
                ctx.fillText(e.emoji, e.x - 5, e.y - 50)
                break
            case 'bonus':
                ctx.fillStyle = 'green'
                ctx.font = `12px ${uiFont}`
                ctx.fillText(e.emoji, e.x + 25, e.y + 5)
                break
            case 'budget':
                ctx.fillStyle = '#666'
                ctx.font = `8px ${uiFont}`
                ctx.fillText(e.emoji, e.x + 25, e.y + 5)
                ctx.font = `4px ${uiFont}`
                ctx.fillText('🪙', e.x + 35, e.y + 4)
                break
            case 'invertedPulse':
                ctx.beginPath()
                const InvertedPulseRadius = e.timer // contract over time
                ctx.arc(e.x, e.y, InvertedPulseRadius, 0, Math.PI * 2)
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'
                ctx.lineWidth = 2
                ctx.stroke()
                break
            case 'pulse':
                ctx.beginPath()
                const pulseRadius = 14 - e.timer // expand over time
                ctx.arc(e.x, e.y, pulseRadius, 0, Math.PI * 2)
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'
                ctx.lineWidth = 2
                ctx.stroke()
                break
            case 'pulseNode':
                ctx.beginPath()
                const pulseRadiusNode = 5 + (20 - e.timer) // expand over time
                ctx.arc(e.x, e.y, pulseRadiusNode, 0, Math.PI * 2)
                // ctx.strokeStyle = 'rgba(255,255,255,0.2)'
                ctx.strokeStyle = e.color
                ctx.lineWidth = 4
                ctx.stroke()
                break
            default:
                ctx.font = `24px ${uiFont}`
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x - 12, e.y - 30)
        }
    })

    effects = effects.filter(e => {
        e.timer -= 1
        return e.timer > 0
    })
}

// Handle mouse click to select nodes
canvas.addEventListener('click', (e) => {
    const worldPos = Camera.getWorldPosition(e.clientX, e.clientY)
    let clickedOnNode = false

    for (let node of nodes) {
        const dx = node.x - worldPos.x
        const dy = node.y - worldPos.y
        if (Math.hypot(dx, dy) < 20) {
            UI.showNodeDetails(node, budget, placeTower, enforceAction)
            clickedOnNode = true
            break
        }
    }

    if (!clickedOnNode) {
        UI.hideNodeDetails()
    }
})

// Handle mouse hover to show tooltips
let hoverNode = null
let hoverTimeout = null
function drawUser(user) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(user.x, user.y, 1 + user.activity * 2, 0, Math.PI * 2);

    ctx.fillStyle = userTypes[user.type].color;

    ctx.shadowColor = '#0e0e14' // from background color in CSS
    ctx.shadowBlur = 10

    // Fun fact : the filder belwo destroys perforamnce
    // ctx.filter = "brightness(50%)";

    ctx.fill();

    if (debug) {
        ctx.font = '6px sans-serif'
        ctx.fillText(user.id, user.x + 5, user.y - 2)
    }

    ctx.restore();
}


function drawUserEdge([userId, bankId]) {
    // if (debug) { console.log(`User ${userId} edge to ${bankId} `) }
    const user = users.find(u => u.id === userId)
    const bank = nodes.find(n => n.id === bankId)
    if (!user || !bank) return
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(user.x, user.y)
    ctx.lineTo(bank.x, bank.y)
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 0.3
    ctx.stroke()
    ctx.restore()
}

function drawNode(node) {
    const isSelected = node === UI.getSelectedNode()
    const nodeRadius = 20
    ctx.save()  // Save canvas stated

    // Draw outer ring
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)
    let color = nodeTypes[node.type].color

    // Add corruption glow
    if (node.corruption > CORRUPTION_THRESHOLD) {
        ctx.shadowColor = 'red'
        ctx.shadowBlur = 15
        color = '#ffdddd'
    } else if (node.corruption > 1) {
        ctx.shadowColor = 'orange'
        ctx.shadowBlur = 10
        color = '#fff0dd'
    } else if (!isSelected) {
        ctx.shadowColor = 'black' // No shadow when selected
        ctx.shadowBlur = 5
    }

    // Add selection highlight
    if (isSelected) {
        ctx.strokeStyle = '#FFD700' // Gold color for selected node
        ctx.lineWidth = 3
    } else {
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 0.1
    }

    ctx.stroke()
    ctx.fillStyle = color
    ctx.fill()
    if (node.tower) {
        // Draw a circular background with a gradient for the tower icon
        const gradient = ctx.createRadialGradient(node.x, node.y + 25, 5, node.x, node.y + 25, 14)
        gradient.addColorStop(0, color)
        gradient.addColorStop(0.5, color)
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)')
        ctx.beginPath()
        ctx.arc(node.x, node.y + 25, 14, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Add a subtle shadow for the tower icon
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 4

        // Draw the tower icon with a bold font and centered alignment
        ctx.font = `14px ${uiFont}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#000'
        ctx.fillText(towerOptions[node.tower].icon, node.x, node.y + 25)

        // Reset shadow to avoid affecting other elements
        ctx.shadowBlur = 0
    }
    ctx.restore() // Restore to remove shadow for text drawing

    // Draw node type emoji
    ctx.font = `20px ${uiFont}`
    ctx.fillText(nodeTypes[node.type].icon, node.x - 12, node.y + 7)

    if (node.enforcementAction) {
        ctx.font = `14px ${uiFont}`
        ctx.fillStyle = '#000'
        ctx.shadowColor = color
        ctx.shadowBlur = 4
        ctx.fillText(`${actionOptions[node.enforcementAction].icon} ${actionOptions[node.enforcementAction].name}`, node.x - 24, node.y - 30)
    }
    if (debug) {
        ctx.font = `14px ${uiFont}`

        ctx.fillStyle = 'white'
        ctx.fillText(node.id, node.x + 20, node.y - 6)
        if (node.corruption) {
            ctx.fillStyle = 'red'
            ctx.fillText(node.corruption, node.x + 20, node.y + 16)
        }
    }
}

function drawEdge([a, b]) {
    ctx.beginPath()
    ctx.moveTo(nodes[a].x, nodes[a].y)
    ctx.lineTo(nodes[b].x, nodes[b].y)
    ctx.strokeStyle = '#aaa'
    ctx.lineWidth = 2
    ctx.stroke()
}


function drawTransaction(tx) {
    //  const emoji = tx.legality === 'illegal' ? '💸' : '💵'
    //  let fontSize = tx.size === 'small' ? 18 : tx.size === 'medium' ? 24 : 32
    //  ctx.font = `${fontSize}px ${uiFont}`
    //  ctx.fillText(emoji, tx.x - fontSize / 2, tx.y + fontSize / 3);
    ctx.save();
    const radius = tx.size === 'small' ? 2 : tx.size === 'medium' ? 4 : 6;

    // Set shadow based on legality
    if (tx.legality === 'illegal') {
        ctx.shadowColor = 'rgba(255, 0, 0, 0.7)'; // Red shadow for illegal
    } else if (tx.legality === 'questionable') {
        ctx.shadowColor = 'rgba(255, 165, 0, 0.7)'; // Orange shadow for questionable
    } else {
        ctx.shadowColor = 'rgba(0, 255, 0, 0.7)'; // Green shadow for legal
    }
    ctx.shadowBlur = 4;

    // Create gradient for the transaction
    const gradient = ctx.createRadialGradient(tx.x, tx.y, 1, tx.x, tx.y, radius * 2);
    gradient.addColorStop(0, 'rgb(255, 255, 255)'); // Somber base color
    gradient.addColorStop(1, 'rgba(145, 145, 145, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(tx.x, tx.y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCorruptionMeter(spread) {
    ctx.save();
    const meterX = canvas.width - 260;
    const meterY = 10;
    const meterWidth = 220;
    const meterHeight = 22;

    // Draw background
    ctx.fillStyle = '#222';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    // Draw corruption bar
    const gradient = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY);
    gradient.addColorStop(0, 'green');
    gradient.addColorStop(0.6, 'orange');
    gradient.addColorStop(1, 'red');
    ctx.fillStyle = gradient;
    ctx.fillRect(meterX, meterY, (meterWidth * Math.min(spread, 100)) / 100, meterHeight);

    // Draw corruption percentage text
    ctx.fillStyle = 'white';
    ctx.font = `14px ${uiFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Corruption: ${Math.floor(spread)}%`, meterX + meterWidth / 2, meterY + meterHeight / 2);

    ctx.restore();
}

function drawTooltip(hoverNode) {
    const tooltip = [
        { text: hoverNode.name, bold: true },
        { text: `Type: ${hoverNode.type}` },
        { text: `Controls: ${hoverNode.tower ? towerOptions[hoverNode.tower].name : "None"}` },
        { text: `Click for details` }
    ];
    ctx.font = `14px  ${uiFont}`
    ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
    const tooltipX = hoverNode.x + 25;
    const tooltipY = hoverNode.y;
    const lineHeight = 18;
    const tooltipWidth = 180;
    const tooltipHeight = tooltip.length * lineHeight + 8;

    // Draw background with rounded corners
    ctx.beginPath();
    ctx.roundRect(tooltipX - 5, tooltipY - 15, tooltipWidth, tooltipHeight, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58, 123, 213, 0.5)';
    ctx.stroke();

    // Draw text
    tooltip.forEach((line, index) => {
        ctx.font = line.bold ? `bold 14px  ${uiFont}` : `14px ${uiFont}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(line.text, tooltipX, tooltipY + index * lineHeight);
    });
}

function calculateIndicators() {
    // Remove old transactions from the log (older than 90 seconds, each second is a day)
    while (gdpLog.length && gdpLog[0].timestamp < Date.now() - 90 * 1000) {
        gdpLog.shift()
    }
    gdp = gdpLog.reduce((sum, tx) => sum + tx.amount, 0)

    const oldBudget = budget
    budget += maintenance / (60 * 7) * tech.bonus.maintenance// maintenance is per week for balance   

    // If budget crosses a tower cost threshold, update UI
    const thresholds = [50, 75, 100, 150] // tower costs
    if (thresholds.some(cost =>
        (oldBudget < cost && budget >= cost) ||
        (oldBudget >= cost && budget < cost)
    )) {
        UI.updateCurrentNodeDetails(budget, placeTower, enforceAction)
    }
}

function drawEndGame(condition) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'red'
    ctx.font = `48px ${uiFont}`
    ctx.textAlign = 'center'
    ctx.fillText('You have lost', canvas.width / 2, canvas.height / 2 - 20)

    ctx.font = `24px  ${uiFont}`
    ctx.fillStyle = 'white'
    ctx.fillText(condition, canvas.width / 2, canvas.height / 2 + 20)

    // Stop the game loop
    cancelAnimationFrame(animationFrameId)
}

function removeExpiredEnforcementActions(now) {
    nodes.filter(node => node.enforcementAction)
        .forEach(node => {
            if (node.enforcementEnd <= now) {
                let endingAction = actionOptions[node.enforcementAction]
                node.corruption = node.corruption / endingAction.corruptionEffect
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
    // Corruption spread (on all nodes, giving more margin at the begining of the game)
    const totalActors = nodes.length
    const totalCorruption = nodes.reduce((sum, n) => sum + n.corruption, 0)
    return Math.round((totalCorruption / (CORRUPTION_THRESHOLD * totalActors)) * 100)
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

let priorNow = Date.now()
let deltaTime = 0
let dailyDetectedTransactions = 0


function gameLoop() {

    // == Update the game state == 
    const now = Date.now()
    const newCurrentDay = Math.floor((now - startTime) / 1000) // in seconds
    if (newCurrentDay !== currentDay) {
        currentDay = newCurrentDay
        const dayOfYear = currentDay % 365 + 1
        // const year = Math.floor(currentDay / 365)

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
        // We perform the following tasks once a day
        UI.updateDate(currentDay, holiday)
        if (currentDay % 60 === 0) {
            // Every 60 days, a new node is added
            const inactiveNodes = nodes.filter(n => !n.active && edges.some(([a, b]) => (a === n.id && nodes[b].active) || (b === n.id && nodes[a].active)));
            if (inactiveNodes.length > 0) {
                const newNode = inactiveNodes[Math.floor(Math.random() * inactiveNodes.length)];
                newNode.active = true;
                console.log(`🌟 New node activated: ${newNode.name}`);
                UI.showToast('🌟 A new actor has emerged', `Welcome ${newNode.name}`, 'info');

                generateUsers(newNode)
                // realignUserBanks()
            }
        }
        const researchPointsGain = tech.calculateResearchPointsGain(gdp, dailyDetectedTransactions)
        tech.addResearchPoints(researchPointsGain)
        if (researchPointsGain > 0) {
            //   UI.showToast('Research Progress', `Gained ${researchPointsGain} Research Points`, 'info')
        }
        dailyDetectedTransactions = 0
        techUI.updateResearchUI();


        increaseAIaccuracy()

        removeExpiredEnforcementActions(now)
    }
    if (transactions.filter(t => t.active).length === 0) {
        // ensure there is always a transaction going
        spawnTransaction()
    } else {
        const nbActiveNodes = nodes.filter(n => n.active).length
        const holidayBonus = holiday ? HOLIDAY_SPAWN_BONUS : 1
        const spawnRate = nbActiveNodes * holidayBonus * Math.log10(currentDay + 1) * BASE_SPAWN_RATE
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
        ctx.font = `18px ${uiFont}`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`FPS: ${Math.round(1000 / ((deltaTime + newDeltaTime) / 2))}`, 10, 70)
        deltaTime = newDeltaTime
    }
    Camera.applyCamera(ctx)
    if (debug) Camera.drawDebugGrid(ctx)

    userEdges.forEach(drawUserEdge)
    edges.filter(([a, b]) => nodes[a].active && nodes[b].active)
        .forEach(drawEdge);
    nodes.filter(n => n.active).forEach(drawNode);
    users.filter(n => n.active).forEach(drawUser)
    transactions = transactions.filter(t => t.active);
    transactions.forEach(tx => {
        moveTransaction(tx)
        drawTransaction(tx)
    })
    drawEffects()

    Camera.restoreCamera(ctx)

    // == Update the UI ==
    UI.updateIndicators(budget, gdp, maintenance * tech.bonus.maintenance)

    if (hoverNode && !UI.getSelectedNode()) {
        drawTooltip(hoverNode)
    } else {
        // const worldPos = Camera.getWorldPosition(lastMouseX, lastMouseY)
        // const hoveredUser = users.find(user => Math.hypot(worldPos.x - user.x, worldPos.y - user.y) < 15)
        // if (hoveredUser) drawUserTooltip(hoveredUser)
    }

    const spread = calculateCorruptionSpread()
    drawCorruptionMeter(spread)

    // Game end conditions
    if (spread >= 100) {
        drawEndGame('Corruption has reached critical levels!')
        return
    }

    if (budget < -100) {
        drawEndGame('The country is bankrupt!')
        return
    }

    animationFrameId = requestAnimationFrame(gameLoop)
}

