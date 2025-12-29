import * as Camera from '../canvas/camera.js'
import * as config from './config.js'
import * as policy from './policy.js'
import * as tech from './tech.js'
import * as events from './events.js'
import { assignNearestBank, generateUsers, realignUsersBanks } from './users.js'
import { addExpenditure } from '../main.js'
import { addEffect } from '../canvas/render-manager.js'
import { isFirstPlay } from '../tutorial.js'
import * as UI from '../UI/ui-manager.js'
import { selectRandomly } from '../utils.js'

let firstDetection = false
let firstFalsePositive = false

// Assigns a country to a node based on proximity to country coordinates
function assignCountryToNode(node) {
    let closestCountryKey = null
    let minDistanceSq = Infinity

    if (!config.countries || !config.countryKeys) {
        console.error('Country data is not loaded correctly from config.')
        return
    }

    for (const countryKey of config.countryKeys) {
        const country = config.countries[countryKey]

        if (typeof country.x !== 'number' || typeof country.y !== 'number') {
            console.warn(`Country ${countryKey} in config.js is missing x or y coordinates.`)
            continue
        }

        const dx = node.x - country.x
        const dy = node.y - country.y
        const distanceSq = dx * dx + dy * dy

        if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq
            closestCountryKey = countryKey
        }
    }
    node.country = closestCountryKey
}
function reassignUsersBank(nodeID) {
    //after a bank closure, we reassign users to the nearest bank
    const failedBank = nodes[nodeID]
    userEdges = userEdges.filter(e => e[1] !== nodeID)
    const usersToUpdate = users.filter(u => u.bankId === nodeID)
    console.log(`🏦 Bank ${failedBank.name} failed - reassigning ${usersToUpdate.length} users`)
    usersToUpdate.forEach(u => {
        u.bankId = null
        assignNearestBank(u)
    })
}
// for each node, we add empty variables tower:null, detectedAmount:0, receivedAmount:0, reputation:80
export function initNodes() {
    nodes = [
        { id: 0, x: 490, y: 400, corruption: 0, type: 'processor', name: 'PayFlow', active: true },
        { id: 1, x: 500, y: 800, corruption: 0, type: 'processor', name: 'TransactPro' },
        { id: 2, x: 590, y: 640, corruption: 0, type: 'processor', name: 'SecurePay' },
        { id: 3, x: 800, y: 850, corruption: 0, type: 'processor', name: 'FastFunds' },
        { id: 4, x: 950, y: 500, corruption: 0, type: 'processor', name: 'QuickTransfer' },

        { id: 5, x: 600, y: 400, corruption: 0, type: 'bank', name: 'Global Bank', active: false },
        { id: 6, x: 400, y: 450, corruption: 0, type: 'bank', name: 'Trust Bank', active: true },
        { id: 7, x: 350, y: 550, corruption: 3, type: 'bank', name: 'Safe Savings', active: false },
        { id: 8, x: 1050, y: 250, corruption: 0, type: 'bank', name: 'Prime Bank' },
        { id: 9, x: 1130, y: 400, corruption: 0, type: 'bank', name: 'Capital Trust' },
        { id: 10, x: 330, y: 350, corruption: 1, type: 'bank', name: 'Union Bank', active: true },
        { id: 11, x: 540, y: 250, corruption: 0, type: 'bank', name: 'Metro Bank', active: true },
        { id: 12, x: 1100, y: 750, corruption: 5, type: 'bank', name: 'Pioneer Bank' },
        { id: 13, x: 900, y: 300, corruption: 0, type: 'bank', name: 'Elite Bank' },
        { id: 14, x: 800, y: 350, corruption: 0, type: 'bank', name: 'Summit Bank' },
        { id: 15, x: 900, y: 900, corruption: 0, type: 'bank', name: 'Horizon Bank' },
        { id: 16, x: 400, y: 700, corruption: 0, type: 'bank', name: 'Anchor Bank' },
        { id: 17, x: 1000, y: 650, corruption: 4, type: 'bank', name: 'Crest Bank' },
        { id: 18, x: 400, y: 930, corruption: 0, type: 'bank', name: 'Fortune Bank' },
        { id: 19, x: 600, y: 800, corruption: 0, type: 'bank', name: 'Legacy Bank' },
        { id: 20, x: 300, y: 280, corruption: 0, type: 'bank', name: 'Prestige Bank', active: true },

        // New  Fintech nodes
        { id: 21, x: 710, y: 510, corruption: 1, type: 'fintech', name: 'Rocket Pay' },
        { id: 22, x: 810, y: 460, corruption: 0, type: 'fintech', name: 'Astro Finance' },
        { id: 23, x: 1190, y: 400, corruption: 0, type: 'fintech', name: 'Lunar Pay' },
        { id: 24, x: 700, y: 1000, corruption: 1, type: 'fintech', name: 'Orbit Funds' },
        { id: 25, x: 1050, y: 550, corruption: 3, type: 'fintech', name: 'Stellar Bank' },

        // New  Crypto Exchange nodes
        { id: 26, x: 300, y: 750, corruption: 2, type: 'cryptoExchange', name: 'CryptoX' },
        { id: 27, x: 1030, y: 850, corruption: 0, type: 'cryptoExchange', name: 'BitMarket' },
        { id: 28, x: 980, y: 1050, corruption: 6, type: 'cryptoExchange', name: 'CoinTrade' },
    ]

    nodes.forEach(node => {
        node.tower = null
        node.detectedAmount = 0
        node.receivedAmount = 0
        node.reputation = config.REPUTATION.STARTING
        node.accuracy = 0
        assignCountryToNode(node) // Assign country based on proximity
        if (isFirstPlay() && node.id != 10 && node.id != 11) {
            node.active = false
        }
        // node.active = true
        // node.reputation = 0
        node.changeReputation = (amount) => {
            if (debug) {
                console.log(`#${node.id} reputation ${amount > 0 ? "+" : ''}${amount}`)
            }
            node.reputation = Math.min(100, node.reputation + amount)
            if (node.reputation < 0) {
                node.reputation = config.REPUTATION.POSTFAILURE

                UI.showToast('🚪 Bankruptcy', `Due to its plummeting reputation ${node.name} closes its doors`, 'error')
                policy.changePopularity(-100)
                node.active = false
                node.tower = null
                // Update cached activeNodes immediately since bank failed
                // updateActiveNodes()

                reassignUsersBank(node.id)
            }
        }

        node.completeTransaction = (tx) => {
            //Taxation
            const income = Math.round(tx.amount * policy.getTaxRate())
            budget += income
            if (Camera.getZoom() > 4) {
                addEffect(node.x, node.y, "+" + income, 'budget')
            }

            // Apply legality effects
            node.receivedAmount += tx.amount
            if (tx.legality === 'illegal') {
                addEffect(node.x, node.y, '', 'pulseNode', 'rgba(255, 0, 0, 0.2)')

                if (node.corruption < 9) {
                    if (tx.size === 'small') {
                        if (Math.random() < 0.3) {
                            node.corruption++
                        }
                    } else {
                        node.corruption++
                    }
                }
                node.changeReputation(-5)
                console.log(`💥 Breach #${node.id}`)
            } else if (tx.legality === 'questionable') {
                node.changeReputation(-1)
                if (debug) console.log(`Questionable transaction at node ${node.id}, from ${tx.path[0]}`)
            } else {
                node.changeReputation(1)
            }

            // Update UI if this node is selected
            if (UI.getSelectedNode()?.id === node.id) {
                UI.showNodeDetails(node, budget, placeTower, enforceAction)
            }
        }
    })
    // updateActiveNodes()
}

