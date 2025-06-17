// Module for pure UI management. 
import { towerOptions, actionOptions, countries } from './config.js'
import * as tech from './tech.js'

let indicators = null
let instructions = null
let nodeDetails = null
let policy = null
let research = null

let selectedNode = null
let panels = null

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

    instructions.toggle.addEventListener('click', togglePanel('instructions'))
    instructions.close.addEventListener('click', togglePanel('instructions'))

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

    policy = {
        panel: document.getElementById('policy-panel'),

    }
    research = {
        panel: document.getElementById('research-panel'),
    }
    // helper array for iterations on panels
    panels = [
        nodeDetails.panel,
        instructions.panel,
        policy.panel,
        research.panel,
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
                hideNodeDetails();
            } else {
                panel.classList.add('hidden');
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
    nodeDetails.panel.classList.remove('hidden')
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
    nodeDetails.panel.classList.add('hidden')
    selectedNode = null
    return selectedNode
}

export function getSelectedNode() {
    return selectedNode
}

export function updateCurrentNodeDetails(budget, placeTower, enforceAction) {
    if (selectedNode) {
        showNodeDetails(selectedNode, budget, placeTower, enforceAction)
    }
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