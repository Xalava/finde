// UI
let debug = false
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const UIindicators = {
    budget: document.getElementById('budget'),
    gdp: document.getElementById('gdp'),
    maintenance: document.getElementById('maintenance')
}
const UInodeDetails = {
    panel: document.getElementById('node-details-panel'),
    title: document.getElementById('panel-title'),
    type: document.getElementById('panel-type'),
    corruption: document.getElementById('panel-corruption'),
    received: document.getElementById('panel-received'),
    detected: document.getElementById('panel-detected'),
    reputationBar: document.getElementById('reputation-bar'),
    reputationValue: document.getElementById('reputation-value'),
    towerOptions: document.getElementById('tower-options'),
    close: document.getElementById('close-panel')
}
// Instructions Panel
const UIinstructions = {
    panel: document.getElementById('instructions'),
    close: document.getElementById('close-instructions')
}
let selectedNode = null
const effects = []
const uiFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';


// Economics & Game play
let budget = 150
let maintenance = 0
let taxRate = 0.2 // 20% tax rate
let gdp = 0
let reputation = 100
let holiday = false

// Game internal data 
const auditedNodes = []
const gdpLog = []
let transactions = []
const startTime = Date.now()
let currentDay = 0

// Add these variables near the top with other UI constants
const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    dragging: false,
    lastX: 0,
    lastY: 0
}

// Add this function to handle canvas resize
function resizeCanvas() {
    const container = document.getElementById('game-container')
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    // Force a redraw after resize
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    centerView()
}

// Add resize observer for more reliable size updates
const resizeObserver = new ResizeObserver(() => {
    resizeCanvas()
})
resizeObserver.observe(document.getElementById('game-container'))

// Update the mouse event handlers
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Check if clicked on a node
    const worldPos = getWorldPosition(e.clientX, e.clientY)
    let clickedNode = nodes.find(node => {
        const dx = node.x - worldPos.x
        const dy = node.y - worldPos.y
        return Math.hypot(dx, dy) < 20
    })

    if (clickedNode) {
        showNodeDetails(clickedNode)
    } else {
        // Start dragging if not clicked on a node
        camera.dragging = true
        camera.lastX = e.clientX
        camera.lastY = e.clientY
        canvas.style.cursor = 'grabbing'
    }
})

canvas.addEventListener('mousemove', (e) => {
    if (camera.dragging) {
        const dx = e.clientX - camera.lastX
        const dy = e.clientY - camera.lastY
        camera.x += dx
        camera.y += dy
        camera.lastX = e.clientX
        camera.lastY = e.clientY
    }
})

canvas.addEventListener('mouseup', () => {
    camera.dragging = false
    canvas.style.cursor = 'default'
})

canvas.addEventListener('mouseleave', () => {
    camera.dragging = false
    canvas.style.cursor = 'default'
})

// Add touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    camera.dragging = true
    camera.lastX = touch.clientX
    camera.lastY = touch.clientY
})

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault()
    if (camera.dragging) {
        const touch = e.touches[0]
        camera.x += (touch.clientX - camera.lastX) / camera.zoom
        camera.y += (touch.clientY - camera.lastY) / camera.zoom
        camera.lastX = touch.clientX
        camera.lastY = touch.clientY
    }
})

canvas.addEventListener('touchend', () => {
    camera.dragging = false
})

canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const mouseX = e.clientX - canvas.getBoundingClientRect().left
    const mouseY = e.clientY - canvas.getBoundingClientRect().top

    // Convert mouse position to world space before zoom
    const worldX = (mouseX - camera.x) / camera.zoom
    const worldY = (mouseY - camera.y) / camera.zoom

    camera.zoom *= zoomFactor
    camera.zoom = Math.min(Math.max(0.5, camera.zoom), 2) // Limit zoom range

    // Adjust camera position to zoom toward mouse position
    camera.x = mouseX - worldX * camera.zoom
    camera.y = mouseY - worldY * camera.zoom
})

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault())

// Update the drawing functions to use camera transform
function applyCamera(ctx) {
    ctx.save()
    ctx.translate(camera.x, camera.y)
    ctx.scale(camera.zoom, camera.zoom)
}

function restoreCamera(ctx) {
    ctx.restore()
}

// // Close panels when clicking outside
// document.addEventListener('click', (e) => {

//     // Close instructions if clicking outside
//     if (!UIinstructions.panel.contains(e.target) &&
//         !UIinstructions.panel.classList.contains('hidden')) {
//         toggleInstructions()
//     }

//     // Close node details if clicking outside
//     if (!UInodeDetails.panel.contains(e.target) &&
//         !canvas.contains(e.target)) {
//         hideNodeDetails()
//     }
// })

