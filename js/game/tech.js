import { techTree } from "./config.js"
import * as UI from '../UI/ui-manager.js'

// Manage data
const researchState = {
    points: 0,
    progress: {},
    cumulativePoints: 0
}

export let bonus = {
    accuracy: 1,
    aiLearning: 1,
    transactionSpeed: 1,
    maintenance: 1, // reverse
    falsePositive: 1, // reverse
    transactionDrop: 1, // reverse
    reputationDamage: 1, // reverse
    enforcementCost: 1, // reverse
    enforcementEfficiency: 1
}

export function getResearchPoints() {
    return researchState.points
}

export function addResearchPoints(amount) {
    researchState.points += amount
    return researchState.points
}

export function spendResearchPoints(amount) {
    if (researchState.points >= amount) {
        researchState.points -= amount
        return true
    }
    return false
}

export function getResearchProgress() {
    return researchState.progress
}

export function isTechUnlocked(techRequirement) {
    return !techRequirement || researchState.progress[techRequirement]?.researched
}

// Initialize technologies as locked
export function initTechTree() {
    Object.keys(techTree).forEach(branch => {
        techTree[branch].forEach(tech => {
            researchState.progress[tech.id] = {
                researched: false,
                available: tech.prerequisites.length === 0,
            }
        })
    })
}

// Check if technology can be researched
export function canResearch(techId) {
    const tech = findTechnology(techId)
    if (!tech) return false

    // Check if all prerequisites are researched
    const prereqsMet = tech.prerequisites.every(
        prereqId => researchState.progress[prereqId]?.researched
    )

    return prereqsMet && researchState.points >= tech.cost
}

// Research a technology
export function researchTechnology(techId) {
    if (!canResearch(techId)) return false

    const tech = findTechnology(techId)
    if (!spendResearchPoints(tech.cost)) return false

    researchState.progress[techId].researched = true
    researchState.cumulativePoints += tech.cost

    // Update availability of technologies that depend on this one
    updateAvailability()

    // Apply effects
    applyTechnologyEffects(tech)

    // Update UI elements that depend on technology unlocks
    UI.updateTechUnlocks()

    if (researchState.cumulativePoints > 2000) {
        console.log('Research threshold reached - activating policy button')
        UI.activatePolicy()
    }
    return true
}

// Update which technologies are available based on researched prerequisites
function updateAvailability() {
    Object.keys(techTree).forEach(branch => {
        techTree[branch].forEach(tech => {
            if (!researchState.progress[tech.id].researched) {
                researchState.progress[tech.id].available = tech.prerequisites.every(
                    prereqId => researchState.progress[prereqId]?.researched
                )
            }
        })
    })
}

// Apply the effects of a technology
function applyTechnologyEffects(tech) {
    // Implementation depends on effect types
    // This would modify game variables based on tech.effects
    if (tech.effects) {
        // adjust the bonus using the effect name, looking for if a matching property exists in the bonus object
        for (const [key, value] of Object.entries(tech.effects)) {
            if (bonus.hasOwnProperty(key)) {
                bonus[key] = value
            }
        }
    }
}

// Find a technology by ID
function findTechnology(techId) {
    for (const branch of Object.values(techTree)) {
        const tech = branch.find(t => t.id === techId)
        if (tech) return tech
    }
    return null
}

// Calculate research points gain (call this daily)
export function calculateResearchPointsGain(gdp, detectedTransactions) {
    const basePoints = 0
    const gdpBonus = 0 //Math.floor(gdp / 500);
    const detectionBonus = detectedTransactions * 5

    return basePoints + gdpBonus + detectionBonus
}