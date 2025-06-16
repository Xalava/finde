export const regulationLevels = {
    lenient: { detectMod: 0.9, fpMod: 2, icon: '🌿' },
    balanced: { detectMod: 1.0, fpMod: 1.0, icon: '⚖️' },
    stringent: { detectMod: 1.3, fpMod: 0.5, icon: '🔒' }
}

import { showToast } from './ui-manager.js'


const policyPoints = document.getElementById('policy-points')

const SENTIMENT_MAX = 100
export let sentiment = 100                          // starts full

// +3 lenient, +1 balanced, –1 stringent, –1 if approvals ON
// TODO Delta could be udated via change sentiment
function sentimentDelta() {
    let d
    switch (state.current) {
        case 'lenient':
            d = 3
            break
        case 'balanced':
            d = 0
            break
        case 'stringent':
            d = -2
            break
    }
    if (state.requireValidation) d -= 1
    d -= Math.round(getTaxRate() * 10 - 2)


    const deltaText = d > 0 ? `+${d}` : d < 0 ? `${d}` : ''
    policyPoints.innerText = deltaText
    return d
}

export function changeSentiment(delta) {
    sentiment = Math.max(0, Math.min(SENTIMENT_MAX, sentiment + delta))
    displayPolicyStatus()
    displayPolicyPoints()
    displaySentimentBar()
}

export function tickSentiment() {
    changeSentiment(sentimentDelta())
}
// Policy state management
export const state = {
    current: 'balanced',
    requireValidation: false,
    minCompliance: 0
}

// Pending nodes management
let pendingNodes = []

// Public API
export function addPendingNode(node) {
    if (!pendingNodes.some(n => n.id === node.id)) {
        pendingNodes.push(node)
        updateApprovalsUI()
        return true
    }
    return false
}

export function removePendingNode(node) {
    const index = pendingNodes.findIndex(n => n.id === node.id)
    if (index > -1) {
        pendingNodes.splice(index, 1)
        updateApprovalsUI()
        return true
    }
    return false
}

export function getPendingNodes() {
    return [...pendingNodes]
}

let taxRate = 0.2
function setTaxRate(value) {

    taxRate = value

}


export function getTaxRate() {
    return taxRate
}

// UI Management
export function updateApprovalsUI() {
    const approvalsDiv = document.getElementById('approvals')

    if (!approvalsDiv) return

    approvalsDiv.innerHTML = pendingNodes.length
        ? "<h3>📂 Pending Approval:</h3>" + pendingNodes.map(node => `
            <div class="approval-item">
                <div><b>${node.name}</b> ${node.type}</div>
                <div>
                    <button class="approve-btn" data-id="${node.id}">Approve</button>
                    <button class="reject-btn" data-id="${node.id}">Reject</button>
                </div>
            </div>
        `).join('')
        : '<div class="no-approvals">No pending approvals</div>'

    // Add event listeners to new buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nodeId = parseInt(e.target.dataset.id, 10)
            const node = pendingNodes.find(n => n.id === nodeId)
            changeSentiment(1)
            if (node) {
                window.dispatchEvent(new CustomEvent('approveNode', { detail: node }))
            }
        })
    })

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nodeId = parseInt(e.target.dataset.id, 10)
            const node = pendingNodes.find(n => n.id === nodeId)
            changeSentiment(-10)
            if (node) {
                removePendingNode(node)
            }
        })
    })
}

// UI Event Handlers
const policyUI = {
    panel: document.getElementById('policy-panel'),
    button: document.getElementById('policy-button'),
    close: document.getElementById('close-policy')
}

function togglePolicyPanel(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('policy-panel');
    // closeAllPanels(panel);
    panel.classList.toggle('hidden');
}

// Initialize event listeners
if (policyUI.button) policyUI.button.addEventListener('click', togglePolicyPanel)
if (policyUI.close) policyUI.close.addEventListener('click', togglePolicyPanel)
if (policyUI.button) policyUI.button.style.display = 'none'

// const policyPoints = document.getElementById('policy-points')
// Policy change handlers
document.getElementById('approvals-policy')?.addEventListener('change', e => {
    state.requireValidation = e.target.checked
    showToast('Policy updated', `Approvals policy is now ${state.requireValidation ? 'on' : 'off'}`, 'info')
    changeSentiment(-1)
    // Todo: Policy point/reputation
    // if (policyPoints) policyPoints.textContent = state.requireValidation ? '2' : '1'

})

document.querySelectorAll('input[name="reg"]').forEach(el => {
    el.addEventListener('change', e => {
        state.current = e.target.value
        changeSentiment(-1)
    })
})


const taxSlider = document.getElementById('taxation-slider');
const taxValueDisplay = document.getElementById('taxation-value');

taxSlider.value = getTaxRate() * 100
taxValueDisplay.textContent = taxSlider.value

taxSlider.addEventListener('input', (event) => {
    taxValueDisplay.textContent = event.target.value
    setTaxRate(event.target.value / 100)
    changeSentiment(-0.1)
});

// Compliance policy handlers
export const complianceLevels = ['None', 'Basic', 'Medium', 'High']

document.getElementById('compliance-select')?.addEventListener('change', e => {
    const level = parseInt(e.target.value)
    state.minCompliance = level
    const levelName = complianceLevels[level]
    showToast('Policy updated', `Minimum compliance set to ${levelName}`, 'info')
    changeSentiment(level > 0 ? -1 : 0)
})


function displaySentimentBar() {
    const bar = document.getElementById('sentiment-bar')
    bar.style.width = sentiment + '%'
    const colours = ['#c0392b', '#e67e22', '#f1c40f', '#2ecc71']
    bar.style.background = colours[Math.floor(sentiment / 25)]
}

function displayPolicyPoints() {
    const d = sentimentDelta() * 2
    const deltaText = d > 0 ? `+${d}` : d < 0 ? `${d}` : '0'
    policyPoints.innerText = deltaText
}

function displayPolicyStatus() {
    const statusElement = document.getElementById('policy-status')
    statusElement.innerText = regulationLevels[state.current].icon
    if (state.requireValidation) {
        statusElement.style.backgroundColor = 'rgba(165, 25, 25, 0.5)'
    } else { statusElement.style.backgroundColor = 'rgba(34,37,51,0.9)' }
}