import * as policy from './policy.js'
import * as tech from './tech.js'
import { isFirstPlay } from '../tutorial.js'
import * as UI from '../UI/ui-manager.js'
import { selectRandomly, normalRandom } from '../utils.js'
import { addEffect, getSpeedControl, dropProbability, incrementDailyDetectedTransactions } from '../main.js'
import { detect } from './nodes.js'

// == Transaction Management ==
export function spawnTransaction() {
    
    const sourceUser = selectRandomly(activeUsers)
    // let targetUser = selectRandomly(activeUsers.filter(u => u.country !== sourceUser.country))
    const targetUser = selectRandomly(activeUsers.filter(u => u.id !== sourceUser.id))

    if (!sourceUser || !targetUser) {
        // Should never happen
        console.error("Error spawning transaction: missing user.")
        return
    }
    const sourceBank = nodes[sourceUser.bankId]
    const targetBank = nodes[targetUser.bankId]

    let txPath = []
    if (!sourceBank || !targetBank) {
        txPath = [sourceUser.id, targetUser.id]
    } else {
        const innerPath = getPathFrom(sourceBank.id, targetBank.id)
        if (!innerPath || innerPath.length < 2) return

        txPath = [sourceUser.id, ...innerPath, targetUser.id]
    }

    const newTx = new Transaction(sourceUser, targetUser, txPath, nodes)

    if (debug) {
        console.log(`${newTx.legality === 'illegal' ? '💸' : '💵'} from ${sourceUser.id} to ${newTx.path[newTx.path.length - 1]}`)
    }

    transactions.push(newTx)
    addEffect(sourceUser.x, sourceUser.y, '', 'invertedPulse')

}
function getPathFrom(startId, targetId = null) {
    const visited = new Set()
    const queue = [[startId]]

    while (queue.length > 0) {
        const path = queue.shift()
        const current = path[path.length - 1]
        if (!visited.has(current)) {
            visited.add(current)
            for (const [a, b] of edges) {
                const neighbor = (a === current ? b : b === current ? a : null)
                if (neighbor !== null && !visited.has(neighbor) && nodes[neighbor].active) {
                    const newPath = [...path, neighbor]
                    if (neighbor === targetId) return newPath
                    queue.push(newPath)
                }
            }
        }
    }
    return null
}
class Transaction {
    constructor(sourceUser, targetUser, path, nodes) {
        this.path = path
        this.index = 0
        this.issuanceDate = Date.now()
        this.x = sourceUser.x
        this.y = sourceUser.y
        this.sourceUser = sourceUser
        this.targetUser = targetUser
        this.active = true
        this.isSelected = false
        this.isFollowed = false
        this.endDate = null
        this.endReason = null
        this.validated = false

        const sourceBank = nodes[sourceUser.bankId]
        this.legality = this._calculateLegality(sourceUser, targetUser, sourceBank)

        // TODO : Updat formula depending on users sizes and for more vairation in amounts. 
        this.amount = Math.round(Math.exp(Math.random() * 4.2)) // 15 on average with log-normal distribution and exponent 4.2 
        this.size = getTransactionSizeName(this.amount) // kept for comptaibility, in the future, we could use directly amount
        this.speed = 0.5 + Math.random() * Math.min(15 / this.amount, 1)
    }

    _calculateLegality(sourceUser, targetUser, sourceBank) {
        // Illegal tx depends on the corruption of the source user (avg 2) and its bank (0 then increase)
        // If corruption is 2, 10% chance of being illegal, 5% chance of being questionable. Increase quickly with bank corruption
        // P2P transactions are more likely to be illegal
        let multi = sourceBank ?
            Math.max(200 / (sourceUser.corruption + sourceBank.corruption * 5 + 1), 20) : // 20 to 200
            Math.max(100 / (sourceUser.corruption + targetUser.corruption + 1), 20) // 20 to 100

        const dice100 = Math.random() * multi
        return legalityOptions[dice100 < 10 ? 2 : dice100 < 15 ? 1 : 0] // illegal : questionable : legit
    }

    moveTransaction() {
        // Should be updated for P2P tx
        // We are already at the last node. Should not happen
        if (this.index >= this.path.length - 1)
            return
        if (this.freezed)
            return
        const nextId = this.path[this.index + 1]
        const next = this.index + 1 === this.path.length - 1 ?
            users[nextId] :
            nodes[nextId]

        const dx = next.x - this.x
        const dy = next.y - this.y
        const speed = this.speed * tech.bonus.transactionSpeed * getSpeedControl()
        const dist = Math.hypot(dx, dy)

        if (dist < speed) {
            // remaining distance to next node is less than the speed of the transaction
            if (!next.active) {
                this.loseTransaction(`Due to ${next.name} closure`)
                return false
            }

            // TODO Could handle active nodes but under audit or investigation. 
            this.index++
            // we check for detection when we reach a node. If detected, there will be no income
            next.receivedAmount += this.amount
            if (detect(next, this)) {
                // TODO : Remove these variables and use log of gdp directly
                next.detectedAmount += this.amount
                incrementDailyDetectedTransactions()
                // we could use a more semantic return to update the tx status
                return
            }

            if (this.index === this.path.length - 2) {
                // We have reached the end of the path
                // in the future, inspection could cost to budget
                // Also, these effect could happen to all nodes, except taxes
                // const isAudited = auditedNodes.some(a => a.id === next.id)
                // if (isAudited) baseIncome = Math.floor(tx.amount / 2)
                // damages will incur
                next.completeTransaction(this)
            }
            if (this.index == this.path.length - 1) {
                // Record for GDP [TODO : we could use transactions array instead]
                gdpLog.push({ amount: this.amount, timestamp: Date.now(), legality: this.legality })

                addEffect(next.x, next.y, '', 'pulse')
                this.endTransaction('completed')

                // Clear selection if this transaction was selected
                if (this.isSelected) {
                    UI.hideTransactionTooltip()
                    UI.clearTransactionSelection()
                }
            }

        } else {
            // Chance of transmission failure
            if (!isFirstPlay() && Math.random() < dropProbability) {
                this.loseTransaction('Due to poor transmissions. Develop the appropriate technologies.')
                return
            }
            //  Move toward target 
            this.x += (dx / dist) * speed
            this.y += (dy / dist) * speed
        }

    }