window.edges = [
    // processor to processor
    [0, 2], [1, 2], [2, 4],
    // processor to banks
    [0, 10], [0, 11], [0, 6], [1, 16], [1, 18], [1, 19], [2, 16], [2, 17], [3, 19], [3, 15], [4, 9], [4, 14], [4, 17], [5, 0],
    // banks to banks
    [6, 7], [8, 13], [9, 13], [10, 11], [10, 20], [11, 13], [11, 14], [12, 17], [13, 14], [15, 17], [16, 18], [17, 19],
    // fintech connections
    [21, 22], [14, 22], [8, 23], [9, 23], [15, 24], [3, 24], [17, 25],
    // crypto exchange connections
    [16, 26], [12, 27], [15, 28],
]
export function placeTower(node, towerType) {
    const tower = towerOptions[towerType]

    // Only check if this tower has a tech requirement
    if (!tech.isTechUnlocked(tower.techRequirement)) {
        UI.showToast('Technology Required', `Research "${tower.techRequirement}" to unlock this tower`, 'error')
        return
    }

    node.accuracy = tower.accuracy * tech.bonus.accuracy + (node.type === 'fintech' ? 0.1 : 0)

    node.tower = towerType
    // node.accuracy = tower.accuracy + (node.type === 'fintech' ? 0.1 : 0)// We move the accuracy to the node for AI usages
    budget -= tower.cost
    maintenance -= tower.maintenance

    // Track expenditure
    addExpenditure('tower', tower.cost, `${tower.name} installed at ${node.name}`, node.id)

    console.log(`🛠️ Tower placed at #${node.id}`)
    if (debug) console.log(tower)
    // Update UI immediately after placing tower
    UI.showNodeDetails(node, budget, placeTower, enforceAction)
}
function findConnectedNodes(nodeId) {
    const connectedNodes = []
    for (const [a, b] of edges) {
        if (a === nodeId || b === nodeId) {
            const neighbor = (a === nodeId ? b : a)
            if (nodes[neighbor].active) {
                connectedNodes.push(nodes[neighbor])
            }
        }
    }
    return connectedNodes
}
export function enforceAction(node, actionType, free = false) {
    let action = actionOptions[actionType]
    const actionCost = free ? 0 : action.cost * tech.bonus.enforcementCost
    if (budget < actionCost) {
        UI.showToast('Insufficient budget', `You need 💰${actionCost} to perform this action`, 'error')
        return
    } else {
        budget -= actionCost

        // Track expenditure (only for paid actions)
        if (!free && actionCost > 0) {
            addExpenditure('enforcement', actionCost, `${action.name} at ${node.name}`, node.id)
        }

        node.changeReputation((action.reputationEffect - node.corruption) * tech.bonus.reputationDamage)
        if (action.popularityEffect)
            policy.changePopularity(action.popularityEffect)
        node.enforcementAction = actionType
        node.enforcementEnd = Date.now() + action.duration * 1000
        if (action.affectsConnected) {
            // identify connected nodes
            let connectedNodes = findConnectedNodes(node.id)
            console.log(`Enforcing ${action.name} on connected nodes:`, connectedNodes)
            connectedNodes.forEach(n => {
                enforceAction(n, 'raid', true)
            })
        }
    }
}// TODO : Could be a method of the node
export function detect(node, tx) {
    // defensive check
    if (!node || !tx)
        console.error("Detect(): Node or tx found", node, tx)

    // No detection if there is no tower
    if (!node.tower)
        return false

    const { detectMod, fpMod } = policy.regulationLevels[policy.state.current]
    let detectionChance = node.accuracy * detectMod * events.detectMod

    if (node.tower === 'basic' && tx.size === 'small') {
        detectionChance *= 0.5 // Reduce accuracy for small transactions (TODO : could be removed)
    }

    if (debug) console.log(`Detection rolls at ${node.id} with chance ${detectionChance} (Event mod:`, events.detectMod, "PolicyMod", detectMod, "False Positive Mod", fpMod, ").")
    if (tx.riskLevel < 6) {
        // case 'legit': (suspicious tx can be caugh as illegal)
        if (!isFirstPlay()) {
            // small chance of false flag, inversely proportional to accuracy, then 10% unless robust tech
            if (Math.random() > detectionChance && Math.random() < (towerOptions[node.tower].errors * 0.01 * tech.bonus.falsePositive * fpMod)) {
                addEffect(node.x, node.y, '🔴', "tower")
                tx.endTransaction("falsePositive")
                console.log(`🔴 False postive at`, node.name)
                node.changeReputation(-5) // harmful for reputation, but not for corruption. Also the transaction ends when it shouldn't have, reducing income
                if (!firstFalsePositive) {
                    UI.showToast(`🔴 First false postive at`, `Reputation damaged at ${node.name}`, 'error')
                    firstFalsePositive = true
                }
                return true
            } else {
                return false
            }
        }
    } else {
        // case 'illegal':
        if (Math.random() < detectionChance) {
            tx.endTransaction("detected")
            addEffect(node.x, node.y, '✔️', "tower")
            if (!firstDetection) {
                UI.showToast('First illegal transaction blocked!', `Detected at ${node.name} (${towerOptions[node.tower].name})`, 'success')
                firstDetection = true
            }
            console.log(`✔️ Illegal tx blocked #${node.id}`)
            if (debug) console.log(tx)

            // Gain reputation for successful detection
            node.changeReputation(3)

            // Update panel if the detection happens at the selected node
            if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
                UI.showNodeDetails(node, budget, placeTower, enforceAction)
            }
            return true
        } else {
            return false
        }
    }
}
export function removeExpiredEnforcementActions(now) {
    nodes.filter(node => node.enforcementAction)
        .forEach(node => {
            if (node.enforcementEnd <= now) {
                let endingAction = actionOptions[node.enforcementAction]
                node.corruption = Math.round(node.corruption * endingAction.corruptionEffect / tech.bonus.enforcementEfficiency)
                node.enforcementAction = null
                node.enforcementEnd = null
                UI.showToast(`${endingAction.icon} ${endingAction.name} ended`, `Corruption reduced at ${node.name}`, 'info')
                console.log(`✅ Enforcement action ended at node ${node.id}`)

                // Update the panel if the audited node is selected
                if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
                    UI.showNodeDetails(node, budget, placeTower, enforceAction)
                }
            }
        })
}
export function increaseAIaccuracy() {
    activeNodes.filter(n => (n.tower === "ai" || n.tower === "super"))
        .forEach(n => {
            if (n.tower === "ai" && n.accuracy < 0.85) {
                n.accuracy *= 1.005 * tech.bonus.aiLearning
            } else if (n.tower === "super" && n.accuracy < 0.98) {
                n.accuracy *= 1.01 * tech.bonus.aiLearning
            }
        })
}
function getTowerLevel(tower) {
    if (!tower) return 0
    if (tower === 'basic') return 1
    if (tower === 'medium') return 2
    return 3
}
export function checkNodesCompliance() {
    if (policy.state.minCompliance === 0) {
        return
    }

    // We check 10% of the time 
    if (Math.random() > 0.1) {
        return
    }

    const nonCompliantNodes = nodes.filter(node => node.active && getTowerLevel(node.tower) < policy.state.minCompliance
    )

    if (nonCompliantNodes.length > 0) {
        const node = selectRandomly(nonCompliantNodes)
        const targetTower = ['basic', 'medium'][policy.state.minCompliance - 1]

        let cost = config.towerOptions[targetTower].cost
        if (targetTower === 'medium' && !node.tower) {
            cost += config.towerOptions.basic.cost
        }

        if (budget >= cost) {
            node.tower = targetTower
            node.accuracy = config.towerOptions[targetTower].accuracy
            budget -= cost

            // Track expenditure for compliance
            addExpenditure('compliance', cost, `Automated compliance: ${config.towerOptions[targetTower].name} at ${node.name}`, node.id)

            UI.showToast('🏛️ Automated Compliance',
                `${node.name} installed ${config.towerOptions[targetTower].name} (-${cost})`,
                'warning')

            // Update UI if this node is selected
            if (UI.getSelectedNode() && UI.getSelectedNode().id === node.id) {
                UI.showNodeDetails(node, budget, placeTower, enforceAction)
            }
        } else {
            UI.showToast(`🏛️ Automated Compliance Failure`,
                `Insufficient funds for compliance at ${node.name}. Reputation and popularity penalty.`,
                `error`)
            node.reputation -= 10
            policy.changePopularity(-10)
        }
    }
}
export function activateNode(node) {
    node.active = true
    console.log(`🌟 New node activated #${node.id}`)
    UI.showToast('🌟 A new actor has emerged', `Welcome ${node.name}`, 'info')
    if (node.reputation !== 50) {
        generateUsers(node)
    } else {
        realignUsersBanks()
    }
}
// Probably a better design could be done for active nodes. 
// export let activeNodes = []
// export function updateActiveNodes() {
//     activeNodes = nodes.filter(n => n.active)
// }