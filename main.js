// UI
let debug = false
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const indicators = {
    budget: document.getElementById('budget'),
    gdp: document.getElementById('gdp'),
    maintenance: document.getElementById('maintenance'),
}
const effects = []
const startTime = Date.now()

// Economics & Game play
let budget = 150
let maintenance = 0
let taxRate = 0.2 // 20% tax rate
let gdp = 0
const auditedNodes = []
const gdpLog = []
let transactions = []

const nodes = [
    { id: 0, x: 250, y: 200, corruption: 0, type: 'processor', name: 'PayFlow' },
    { id: 1, x: 300, y: 600, corruption: 0, type: 'processor', name: 'TransactPro' },
    { id: 2, x: 400, y: 350, corruption: 0, type: 'processor', name: 'SecurePay' },
    { id: 3, x: 600, y: 650, corruption: 0, type: 'processor', name: 'FastFunds' },
    { id: 4, x: 750, y: 300, corruption: 0, type: 'processor', name: 'QuickTransfer' },

    { id: 5, x: 400, y: 200, corruption: 0, type: 'bank', name: 'Global Bank' },
    { id: 6, x: 200, y: 250, corruption: 0, type: 'bank', name: 'Trust Bank' },
    { id: 7, x: 150, y: 350, corruption: 2, type: 'bank', name: 'Safe Savings' },
    { id: 8, x: 950, y: 50, corruption: 0, type: 'bank', name: 'Prime Bank' },
    { id: 9, x: 900, y: 200, corruption: 0, type: 'bank', name: 'Capital Trust' },
    { id: 10, x: 100, y: 150, corruption: 0, type: 'bank', name: 'Union Bank' },
    { id: 11, x: 300, y: 50, corruption: 0, type: 'bank', name: 'Metro Bank' },
    { id: 12, x: 900, y: 550, corruption: 0, type: 'bank', name: 'Pioneer Bank' },
    { id: 13, x: 850, y: 100, corruption: 0, type: 'bank', name: 'Elite Bank' },
    { id: 14, x: 600, y: 250, corruption: 0, type: 'bank', name: 'Summit Bank' },
    { id: 15, x: 700, y: 700, corruption: 0, type: 'bank', name: 'Horizon Bank' },
    { id: 16, x: 200, y: 500, corruption: 0, type: 'bank', name: 'Anchor Bank' },
    { id: 17, x: 800, y: 450, corruption: 3, type: 'bank', name: 'Crest Bank' },
    { id: 18, x: 200, y: 730, corruption: 0, type: 'bank', name: 'Fortune Bank' },
    { id: 19, x: 400, y: 600, corruption: 0, type: 'bank', name: 'Legacy Bank' },
]

// for each node, we add empty variables tower:null, detectedAmount:0, receivedAmount:0
nodes.forEach(node => {
    tower = null
    node.detectedAmount = 0
    node.receivedAmount = 0
})


const edges = [
    // processor to processor
    [0, 2], [1, 2], [2, 4],
    // processor to banks
    [0, 10], [0, 11], [0, 6], [1, 16], [1, 18], [1, 19], [2, 16], [3, 19], [3, 15], [4, 9], [4, 14], [4, 17], [5, 0],
    // banks to banks
    [6, 7], [8, 13], [9, 13], [10, 11], [11, 13], [11, 14], [12, 17], [13, 14], [15, 17], [16, 17], [16, 18], [17, 19],
]

const towerTypes = {
    basic: { name: 'basic filter', cost: 50, efficiency: 0.5, maintenance: 0 },
    enhanced: { name: 'enhanced filter', cost: 75, efficiency: 0.7, maintenance: 0 },
    ai: { name: 'AI', cost: 100, efficiency: 0.8, maintenance: 2 },
    advanced: { name: 'advanced AI', cost: 150, efficiency: 0.9, maintenance: 5 }
}

const txSizeOptions = {
    small: { name: 'small', speed: 1.8, amount: 5 },
    medium: { name: 'medium', speed: 1.5, amount: 10 },
    large: { name: 'large', speed: 1, amount: 15 }
}

const legalityOptions = ['legit', 'questionable', 'illegal'];


