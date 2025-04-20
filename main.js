import * as Camera from './js/camera.js'
import * as UI from './js/ui-manager.js'
import { towerOptions, legalityOptions, txSizeOptions, nodeOptions, actionOptions, CORRUPTION_THRESHOLD } from './js/config.js'

// == UI == 
let debug = false
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
Camera.initCamera(canvas)
window.addEventListener('resize', Camera.resizeCanvas.bind(null, ctx))
UI.initUI() // Handle indicators and instructions

const centerBtn = document.getElementById('center-view')
const debugBtn = document.getElementById('toggle-debug')

let effects = []
const uiFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
let animationFrameId


// Initialization of UI elements, waiting for the DOM (and actually the game data)
document.addEventListener('DOMContentLoaded', () => {

    centerBtn.addEventListener('click', Camera.centerView.bind(null, nodes))
    debugBtn.addEventListener('click', () => {
        debug = !debug
        debugBtn.style.backgroundColor = debug ? 'rgba(255, 0, 0, 0.2)' : ''
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

    Camera.setCameraActions()
    Camera.resizeCanvas(ctx)
    Camera.centerView(nodes)
})


// == Game data ==
// Economics & Game play
let budget = 150
let maintenance = 0
let taxRate = 0.2 // 20% tax rate
let gdp = 0
let reputation = 100
let holiday = false

// Game internal data 
const gdpLog = []
let transactions = []
const startTime = Date.now()
let currentDay = 0

const nodes = [
    { id: 0, x: 250, y: 200, corruption: 0, type: 'processor', name: 'PayFlow', active: true },
    { id: 1, x: 300, y: 600, corruption: 0, type: 'processor', name: 'TransactPro' },
    { id: 2, x: 400, y: 350, corruption: 0, type: 'processor', name: 'SecurePay' },
    { id: 3, x: 600, y: 650, corruption: 0, type: 'processor', name: 'FastFunds' },
    { id: 4, x: 750, y: 300, corruption: 0, type: 'processor', name: 'QuickTransfer' },

    { id: 5, x: 400, y: 200, corruption: 0, type: 'bank', name: 'Global Bank', active: true },
    { id: 6, x: 200, y: 250, corruption: 0, type: 'bank', name: 'Trust Bank', active: true },
    { id: 7, x: 150, y: 350, corruption: 2, type: 'bank', name: 'Safe Savings', active: true },
    { id: 8, x: 950, y: 50, corruption: 0, type: 'bank', name: 'Prime Bank' },
    { id: 9, x: 900, y: 200, corruption: 0, type: 'bank', name: 'Capital Trust' },
    { id: 10, x: 100, y: 150, corruption: 0, type: 'bank', name: 'Union Bank', active: true },
    { id: 11, x: 300, y: 50, corruption: 0, type: 'bank', name: 'Metro Bank', active: true },
    { id: 12, x: 900, y: 550, corruption: 0, type: 'bank', name: 'Pioneer Bank' },
    { id: 13, x: 800, y: 100, corruption: 0, type: 'bank', name: 'Elite Bank' },
    { id: 14, x: 600, y: 250, corruption: 0, type: 'bank', name: 'Summit Bank', active: true },
    { id: 15, x: 700, y: 700, corruption: 0, type: 'bank', name: 'Horizon Bank' },
    { id: 16, x: 200, y: 500, corruption: 0, type: 'bank', name: 'Anchor Bank' },
    { id: 17, x: 800, y: 450, corruption: 3, type: 'bank', name: 'Crest Bank' },
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

// == Canvas drawing functions == 
function spawnTransaction() {
    const activeNodes = nodes.filter(n => (n.type !== 'processor' && n.active))
    const source = activeNodes[Math.floor(Math.random() * activeNodes.length)];

    // Illegal transaction depends on the corruption of the source, 10%, 20%, 33%... 
    // If corruption is 0, 10% chance of being illegal, 5% chance of being questionable
    // if corruption is 3, 40% chance of being illegal, 20% chance of being questionable
    // if corruption is 5, 60% chance of being illegal, 30% chance of being questionable
    const dice10 = Math.random() * 10 / (source.corruption + 1);
    const legality = legalityOptions[dice10 < 1 ? 2 : dice10 < 1.5 ? 1 : 0];
    const dice3 = Math.floor(Math.random() * 3)
    const size = ['small', 'medium', 'large'][dice3];

    const newTx = {
        path: getPathFrom(source.id),
        index: 0,
        x: source.x,
        y: source.y,
        speed: 0.5 + Math.random() + dice3 * 0.5, // [0.5:2.5]. increasing with size
        legality,
        size,
        amount: txSizeOptions[size].amount,
        source,
        active: true
    }

    if (debug) {
        console.log(`${newTx.legality === 'illegal' ? '💸' : '💵'} from ${source.id} to ${newTx.path[newTx.path.length - 1]}`)
    }
    transactions.push(newTx)
    // we give a chance for detection
    detect(transactions[transactions.length - 1])

}
function getPathFrom(start) {
    const visited = new Set();
    const queue = [[start]];

    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
        if (!visited.has(node)) {
            visited.add(node);
            for (const edge of edges) {
                if (edge.includes(node)) {
                    const neighbor = edge[0] === node ? edge[1] : edge[0];
                    if (!visited.has(neighbor) && nodes[neighbor].active) {
                        const newPath = [...path, neighbor];
                        queue.push(newPath);
                        if (nodes[neighbor].type === 'bank') {
                            // If a valid path to a bank is found, continue exploring for longer paths occasionally
                            if (Math.random() < 0.5 || queue.length === 0) {
                                return newPath;
                            }
                        }
                    }
                }
            }
        }
    }
    const fallbackPath = Array.from(visited).filter(node => nodes[node].active); // Use visited active nodes as a fallback path
    return fallbackPath.length > 1 ? fallbackPath : [start];
}

function moveTransaction(tx) {
    const prec = nodes[tx.path[tx.index]]
    const next = nodes[tx.path[tx.index + 1]]
    if (!next) return  // we had reached the end of the path

    const dx = next.x - tx.x
    const dy = next.y - tx.y
    let speed = debug ? tx.speed / 3 : tx.speed

    const dist = Math.hypot(dx, dy)
    // remaining distance to next node is less than the speed of the transaction
    if (dist < speed) {
        tx.index++
        // we check for detection when we reach a node. If detected, there will be no income
        if (detect(tx)) {
            tx.active = false
            return
        }
        if (tx.index >= tx.path.length - 1) {
            // We have reached the end of the path
            const dest = nodes[tx.path[tx.index]]
            dest.receivedAmount += tx.amount
            // in the future, inspection could cost to budget
            // const isAudited = auditedNodes.some(a => a.id === dest.id)
            // if (isAudited) baseIncome = Math.floor(tx.amount / 2)
            gdpLog.push({ amount: tx.amount, timestamp: Date.now() })
            budget += tx.amount * taxRate
            drawEffect(dest.x, dest.y, "+" + tx.amount * taxRate, 'bonus')

            if (tx.legality === 'illegal') {
                dest.corruption++
                drawEffect(dest.x, dest.y, '💥')
                dest.reputation -= 2 // Reputation decreases when illegal transactions go through
                // UI.showToast('Illegal transaction completed', 'Corruption increased at ' + dest.name, 'error')
                console.log(`💥 Breach at node ${dest.id}, from ${tx.path[0]}`)
            } else {
                dest.reputation += 0.1 // Small reputation gain for legitimate transactions
            }

            // Update panel if the affected node is selected
            if (UI.getSelectedNode() && UI.getSelectedNode().id === dest.id) {
                UI.showNodeDetails(dest, budget, placeTower)
            }

            tx.active = false
        }
    } else {
        tx.x += (dx / dist) * speed
        tx.y += (dy / dist) * speed
    }
}

function placeTower(node, towerType) {
    node.tower = towerType
    node.accuracy = towerOptions[towerType].accuracy // We move the accuracy to the node for AI usages
    const tower = towerOptions[towerType]
    budget -= tower.cost
    maintenance -= tower.maintenance
    console.log(`🛠️ Tower placed at node ${node.id}`)
    // Update UI immediately after placing tower
    UI.showNodeDetails(node, budget, placeTower, enforceAction)
}

function enforceAction(node, action) {
    const actionCost = actionOptions[action].cost
    if (budget < actionCost) {
        UI.showToast('Insufficient budget', `You need 💰${actionCost} to perform this action`, 'error')
        return
    } else {
        budget -= actionCost
        node.reputation += actionOptions[action].reputationEffect//negative
        node.enforcementAction = action
        node.enforcementEnd = Date.now() + actionOptions[action].duration * 1000
    }
}


function detect(tx) {
    const node = nodes[tx.path[tx.index]];
    if (!node || !node.tower || tx.legality !== 'illegal') return false

    let detectionChance = towerOptions[node.tower].accuracy;

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5; // Reduce accuracy for small transactions
    }
    if (debug) console.log(`Detection roll at ${node.id}, chance: ${detectionChance}`)


    if (Math.random() < detectionChance) {
        tx.active = false;
        drawEffect(node.x, node.y, '✔️');
        UI.showToast('Illegal transaction blocked', `Detected at ${node.name} (${towerOptions[node.tower].name})`, 'success')
        console.log(`✔️ Illegal tx blocked at node ${node.id}`)
        node.detectedAmount += tx.amount
        node.receivedAmount += tx.amount
        budget += tx.amount * taxRate // To be refined, a percentage of the amount could still reach the budget

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

function drawEffect(x, y, emoji, type = 'default') {
    if (type === "default")
        effects.push({ x, y, emoji, timer: 60, type: type })
    else
        effects.push({ x, y, emoji, timer: 20, type: type })
}

function updateEffects() {
    effects.forEach(e => {
        e.timer -= 1
        switch (e.type) {
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
            default:
                ctx.font = `24px ${uiFont}`
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x - 12, e.y - 30)
        }
    })

    effects = effects.filter(e => {
        e.timer -= 1;
        return e.timer > 0;
    });
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

function drawNode(node) {
    const isSelected = node === UI.getSelectedNode()
    const nodeRadius = 20
    ctx.save()  // Save canvas state

    // Draw outer ring
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)
    let color = nodeOptions[node.type].color

    // Add corruption glow
    if (node.corruption > CORRUPTION_THRESHOLD) {
        ctx.shadowColor = 'red'
        ctx.shadowBlur = 15
        color = '#ffdddd'
    } else if (node.corruption > 1) {
        ctx.shadowColor = 'orange'
        ctx.shadowBlur = 10
        color = '#fff0dd'
    }

    // Add selection highlight
    if (isSelected) {
        ctx.strokeStyle = '#FFD700' // Gold color for selected node
        ctx.lineWidth = 3
    } else {
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 1
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
    ctx.fillText(nodeOptions[node.type].icon, node.x - 12, node.y + 7)

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
    const emoji = tx.legality === 'illegal' ? '💸' : '💵'
    let fontSize = tx.size === 'small' ? 18 : tx.size === 'medium' ? 24 : 32
    ctx.font = `${fontSize}px ${uiFont}`
    ctx.fillText(emoji, tx.x - fontSize / 2, tx.y + fontSize / 3);
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
    budget += maintenance / 60

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
    // Corruption spread
    const totalActors = nodes.length
    const totalCorruption = nodes.reduce((sum, n) => sum + n.corruption, 0)
    return Math.round((totalCorruption / (CORRUPTION_THRESHOLD * totalActors)) * 100)
}

function increaseAIaccuracy() {
    nodes.filter(n => n.active && n.tower === "ai" || n.tower === "super")
        .forEach(n => {
            if (n.tower === "ai" && n.accuracy < 0.85) {
                n.accuracy *= 1.005
            } else if (n.tower === "super" && n.accuracy < 0.98) {
                n.accuracy += 1.01
            }
        })
}

let priorNow = Date.now()
let deltaTime = 0

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
            }
        }
        increaseAIaccuracy()

        removeExpiredEnforcementActions(now)
    }
    const nbActiveNodes = nodes.filter(n => n.active).length
    const holidayBonus = holiday ? 3 : 1
    if (Math.random() < 0.01 + (0.001 * nbActiveNodes * holidayBonus)) {
        spawnTransaction();
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

    edges.filter(([a, b]) => nodes[a].active && nodes[b].active)
        .forEach(drawEdge);
    nodes.filter(n => n.active).forEach(drawNode);
    transactions = transactions.filter(t => t.active);
    transactions.forEach(tx => {
        moveTransaction(tx)
        drawTransaction(tx)
    })
    updateEffects()

    Camera.restoreCamera(ctx)

    // == Update the UI ==
    UI.updateIndicators(budget, gdp, maintenance)

    if (hoverNode && !UI.getSelectedNode()) {
        drawTooltip(hoverNode)
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

// Initialize the game
gameLoop()