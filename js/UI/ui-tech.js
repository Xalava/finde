// tech-ui.js - Simplified tech tree with fixed grid layout
import { getResearchPoints, addResearchPoints, getResearchProgress, canResearch, researchTechnology } from '../game/tech.js'
import { techTree } from '../game/config.js'
import { showToast, togglePanel, show } from './ui-manager.js'

let currentTab = 'compliance'

const resUI = {
    panel: document.getElementById('research-panel'),
    points: document.getElementById('research-points'),
    button: document.getElementById('research-button'),
    close: document.getElementById('close-research')
}

export function initTechUI() {
    // Add event listeners for the research panel
    const toggleResearch = togglePanel('research-panel', () => {
        updateResearchPointsDisplay()
        renderTechTree()
    })
    resUI.button.addEventListener('click', toggleResearch)
    resUI.close.addEventListener('click', toggleResearch)

    // Add tab switching functionality
    const tabButtons = document.querySelectorAll('.panel-tabs .tab-button')
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'))
            button.classList.add('active')
            currentTab = button.getAttribute('data-tab')
            renderTechTree()
        })
    })

    // Initial update
    updateResearchPointsDisplay()
}


let firstResearchPoint = false
function updateResearchPointsDisplay() {
    const pts = getResearchPoints()
    resUI.points.textContent = pts
    // Todo link with unlock logic
    if (pts >= 1 && !firstResearchPoint) {
        addResearchPoints(10)// one time bonus for the early game
        setTimeout(() => {
            show(resUI.button)
            showToast(`🧪 Research Enabled!`, `Research points are collected when blocking or analysing some transactions.`, 'info')
        }, 1000)

        firstResearchPoint = true
    }
}
function renderTechTree() {
    const container = document.getElementById('tech-tree-container')
    container.innerHTML = ''

    const branch = techTree[currentTab]
    if (!branch) return

    // Create a simple list of tech items
    const techList = document.createElement('div')
    techList.className = 'tech-list'

    // Group techs by their "tier" (determined by prerequisites chain depth)
    const techTiers = groupTechsByTier(branch)

    // Create sections for each tier
    techTiers.forEach((tierTechs, tierIndex) => {

        // Add tech items for this tier
        const techRow = document.createElement('div')
        techRow.className = 'tech-row'

        tierTechs.forEach(tech => {
            const techElement = createTechElement(tech)
            techRow.appendChild(techElement)
        })

        techList.appendChild(techRow)
    })

    container.appendChild(techList)
}

// Replace the groupTechsByTier function with this updated version
function groupTechsByTier(branch) {
    // Initialize tiers array
    const tiers = []

    // Find tier 1 techs (no prerequisites)
    const tier1 = branch.filter(tech => !tech.prerequisites || tech.prerequisites.length === 0)
    tiers.push(tier1)

    // Create a set of processed tech IDs
    const processed = new Set(tier1.map(tech => tech.id))

    // Keep processing until all techs are assigned
    while (processed.size < branch.length) {
        const nextTier = branch.filter(tech =>
            // Only include techs not yet processed
            !processed.has(tech.id) &&
            // Only include techs whose all prerequisites are already processed
            tech.prerequisites.every(prereqId => processed.has(prereqId))
        )

        // If we couldn't find any techs for the next tier, break to avoid infinite loop
        if (nextTier.length === 0) break

        // Sort the next tier by their prerequisites to maintain logical order
        nextTier.sort((a, b) => {
            // First try to sort by their prerequisite IDs
            const aPrereq = a.prerequisites[0] || ''
            const bPrereq = b.prerequisites[0] || ''

            // If prerequisites are different, sort by prerequisite order
            if (aPrereq !== bPrereq) {
                const allTechs = branch.map(tech => tech.id)
                return allTechs.indexOf(aPrereq) - allTechs.indexOf(bPrereq)
            }

            // If same prerequisite, use the original order in the branch
            return branch.indexOf(a) - branch.indexOf(b)
        })

        // Add the new tier and mark these techs as processed
        tiers.push(nextTier)
        nextTier.forEach(tech => processed.add(tech.id))
    }

    return tiers
}

// Replace the createTechElement function with this cleaner version
function createTechElement(tech) {
    const progress = getResearchProgress()[tech.id]
    const currentPoints = getResearchPoints()
    const canAfford = progress.available && currentPoints >= tech.cost

    let cssClass = 'tech-item '
    if (progress.researched) {
        cssClass += 'researched'
    } else if (progress.available) {
        cssClass += canAfford ? 'available' : 'unaffordable'
    } else {
        cssClass += 'locked'
    }

    const techElement = document.createElement('div')
    techElement.className = cssClass
    techElement.setAttribute('data-tech-id', tech.id)

    // Create HTML more directly
    const prereqsText = tech.prerequisites && tech.prerequisites.length > 0 ?
        `<div class="tech-prereqs">Requires: ${tech.prerequisites.map(id => {
            // Find prerequisite techs by ID in any branch
            for (const branch of Object.values(techTree)) {
                const prereq = branch.find(t => t.id === id)
                if (prereq) return prereq.name
            }
            return id
        }).join(', ')}</div>` : ''

    techElement.innerHTML = `
      <div class="tech-icon">${tech.icon}</div>
        <div class="tech-info">
            <div class="tech-name">${tech.name}</div>
            <div class="tech-cost">🧪 ${tech.cost}</div>
            <div class="tech-desc">${tech.description}</div>
        ${prereqsText}
        </div>
    `

    // Only add click handler if available but not researched
    if (progress.available && !progress.researched) {
        techElement.addEventListener('click', () => {
            if (canResearch(tech.id)) {
                researchTechnology(tech.id)
                updateResearchPointsDisplay()
                renderTechTree()
                showToast(`Technology Researched!`, `${tech.name} has been successfully researched.`, 'success')
            } else {
                showToast(`Cannot Research`, `Not enough research points (${getResearchPoints()}/${tech.cost}).`, 'error')
            }
        })
    }

    return techElement
}

export function updateResearchUI() {
    updateResearchPointsDisplay()

    const panel = document.getElementById('research-panel')
    if (!panel.classList.contains('hidden')) {
        renderTechTree()
    }
}