let taxRate = 0.04 // TODO distinguish fees and taxes

export const regulationLevels = {
    lenient: { detectMod: 0.9, fpMod: 2, icon: '🌿' },
    balanced: { detectMod: 1.0, fpMod: 1.0, icon: '⚖️' },
    stringent: { detectMod: 1.3, fpMod: 0.5, icon: '🔒' }
}

export const policyPoints = document.getElementById('policy-points')

export const POPULARITY = {
    INIT: 200,
    MAX: 1000
}

export let popularity = POPULARITY.INIT

// +3 lenient, +1 balanced, –1 stringent, –1 if approvals ON
// TODO Delta could be udated via change popularity
export function popularityDelta() {
    let d
    switch (state.current) {
        case 'lenient':
            d = 30
            break
        case 'balanced':
            d = 0
            break
        case 'stringent':
            d = -20
            break
    }
    if (state.requireValidation) d -= 1
    d -= Math.round(getTaxRate() * 200)

    const deltaText = d > 0 ? `+${d}` : d < 0 ? `${d}` : ''
    policyPoints.innerText = deltaText
    return d
}

export function changePopularity(delta) {
    if (isNaN(delta)) {
        console.error("NaN in popularity", delta)
        return
    }
    popularity = Math.max(0, Math.min(POPULARITY.MAX, popularity + delta))
    window.dispatchEvent(new CustomEvent('policyChanged'))
}

export function tickPopularity() {
    changePopularity(popularityDelta())
}
// Policy state management
export const state = {
    current: 'balanced',
    requireValidation: false,
    minCompliance: 0
}

// Pending nodes management
export let pendingNodes = []

// Public API
export function addPendingNode(node) {
    if (!pendingNodes.some(n => n.id === node.id)) {
        pendingNodes.push(node)
        window.dispatchEvent(new CustomEvent('pendingNodesChanged'))
        return true
    }
    return false
}

export function removePendingNode(node) {
    const index = pendingNodes.findIndex(n => n.id === node.id)
    if (index > -1) {
        pendingNodes.splice(index, 1)
        window.dispatchEvent(new CustomEvent('pendingNodesChanged'))
        return true
    }
    return false
}

export function getPendingNodes() {
    return [...pendingNodes]
}

export function setTaxRate(value) {
    taxRate = value
}

export function getTaxRate() {
    return taxRate
}