function spawnTransaction() {
    const banks = nodes.filter(n => n.type === 'bank')
    const source = banks[Math.floor(Math.random() * banks.length)];

    // Illegal transaction depends on the corruption of the source, 10%, 20%, 33%... 
    // If corruption is 0, 10% chance of being illegal, 5% chance of being questionable
    // if corruption is 3, 40% chance of being illegal, 20% chance of being questionable
    // if corruption is 5, 60% chance of being illegal, 30% chance of being questionable
    const dice10 = Math.random() * 10 / (source.corruption + 1);
    const legality = legalityOptions[dice10 < 1 ? 2 : dice10 < 1.5 ? 1 : 0];

    const size = ['small', 'medium', 'large'][Math.floor(Math.random() * 3)];

    const newTx = {
        path: getPathFrom(source.id),
        index: 0,
        x: source.x,
        y: source.y,
        speed: txSizeOptions[size].speed,
        legality,
        size,
        amount: txSizeOptions[size].amount,
        source,
        active: true
    }

    if (debug) {
        console.log(`${newTx.legality === 'illegal' ? '💸' : '💵'} from ${source.id} to ${newTx.path[newTx.path.length - 1]}`)
        newTx.speed = newTx.speed / 3
    }
    transactions.push(newTx)
    // we give a chance for detection
    detect(transactions[transactions.length - 1])

}
function getPathFrom(start) {
    const visited = new Set()
    const queue = [[start]]

    while (queue.length > 0) {
        const path = queue.shift()
        const node = path[path.length - 1]
        if (!visited.has(node)) {
            visited.add(node)
            for (const edge of edges) {
                if (edge.includes(node)) {
                    const neighbor = edge[0] === node ? edge[1] : edge[0]
                    // const isAudited = auditedNodes.some(a => a.id === neighbor && a.until > Date.now())
                    // if (isAudited) continue // Skip audited nodes entirely
                    if (!visited.has(neighbor)) {
                        const newPath = [...path, neighbor]
                        queue.push(newPath)
                        if (nodes[neighbor].type === 'bank') {
                            // If a valid path to a bank is found, continue exploring for longer paths occasionally
                            if (Math.random() < 0.5 || queue.length === 0) {
                                return newPath
                            }
                        }
                    }
                }
            }
        }
    }
    const fallbackPath = Array.from(visited) // Use visited nodes as a fallback path
    return fallbackPath.length > 1 ? fallbackPath : [start]
}

function moveTransaction(tx) {
    const curr = nodes[tx.path[tx.index]]
    const next = nodes[tx.path[tx.index + 1]]
    if (!next) return  // we had reached the end of the path

    const dx = next.x - tx.x
    const dy = next.y - tx.y
    const dist = Math.hypot(dx, dy)
    // remaining distance to next node is less than the speed of the transaction
    if (dist < tx.speed) {
        tx.index++
        detect(tx) // we check for detection when we reach a node. If detected, there will be no income
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
                console.log(`💥 Breach at node ${dest.id}, from ${tx.path[0]}`)
            } else {

            }
            tx.active = false
        }
    } else {
        tx.x += (dx / dist) * tx.speed
        tx.y += (dy / dist) * tx.speed
    }
}

function placeTower(node, towerType) {
    node.tower = towerType
    const tower = towerTypes[towerType]
    budget -= tower.cost
    maintenance += tower.maintenance
    console.log(`🛠️ Tower placed at node ${node.id}`)

}

function detect(tx) {
    const node = nodes[tx.path[tx.index]];
    if (!node || !node.tower || tx.legality !== 'illegal') return;

    let detectionChance = towerTypes[node.tower].efficiency;

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5; // Reduce efficiency for small transactions
    }
    if (debug) console.log(`Detection roll at ${node.id}, chance: ${detectionChance}`)


    if (Math.random() < detectionChance) {
        tx.active = false;
        drawEffect(node.x, node.y, '✔️');
        console.log(`✔️ Illegal tx blocked at node ${node.id}`)
        node.detectedAmount += tx.amount
        if (debug) console.log(tx)
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
                ctx.font = '12px Arial'
                ctx.fillText(e.emoji, e.x - 5, e.y - 50)
                break
            case 'bonus':
                ctx.fillStyle = 'green'
                ctx.font = '12px Arial'
                ctx.fillText(e.emoji, e.x + 25, e.y + 5)
                break
            default:
                ctx.font = '24px Arial'
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x - 12, e.y - 30)
        }
    })
    for (let i = effects.length - 1; i >= 0; i--) {
        if (effects[i].timer <= 0) effects.splice(i, 1)
    }
}