    loseTransaction(message = '') {
        this.endTransaction('lost')
        console.log("Transaction lost!")
        addEffect(this.x - 2, this.y, "∅", "insitus")
        let lostTransactions = transactions.filter(tx => tx.endReason === 'lost').length
        if (lostTransactions < 2 || lostTransactions % 10 === 0) {
            UI.showToast('∅ Lost transaction', message, 'error')
        }
    }
    validate() {
        let reward = normalRandom(30)
        if (this.validated) {
            UI.showToast('✅ Transaction already validated', `No effect`, 'success')
            return
        }
        switch (this.legality) {
            case 'legit':
                UI.showToast('✅ Transaction validated', `Legit transaction from ${this.sourceUser.name}. `, 'success')
                budget += 1
                addEffect(this.x, this.y, "+1", "budget")
                policy.changePopularity(3)
                this.validated = true
                break
            case 'questionable':
                if (Math.random() < 0.5) {
                    UI.showToast('✅ Questionable transaction validated', `It was risky, but there with limited consequences`, 'warning')
                    let change = Math.random() < 0.5 ? 5 : -7
                    policy.changePopularity(change)
                    this.validated = true
                    this.legality = 'legit'
                } else {
                    UI.showToast('✅ Questionable transaction validated', `Later reports show that it was part of an illegal scheme, damaging your reputation and budget (-${reward}💰️).`, 'error')
                    policy.changePopularity(-reward)
                    budget -= reward
                    this.legality = 'illegal'
                    // (This one is now a normal illegal that could be validated again.)
                }
                break
            case 'illegal':
                UI.showToast('✅ Illegal transaction validated', `${reward > 9 ? "Strongly damaging" : "Damaging"} damaging your reputation (-${reward * 5})`, 'error')
                policy.changePopularity(-reward * 5)
                this.validated = true
                break
        }
        this.legality = 'legit'
    }
    freeze() {
        let reward = normalRandom(30)
        if (this.wasFreezed) {
            UI.showToast('🧊 Transaction already analyzed', `No effect`, 'warning')
            return
        }
        this.wasFreezed = true
        this.freezed = true
        // addEffect(this.x , this.y, "🧊", "freeze")
        setTimeout(() => {
            this.freezed = false
            switch (this.legality) {
                case 'legit':
                    UI.showToast('🧊 Transaction freezed and analyzed', `Damage in global popularity for freezing a legitimate operation from ${this.sourceUser.name}`, 'error')
                    policy.changePopularity(-reward)
                    break
                case 'questionable':
                    UI.showToast('🧊 Transaction freezed and analyzed', `Questionable transaction from ${this.sourceUser.name}. Gathering ${reward} in intelligence `, 'error')
                    tech.addResearchPoints(reward)
                    if (Math.random() > 0.5) {
                        this.legality = 'legit'
                    } else {
                        this.legality = 'illegal'
                    }
                    break
                case 'illegal':
                    UI.showToast('🧊 Transaction freezed and analyzed', `Illegal transaction from ${this.sourceUser.name}. Gathering intelligence ( ${reward * 2}), but the transaction may still cause damage`, 'warning')
                    tech.addResearchPoints(reward * 2)
                    break
            }

        }, 3000)
    }
    block() {
        console.log('Transaction blocked')
        this.endTransaction('blocked')
        addEffect(this.x - 2, this.y, "❌", "insitus")
        let reward = normalRandom(120)
        switch (this.legality) {
            case 'legit':
                UI.showToast('🛑 Legit transaction blocked', `${reward > 9 ? "Heavy damage" : "Damage"} in global popularity (-${reward * 2})`, 'error')
                policy.changePopularity(-reward * 2)
                break
            case 'questionable':
                if (Math.random() < 0.5) {
                    UI.showToast('🛑 Transaction blocked', `Questionable transaction from ${this.sourceUser.name}. Limited consequences`, 'warning')
                    let change = Math.random() < 0.5 ? 3 : -4
                    policy.changePopularity(change)
                } else {
                    UI.showToast('🛑 Transaction blocked', `Questionable transaction from ${this.sourceUser.name}. Later report show it was part of an illegal scheme, boosting your reputation 🌟 by ${reward}`, 'warning')
                    policy.changePopularity(reward)
                }
                break
            case 'illegal':
                UI.showToast('🛑 Transaction blocked', `Illegal transaction from ${this.sourceUser.name}has been blocked. Gaining popularity (+${reward})`, 'success')
                policy.changePopularity(reward)
                break
        }
    }
    endTransaction(reason) {
        this.active = false
        this.endDate = Date.now()
        this.endReason = reason
        // TODO Remove from transactions array 
        // Alternatively we could keep tx for statistics
        // const index = transactions.indexOf(this)
        // if (index > -1) {
        //     transactions.splice(index, 1)
        // }
    }
}