// Helper functions
function toggleInstructions() {
    UIinstructions.panel.classList.toggle('hidden')
    if (debug) console.log("toggling instructions!")
}

function hideNodeDetails() {
    UInodeDetails.panel.classList.remove('visible')
    selectedNode = null
}

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
]

const towerTypes = {
    basic: { name: 'Basic Filter', cost: 50, accuracy: 0.5, maintenance: 0, icon: '🔍', description: 'Detects medium and large illegal transactions with 50% accuracy' },
    enhanced: { name: 'Enhanced Filter', cost: 75, accuracy: 0.7, maintenance: 0, icon: '🔬', description: 'Detects all sizes of illegal transactions with 70% accuracy' },
    ai: { name: 'AI System', cost: 100, accuracy: 0.8, maintenance: 1, icon: '🧠', description: 'Powerful detection with 80% accuracy, costs 2 maintenance per second' },
    advanced: { name: 'Advanced AI', cost: 150, accuracy: 0.9, maintenance: 5, icon: '🤖', description: 'High-end system with 90% accuracy, costs 5 maintenance per second' }
}

const txSizeOptions = {
    small: { name: 'small', speed: 1, amount: 5 },
    medium: { name: 'medium', speed: 0.75, amount: 10 },
    large: { name: 'large', speed: 0.5, amount: 15 }
}

const legalityOptions = ['legit', 'questionable', 'illegal'];

// Panel functions
function showNodeDetails(node) {
    selectedNode = node
    UInodeDetails.title.textContent = node.name
    UInodeDetails.type.textContent = node.type.charAt(0).toUpperCase() + node.type.slice(1)
    UInodeDetails.corruption.textContent = node.corruption
    UInodeDetails.received.textContent = node.receivedAmount
    UInodeDetails.detected.textContent = node.detectedAmount

    // Calculate node reputation (inverse to corruption)
    const nodeRepValue = Math.max(0, 100 - (node.corruption * 20))
    UInodeDetails.reputationValue.textContent = nodeRepValue
    UInodeDetails.reputationBar.style.width = nodeRepValue + '%'

    // Set reputation bar color based on value
    if (nodeRepValue > 70) {
        UInodeDetails.reputationBar.className = 'bar-fill good'
    } else if (nodeRepValue > 30) {
        UInodeDetails.reputationBar.className = 'bar-fill medium'
    } else {
        UInodeDetails.reputationBar.className = 'bar-fill poor'
    }

    // Clear previous tower buttons
    UInodeDetails.towerOptions.innerHTML = ''

    // Create tower buttons based on current state
    if (!node.tower) {
        // Show base options
        createTowerButton('basic', node)
        createTowerButton('ai', node)
    } else if (node.tower === 'basic') {
        // Show upgrade path for basic
        createTowerButton('enhanced', node)
    } else if (node.tower === 'ai') {
        // Show upgrade path for AI
        createTowerButton('advanced', node)
    } else {
        // Already at top tier, show message
        const maxMessage = document.createElement('div')
        maxMessage.className = 'max-tier'
        maxMessage.textContent = `Maximum ${towerTypes[node.tower].name} already installed`
        UInodeDetails.towerOptions.appendChild(maxMessage)
    }

    // Show audit button if not already audited
    if (!auditedNodes.find(a => a.id === node.id)) {
        const auditButton = document.createElement('button')
        auditButton.className = 'audit-button'
        auditButton.innerHTML = '🕴️ Audit (100)'
        auditButton.onclick = () => {
            if (budget >= 100) {
                auditedNodes.push({ id: node.id, until: Date.now() + 10000 })
                budget -= 100
                showToast('Audit initiated at ' + node.name, 'Analyzing financial activities...', 'info')
                updateNodeDetails()
            } else {
                showToast('Insufficient funds', 'Budget too low for audit', 'error')
            }
        }
        UInodeDetails.towerOptions.appendChild(auditButton)
    } else {
        const auditActive = document.createElement('div')
        auditActive.className = 'audit-active'
        auditActive.textContent = '🕴️ Audit in progress...'
        UInodeDetails.towerOptions.appendChild(auditActive)
    }

    // Show the panel
    UInodeDetails.panel.classList.add('visible')
}

function updateNodeDetails() {
    if (selectedNode) {
        showNodeDetails(selectedNode)
    }
}