function updateIndicators() {
    indicators.budget.textContent = budget.toFixed(0)
    indicators.maintenance.textContent = maintenance
    indicators.gdp.textContent = gdp.toFixed(0)
}

// Handle mouse click to place towers
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    for (let node of nodes) {
        const dx = node.x - mx
        const dy = node.y - my
        if (Math.hypot(dx, dy) < 20) {
            if (!node.tower) {
                if (e.shiftKey && budget >= towerTypes.ai.cost) {
                    placeTower(node, 'ai')


                } else if (budget >= towerTypes.basic.cost) {
                    placeTower(node, 'basic')
                }
            } else {
                if (node.tower === 'basic' && budget >= towerTypes.enhanced.cost) {
                    placeTower(node, 'enhanced')
                } else if (node.tower === 'ai' && budget >= towerTypes.advanced.cost) {
                    placeTower(node, 'advanced')
                }
            }
            break
        }
    }
})

// Handle mouse hover to show tower info with a delay but no delay after
let hoverNode = null
let hoverTimeout = null

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (hoverTimeout) clearTimeout(hoverTimeout)

    hoverTimeout = setTimeout(() => {
        hoverNode = null
        for (let node of nodes) {
            const dx = node.x - mx
            const dy = node.y - my
            if (Math.hypot(dx, dy) < 20) {
                hoverNode = node
                break
            }
        }
    }, 100) // Increased delay to 500ms before showing hover info
})

canvas.addEventListener('mouseleave', () => {
    hoverNode = null // Clear tooltip instantly when mouse leaves the canvas
    if (hoverTimeout) clearTimeout(hoverTimeout)
})

function drawNode(node) {
    ctx.save()  // Save canvas state

    ctx.beginPath()
    ctx.arc(node.x, node.y, 20, 0, Math.PI * 2)
    let color = node.type === 'bank' ? '#eee' : '#aaf'

    if (node.corruption > 4) {
        ctx.shadowColor = 'red'
        ctx.shadowBlur = 10
    } else if (node.corruption > 1) {
        ctx.shadowColor = 'orange'
        ctx.shadowBlur = 5
    }

    ctx.fillStyle = color
    ctx.fill()
    ctx.stroke()
    ctx.restore() // Restore to remove shadow for text drawing

    ctx.font = '20px Arial'
    ctx.fillText(node.type === 'bank' ? '🏦' : '🌐', node.x - 12, node.y + 7)
    if (node.tower) {
        const emoji = {
            'basic': '🔍',
            'enhanced': '🔬',
            'ai': '🧠',
            'advanced': '🤖'
        }[node.tower]
        ctx.fillText(emoji, node.x - 10, node.y + 25)
    }
    const auditStatus = auditedNodes.find(a => a.id === node.id && a.until > Date.now())
    if (auditStatus) {
        ctx.font = '14px Arial'
        ctx.fillStyle = '#000'
        ctx.fillText('🕴️ Audit', node.x - 20, node.y - 30)
    }
    if (debug) {
        ctx.fillalign = 'center'
        ctx.fillStyle = 'black'
        ctx.fillText(node.id, node.x - 10, node.y - 20)
        if (node.corruption) {
            ctx.fillStyle = 'red'
            ctx.fillText(node.corruption, node.x, node.y + 30)
        }
    }
}

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault() // Prevent default right-click menu

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    for (let node of nodes) {
        const dx = node.x - mx
        const dy = node.y - my
        if (Math.hypot(dx, dy) < 20) {
            if (budget >= 100 && !auditedNodes.find(a => a.id === node.id)) {
                auditedNodes.push({ id: node.id, until: Date.now() + 10000 })
                budget -= 100
                console.log(`🔎 Audit started at node ${node.id}`)
            }
            break
        }
    }
})

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
    let fontSize = tx.size === 'small' ? '18px' : tx.size === 'medium' ? '24px' : '32px'
    ctx.font = fontSize + ' Arial'
    ctx.fillText(emoji, tx.x - 10, tx.y + 10)
}

