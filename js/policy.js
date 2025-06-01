// policy.js
export const regulationLevels = {
    lenient: { detectMod: 0.9, fpMod: 2 },
    balanced: { detectMod: 1.0, fpMod: 1.0 },
    stringent: { detectMod: 1.3, fpMod: 0.5 }
}

import { showToast } from './ui-manager.js'

// Policy state management
export const state = {
    current: 'balanced',
    requireValidation: false
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
            const nodeId = parseInt(e.target.dataset.id, 10);
            const node = pendingNodes.find(n => n.id === nodeId);
            if (node) {
                window.dispatchEvent(new CustomEvent('approveNode', { detail: node }));
            }
        });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nodeId = parseInt(e.target.dataset.id, 10);
            const node = pendingNodes.find(n => n.id === nodeId);
            if (node) {
                removePendingNode(node);
            }
        });
    });
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
    closeAllPanels(panel);
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
    // Todo: Policy point/reputation
    // if (policyPoints) policyPoints.textContent = state.requireValidation ? '2' : '1'

})

document.querySelectorAll('input[name="reg"]').forEach(el => {
    el.addEventListener('change', e => {
        state.current = e.target.value
        showToast('Policy updated', `Policy level is now ${state.current}`, 'info')
    })
})