function createTowerButton(towerType, node) {
    const tower = towerTypes[towerType]
    const button = document.createElement('button')
    button.className = 'tower-button'
    button.disabled = budget < tower.cost

    button.innerHTML = `
        <span class="tower-icon">${tower.icon}</span>
        <div class="tower-info">
            <div class="tower-name">${tower.name} (${tower.cost})</div>
            <div class="tower-desc">${tower.description}</div>
        </div>
    `

    button.onclick = () => {
        if (budget >= tower.cost) {
            placeTower(node, towerType)
            updateNodeDetails()
            showToast(tower.name + ' deployed', 'Installation complete at ' + node.name, 'success')
        }
    }

    UInodeDetails.towerOptions.appendChild(button)
}

function showToast(title, message, type = 'info') {
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
                reputation -= 2 // Reputation decreases when illegal transactions go through
                // showToast('Illegal transaction completed', 'Corruption increased at ' + dest.name, 'error')
                console.log(`💥 Breach at node ${dest.id}, from ${tx.path[0]}`)
            } else {
                reputation += 0.1 // Small reputation gain for legitimate transactions
            }

            // Update panel if the affected node is selected
            if (selectedNode && selectedNode.id === dest.id) {
                updateNodeDetails()
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
    maintenance -= tower.maintenance
    console.log(`🛠️ Tower placed at node ${node.id}`)

}

function detect(tx) {
    const node = nodes[tx.path[tx.index]];
    if (!node || !node.tower || tx.legality !== 'illegal') return;

    let detectionChance = towerTypes[node.tower].accuracy;

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5; // Reduce accuracy for small transactions
    }
    if (debug) console.log(`Detection roll at ${node.id}, chance: ${detectionChance}`)


    if (Math.random() < detectionChance) {
        tx.active = false;
        drawEffect(node.x, node.y, '✔️');
        showToast('Illegal transaction blocked', `Detected at ${node.name} (${towerTypes[node.tower].name})`, 'success')
        console.log(`✔️ Illegal tx blocked at node ${node.id}`)
        node.detectedAmount += tx.amount

        // Gain reputation for successful detection
        reputation += 3

        // Update panel if the detection happens at the selected node
        if (selectedNode && selectedNode.id === node.id) {
            updateNodeDetails()
        }

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
    for (let i = effects.length - 1; i >= 0; i--) {
        if (effects[i].timer <= 0) effects.splice(i, 1)
    }
}

function updateIndicators() {
    UIindicators.budget.textContent = budget.toFixed(0)
    UIindicators.maintenance.textContent = maintenance
    UIindicators.gdp.textContent = gdp.toFixed(0)
}

// Handle mouse click to select nodes
canvas.addEventListener('click', (e) => {
    const worldPos = getWorldPosition(e.clientX, e.clientY)
    let clickedOnNode = false

    for (let node of nodes) {
        const dx = node.x - worldPos.x
        const dy = node.y - worldPos.y
        if (Math.hypot(dx, dy) < 20) {
            showNodeDetails(node)
            clickedOnNode = true
            break
        }
    }

    if (!clickedOnNode && !UInodeDetails.panel.contains(e.target)) {
        hideNodeDetails()
    }
})

// Handle mouse hover to show tooltips
let hoverNode = null
let hoverTimeout = null

function drawNode(node) {
    const isSelected = node === selectedNode
    const nodeRadius = 20
    ctx.save()  // Save canvas state

    // Draw outer ring
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)
    let color = node.type === 'bank' ? '#eee' : '#aaf'

    // Add corruption glow
    if (node.corruption > 4) {
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
        ctx.fillText(towerTypes[node.tower].icon, node.x, node.y + 25)

        // Reset shadow to avoid affecting other elements
        ctx.shadowBlur = 0
    }
    ctx.restore() // Restore to remove shadow for text drawing

    // Draw node type emoji
    ctx.font = `20px ${uiFont}`
    ctx.fillText(node.type === 'bank' ? '🏦' : '🌐', node.x - 12, node.y + 7)


    const auditStatus = auditedNodes.find(a => a.id === node.id && a.until > Date.now())
    if (auditStatus) {
        ctx.font = `14px ${uiFont}`
        ctx.fillStyle = '#000'
        ctx.shadowColor = color
        ctx.shadowBlur = 4
        ctx.fillText('🕴️ Audit', node.x - 24, node.y - 30)
    }
    if (debug) {
        ctx.fillStyle = 'white'
        ctx.fillText(node.id, node.x - 10, node.y - 20)
        if (node.corruption) {
            ctx.fillStyle = 'red'
            ctx.fillText(node.corruption, node.x, node.y + 30)
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
    let fontSize = tx.size === 'small' ? '18px' : tx.size === 'medium' ? '24px' : '32px'
    ctx.font = fontSize + `${uiFont}`
    ctx.fillText(emoji, tx.x - 10, tx.y + 10)
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
        { text: `Controls: ${hoverNode.tower ? towerTypes[hoverNode.tower].name : "None"}` },
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
    while (gdpLog.length && gdpLog[0].timestamp < Date.now() - 90000) {
        gdpLog.shift()
    }
    gdp = gdpLog.reduce((sum, tx) => sum + tx.amount, 0)

    budget += maintenance / 60 // maintenance is per second, we divide by 60 to get one by loop . Also, maintenace is negative
    // nodes.forEach(node => {
    //     if (node.tower === 'ai') budget -= 1 / 60
    //     if (node.tower === 'advanced') budget -= 5 / 60
    // })
}

function endGame(condition) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'red'
    ctx.font = `48px ${uiFont}`
    ctx.textAlign = 'center'
    ctx.fillText('You have been fired', canvas.width / 2, canvas.height / 2 - 20)

    ctx.font = `24px  ${uiFont}`
    ctx.fillStyle = 'white'
    ctx.fillText(condition, canvas.width / 2, canvas.height / 2 + 20)

    // Stop the game loop
    cancelAnimationFrame(animationFrameId)
}