function drawCorruptionMeter(spread) {
    ctx.fillStyle = '#333';
    ctx.fillRect(10, canvas.height - 30, 200, 20);
    ctx.fillStyle = spread > 70 ? 'red' : spread > 30 ? 'orange' : 'green';
    ctx.fillRect(10, canvas.height - 30, 2 * Math.min(spread, 100), 20);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`Corruption: ${Math.floor(spread)}%`, 15, canvas.height - 15);
}

function drawTooltip(hoverNode) {
    const tooltip = [
        { text: hoverNode.name, bold: true },
        { text: `Received: ${hoverNode.receivedAmount}` },
        { text: `Corruption: ${hoverNode.corruption}` },
        { text: `Controls: ${hoverNode.tower || "None"}` },
        { text: `Detected: ${hoverNode.detectedAmount}` },
    ];
    ctx.font = '14px Arial';
    ctx.fillStyle = '#fff';
    const tooltipX = hoverNode.x + 25;
    const tooltipY = hoverNode.y;
    const lineHeight = 18;
    const tooltipWidth = 140;
    const tooltipHeight = tooltip.length * lineHeight + 8;

    // Draw background
    ctx.fillRect(tooltipX - 5, tooltipY - 15, tooltipWidth, tooltipHeight);
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(tooltipX - 5, tooltipY - 15, tooltipWidth, tooltipHeight);

    // Draw text
    tooltip.forEach((line, index) => {
        ctx.font = line.bold ? 'bold 14px Arial' : '14px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(line.text, tooltipX, tooltipY + index * lineHeight);
    });
}

function calculateIndicators() {

    // Remove old transactions from the log
    while (gdpLog.length && gdpLog[0].timestamp < Date.now() - 60000) {
        gdpLog.shift()
    }
    gdp = gdpLog.reduce((sum, tx) => sum + tx.amount, 0)

    budget -= maintenance / 60
    // nodes.forEach(node => {
    //     if (node.tower === 'ai') budget -= 1 / 60
    //     if (node.tower === 'advanced') budget -= 5 / 60
    // })
}
function endGame(condition) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'red'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('You have been fired', canvas.width / 2, canvas.height / 2 - 20)

    ctx.font = '24px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(condition, canvas.width / 2, canvas.height / 2 + 20)
}

function gameLoop() {
    const now = Date.now()
    const currentDay = Math.floor(now - startTime) / 1000 // in seconds

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    edges.forEach(drawEdge)
    nodes.forEach(drawNode)
    transactions.forEach(tx => {
        if (tx.active) {
            moveTransaction(tx)
            drawTransaction(tx)
        }
    })
    transactions = transactions.filter(t => t.active)
    updateEffects()
    if (Math.random() < 0.03) spawnTransaction()
    calculateIndicators()
    updateIndicators()

    if (hoverNode) {
        drawTooltip(hoverNode)
    }

    // Corruption spread
    const totalActors = nodes.length// filter(n => n.type === 'bank')
    const totalCorruption = nodes.reduce((sum, n) => sum + n.corruption, 0)
    const spread = Math.round((totalCorruption / (3 * totalActors)) * 100)// We consider 4 as fully corrupted (red)
    if (spread >= 100) {
        endGame('Corruption has reached critical levels!')
        return
    } else {
        drawCorruptionMeter(spread)
    }
    // budget check
    if (budget < 0) {
        endGame('The country is bankrupt!')
        return
    }
    // Remove expired audits
    for (let i = auditedNodes.length - 1; i >= 0; i--) {
        if (auditedNodes[i].until <= now) {
            console.log(`✅ Audit complete on node ${auditedNodes[i].id} `)
            nodes[auditedNodes[i].id].corruption = Math.floor(nodes[auditedNodes[i].id].corruption / 2)
            auditedNodes.splice(i, 1)
        }
    }
    requestAnimationFrame(gameLoop)
}

gameLoop()