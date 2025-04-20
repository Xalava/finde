// Module for pure UI management. 

let indicators = null;
let instructions = null;
let nodeDetails = null;
let selectedNode = null;

export function initUI() {
    indicators = {
        budget: document.getElementById('budget'),
        gdp: document.getElementById('gdp'),
        maintenance: document.getElementById('maintenance'),
        day: document.getElementById('day'),
        holiday: document.getElementById('holiday')
    }

    instructions = {
        panel: document.getElementById('instructions'),
        toggle: document.getElementById('toggle-instructions'),
        close: document.getElementById('close-instructions')
    }

    instructions.toggle.addEventListener('click', toggleInstructions)
    instructions.close.addEventListener('click', toggleInstructions)

    nodeDetails = {
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

    nodeDetails.close.addEventListener('click', hideNodeDetails)
}

export function updateIndicators(budget, gdp, maintenance) {
    indicators.budget.textContent = budget.toFixed(0);
    indicators.gdp.textContent = gdp.toFixed(0);
    indicators.maintenance.textContent = maintenance;
}

export function updateDate(day, holiday) {
    indicators.day.textContent = day;
    indicators.holiday.textContent = holiday ? '🎉' : '';
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

export function toggleInstructions() {
    instructions.panel.classList.toggle('hidden')
}

export function showNodeDetails(node, towerTypes, budget, placeTower) {
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

    updateTowerOptions(node, towerTypes, budget, placeTower)
    nodeDetails.panel.classList.add('visible')
    return selectedNode
}

function updateTowerOptions(node, towerTypes, budget, placeTower) {
    nodeDetails.towerOptions.innerHTML = ''

    if (!node.tower) {
        createTowerButton('basic', node, towerTypes, budget, placeTower)
        createTowerButton('ai', node, towerTypes, budget, placeTower)
    } else if (node.tower === 'basic') {
        createTowerButton('enhanced', node, towerTypes, budget, placeTower)
    } else if (node.tower === 'ai') {
        createTowerButton('advanced', node, towerTypes, budget, placeTower)
    } else {
        const maxMessage = document.createElement('div')
        maxMessage.className = 'max-tier'
        maxMessage.textContent = `Maximum ${towerTypes[node.tower].name} already installed`
        nodeDetails.towerOptions.appendChild(maxMessage)
    }
}

function createTowerButton(towerType, node, towerTypes, budget, placeTower) {
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
            showToast(tower.name + ' deployed', 'Installation complete at ' + node.name, 'success')
        }
    }

    nodeDetails.towerOptions.appendChild(button)
}

export function hideNodeDetails() {
    nodeDetails.panel.classList.remove('visible')
    selectedNode = null
    return selectedNode
}

export function getSelectedNode() {
    return selectedNode
}

export function updateCurrentNodeDetails(budget) {
    if (selectedNode) {
        showNodeDetails(selectedNode, towerTypes, budget, placeTower)
    }
}