let animationFrameId

function gameLoop() {
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
            case 90: // Eid
            case 356: // Christmas
                holiday = true
                console.log("🎉 holiday!")
                break
        }
        document.getElementById('day').textContent = currentDay
        document.getElementById('holiday').textContent = holiday ? '🎉' : ''
    }

    // Fix transaction spawning rate
    if (Math.random() < (holiday ? 0.06 : 0.03)) {
        spawnTransaction()
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    applyCamera(ctx)

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

    restoreCamera(ctx)

    calculateIndicators()
    updateIndicators()

    if (hoverNode && !selectedNode) {
        drawTooltip(hoverNode)
    }

    // Corruption spread
    const totalActors = nodes.length
    const totalCorruption = nodes.reduce((sum, n) => sum + n.corruption, 0)
    const spread = Math.round((totalCorruption / (3 * totalActors)) * 100)

    drawCorruptionMeter(spread)

    // Game end conditions
    if (spread >= 100) {
        endGame('Corruption has reached critical levels!')
        return
    }

    if (budget < 0) {
        endGame('The country is bankrupt!')
        return
    }

    // Remove expired audits
    for (let i = auditedNodes.length - 1; i >= 0; i--) {
        if (auditedNodes[i].until <= now) {
            const auditedNode = nodes[auditedNodes[i].id]
            console.log(`✅ Audit complete on node ${auditedNodes[i].id} `)
            auditedNode.corruption = Math.floor(auditedNode.corruption / 2)
            showToast('Audit completed', `Corruption reduced at ${auditedNode.name}`, 'info')
            auditedNodes.splice(i, 1)

            // Update the panel if the audited node is selected
            if (selectedNode && selectedNode.id === auditedNode.id) {
                updateNodeDetails()
            }
        }
    }

    animationFrameId = requestAnimationFrame(gameLoop)
}

// Initialize the game
gameLoop()

// Update mouse position calculations in click and hover handlers
function getWorldPosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    return {
        x: (screenX - camera.x) / camera.zoom,
        y: (screenY - camera.y) / camera.zoom
    }
}

// Add window resize handler
window.addEventListener('resize', resizeCanvas)

// Initialize canvas size
resizeCanvas()

// Add this function near the start of the file
function centerView() {
    // Calculate center point of all nodes
    let totalX = 0, totalY = 0;
    nodes.forEach(node => {
        totalX += node.x;
        totalY += node.y;
    });

    const centerX = totalX / nodes.length;
    const centerY = totalY / nodes.length;

    // Set camera to center on the nodes
    camera.x = canvas.width / 2 - centerX * camera.zoom;
    camera.y = canvas.height / 2 - centerY * camera.zoom;
}

// Wrap the initialization code in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    const instructionsBtn = document.getElementById('toggle-instructions')
    const centerBtn = document.getElementById('center-view')
    const debugBtn = document.getElementById('toggle-debug')
    const closeInstructionsBtn = document.getElementById('close-instructions')
    const closeNodeDetailsBtn = document.getElementById('close-panel')

    // Set up event listeners
    instructionsBtn.addEventListener('click', toggleInstructions)
    closeInstructionsBtn.addEventListener('click', toggleInstructions)
    closeNodeDetailsBtn.addEventListener('click', hideNodeDetails)
    centerBtn.addEventListener('click', centerView)
    debugBtn.addEventListener('click', () => {
        debug = !debug
        debugBtn.style.backgroundColor = debug ? 'rgba(255, 0, 0, 0.2)' : ''
    })

    // Initialize the game
    resizeCanvas()
    centerView()
    gameLoop()
})