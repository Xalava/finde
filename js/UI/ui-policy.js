import { pendingNodes, changePopularity, removePendingNode, state, getTaxRate, setTaxRate, popularity, popularityDelta, policyPoints, regulationLevels } from '../game/policy.js'
import { togglePanel, showToast } from './ui-manager.js'

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
            changePopularity(10)
            if (node) {
                window.dispatchEvent(new CustomEvent('approveNode', { detail: node }))
            }
        })
    })

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nodeId = parseInt(e.target.dataset.id, 10)
            const node = pendingNodes.find(n => n.id === nodeId)
            changePopularity(-100)
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

export function initPolicyUI() {
    // Initialize event listeners
    if (policyUI.button) {

        // Set up policy button click handler
        policyUI.button.addEventListener('click', (e) => {
            e.stopPropagation()
            togglePanel('policy-panel')(e)
        })
    }

    if (policyUI.close) {
        policyUI.close.addEventListener('click', (e) => {
            togglePanel('policy-panel')(e)
        })
    }
    // const policyPoints = document.getElementById('policy-points')
    // Policy change handlers
    document.getElementById('approvals-policy')?.addEventListener('change', e => {
        state.requireValidation = e.target.checked
        showToast('Policy updated', `Approvals policy is now ${state.requireValidation ? 'on' : 'off'}`, 'info')
        changePopularity(-10)
        // Todo: Policy point/reputation
        // if (policyPoints) policyPoints.textContent = state.requireValidation ? '2' : '1'
    })
    document.querySelectorAll('input[name="reg"]').forEach(el => {
        el.addEventListener('change', e => {
            state.current = e.target.value
            changePopularity(-10)
        })
    })
    const taxSlider = document.getElementById('taxation-slider')
    const taxValueDisplay = document.getElementById('taxation-value')
    taxSlider.value = getTaxRate() * 100
    taxValueDisplay.textContent = taxSlider.value
    taxSlider.addEventListener('input', (event) => {
        taxValueDisplay.textContent = event.target.value
        setTaxRate(event.target.value / 100)
        changePopularity(-10)
    })
    // Compliance policy handlers

    document.getElementById('compliance-select')?.addEventListener('change', e => {
        const level = parseInt(e.target.value)
        state.minCompliance = level
        const levelName = complianceLevels[level]
        showToast('Policy updated', `Minimum compliance set to ${levelName}`, 'info')
        changePopularity(level > 0 ? -10 : 0)
    })

    // Listen for policy changes from game module
    window.addEventListener('policyChanged', () => {
        displayPolicyStatus()
        displayPolicyPoints()
        // displayPopularityBar()
    })

    window.addEventListener('pendingNodesChanged', () => {
        updateApprovalsUI()
    })
}
export const complianceLevels = ['None', 'Basic', 'Medium', 'High']

// TODO : Display better the delta
// export function displayPopularityBar() {
//     const bar = document.getElementById('popularity-bar')
//     bar.style.width = popularity + '%'
//     const colours = ['#c0392b', '#e67e22', '#f1c40f', '#2ecc71']
//     bar.style.background = colours[Math.floor(popularity / 25)]
// }
export function displayPolicyPoints() {
    const d = popularityDelta() * 2
    const deltaText = d > 0 ? `+${d}` : d < 0 ? `${d}` : '0'
    policyPoints.innerText = deltaText
}
export function displayPolicyStatus() {
    const statusElement = document.getElementById('policy-status')
    statusElement.innerText = regulationLevels[state.current].icon
    if (state.requireValidation) {
        statusElement.style.backgroundColor = 'rgba(165, 25, 25, 0.5)'
    } else { statusElement.style.backgroundColor = 'rgba(34,37,51,0.9)' }
}
