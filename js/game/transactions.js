import * as policy from './policy.js'
import * as tech from './tech.js'
import { isFirstPlay } from '../tutorial.js'
import * as UI from '../UI/ui-manager.js'
import { selectRandomly, normalRandom, skewedRandom } from '../utils.js'
import { addEffect, getSpeedControl, dropProbability, incrementDailyDetectedTransactions } from '../main.js'
import { detect } from './nodes.js'

let txId = 0

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

    const newTx = new Transaction(sourceUser, targetUser, txPath)

    if (debug) {
        console.log(`${newTx.legality === 'illegal' ? '💸' : '💵'} from ${sourceUser.id} to ${newTx.path[newTx.path.length - 1]}`)
    }

    transactions.push(newTx)

    // Occasional recurrent transaction, to be merged with structuring patter 1
    if (sourceUser.riskLevel === 6 && Math.random() < 0.1) {
        newTx.isRecurrent = true
        scheduleRecurrentTransaction(sourceUser, targetUser, txPath, newTx.amount, 10, 12)
    }

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
function _calculateRiskLevel(sourceUser, targetUser) {
    let sourceBank = nodes[sourceUser.bankId]
    // Old 
    // Illegal tx depends on the corruption of the source user (avg 2) and its bank (0 then increase)
    // If corruption is 2, 10% chance of being illegal, 5% chance of being questionable. Increase quickly with bank corruption
    // P2P transactions are more likely to be illegal
    let riskLevel = 0
        + (sourceBank ?
            sourceUser.riskLevel + sourceBank.corruption + targetUser.riskLevel :
            sourceUser.riskLevel + targetUser.riskLevel + 9) // P2P is considered as using a bad bank
        + (sourceUser.country !== targetUser.country ? 3 : 0)// +3 for international

    // legalityOptions[dice100 < 10 ? 2 : dice100 < 15 ? 1 : 0] // illegal : questionable : legit
    let result = skewedRandom(riskLevel / 4)
    if (debug) console.log("Dice", result, riskLevel / 4)
    return result
}

function _calculateLegality(riskLevel) {
    if (riskLevel < 4) return 'legit'
    if (riskLevel < 7) return 'questionable'
    return 'illegal'
}

class Transaction {
    constructor(sourceUser, targetUser, path, amount = null, riskLevel = null) {
        this.path = path
        this.id = txId++
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
        this.isRecurrent = false

        // Risk level
        if (riskLevel) {
            this.riskLevel = riskLevel
        } else {
            this.riskLevel = _calculateRiskLevel(sourceUser, targetUser)
        }
        // Misnomer: now legality is the just apparent risk level
        this.legality = _calculateLegality(this.riskLevel)

        // TODO : Updat formula depending on users sizes and for more vairation in amounts. 
        if (amount) {
            this.amount = amount
        } else {
            this.amount = Math.round(Math.exp(Math.random() * 4.2)) // 15 on average with log-normal distribution and exponent 4.2 
        }
        this.size = getTransactionSizeName(this.amount) // kept for comptaibility, in the future, we could use directly amount
        this.speed = 0.5 + Math.random() * Math.min(15 / this.amount, 1)

        // Purpose
        this.motive = _defineReference(sourceUser, targetUser, this.riskLevel, this.amount)
        if (debug) console.log("Tx created", this)

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
                if (tx.riskLevel < 6) {
                    UI.showToast('✅ Suspicious transaction validated', `It was risky, but there with limited consequences`, 'warning')
                    let change = Math.random() < 0.5 ? 5 : -7
                    policy.changePopularity(change)
                    this.validated = true
                    this.legality = 'legit'
                } else {
                    UI.showToast('✅ Suspicious transaction validated', `Later reports show that it was part of an illegal scheme, damaging your reputation and budget (-${reward}💰️).`, 'error')
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
                    UI.showToast('🧊 Transaction freezed and analyzed', `Suspicious transaction from ${this.sourceUser.name}. Gathering ${reward} in intelligence `, 'error')
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
                    UI.showToast('🛑 Transaction blocked', `Suspicious transaction from ${this.sourceUser.name}. Limited consequences`, 'warning')
                    let change = Math.random() < 0.5 ? 3 : -4
                    policy.changePopularity(change)
                } else {
                    UI.showToast('🛑 Transaction blocked', `Suspicious transaction from ${this.sourceUser.name}. Later report show it was part of an illegal scheme, boosting your reputation 🌟 by ${reward}`, 'warning')
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


function _defineReference(sourceUser, targetUser, risklevel, amount) {
    const referenceData = {
        'person-person': {
            low: {
                small: ["Coffee Money", "Lunch Split", "Parking Fee", "Small Gift", "Movie Ticket", "Gas Money"],
                medium: ["Monthly Allowance", "Birthday Gift", "Shared Vacation", "Emergency Loan", "Wedding Gift", "Holiday Gift"],
                large: ["House Down Payment", "Car Purchase", "Family Loan", "Investment Transfer", "Inheritance Gift", "Major Emergency Fund"]
            },
            medium: {
                small: ["Poker Winnings", "Side Job Payment", "Yard Sale", "Freelance Work", "Small Loan", "Bet Settlement"],
                medium: ["Personal Loan", "Investment Return", "Private Sale", "Gambling Winnings", "Rental Income", "Contract Work"],
                large: ["Major Investment", "Property Sale", "Business Partnership", "Large Loan", "Private Investment", "Asset Transfer"]
            },
            high: {
                small: ["Cash Deal", "Favor Payment", "Under-table Payment", "Anonymous Gift", "Undisclosed Service", "Private Transaction"],
                medium: ["Suspicious Transfer", "Anonymous Payment", "Complex Deal", "Undisclosed Investment", "Private Agreement", "Irregular Payment"],
                large: ["Shell Company Transfer", "Offshore Payment", "Anonymous Investment", "Complex Financial Structure", "Undisclosed Major Deal", "High-Risk Transfer"]
            }
        },
        'person-business': {
            low: {
                small: ["Retail Payment", "Online Purchase", "Subscription Service",],
                medium: ["Insurance Premium", "Utility Bill", "Monthly Service", "Equipment Purchase", "Professional Service", "Repair Service"],
                large: ["Vehicle Purchase", "Home Renovation", "Major Equipment", "Investment Account", "Insurance Policy", "Professional Contract"]
            },
            medium: {
                small: ["Invoice", "Premium Service", "Special Order", "Expedited Service", "Luxury Item", "Professional Consultation", "Premium Subscription"],
                medium: ["Investment Product", "Consulting Service", "Equipment Financing", "Professional Fee", "Business Service", "Major Purchase"],
                large: ["Real Estate Investment", "Business Equipment", "Major Contract", "Investment Portfolio", "Commercial Service", "High-Value Purchase"]
            },
            high: {
                small: ["Cash Purchase", "Anonymous Service", "Undisclosed Purchase", "Private Transaction", "Irregular Payment", "Off-books Service"],
                medium: ["Anonymous Investment", "Cash Transaction", "Undisclosed Service", "Complex Purchase", "Private Deal", "Irregular Contract"],
                large: ["Shell Company Investment", "Offshore Purchase", "Anonymous Major Deal", "Complex Financial Product", "Undisclosed Investment", "High-Risk Transaction"]
            }
        },
        'person-government': {
            low: {
                small: ["Ticket", "License Fee", "Small Fine", "Government Fee", "Permit Application", "Administrative Fee"],
                medium: ["Tax Payment", "Registration", "License Renewal", "Property Tax", "Municipal Fee"],
                large: ["Annual Tax Payment", "Major Fine", "Property Assessment", "Business License", "Import Duty", "Legal Settlement"]
            },
            medium: {
                small: ["Penalty Fee", "Late Tax Payment", "Administrative Penalty", "Compliance Fee", "Audit Fee", "Processing Fee"],
                medium: ["Back Taxes", "Penalty Payment", "Legal Fee", "Audit Settlement", "Compliance Payment", "Regulatory Fee"],
                large: ["Major Tax Settlement", "Large Penalty", "Legal Settlement", "Audit Resolution", "Complex Tax Payment", "Regulatory Settlement"]
            },
            high: {
                small: ["Irregular Fine", "Anonymous Payment", "Undisclosed Fee", "Cash Payment", "Private Settlement", "Off-record Payment"],
                medium: ["Suspicious Tax Payment", "Anonymous Settlement", "Irregular Payment", "Complex Legal Fee", "Undisclosed Fine", "Private Agreement"],
                large: ["Offshore Tax Settlement", "Anonymous Major Payment", "Complex Legal Settlement", "Undisclosed Major Fine", "High-Risk Government Payment", "Irregular Major Settlement"]
            }
        },
        'business-person': {
            low: {
                small: ["Hourly Wage", "Small Bonus", "Expense Reimbursement", "Commission", "Tip Distribution", "Small Refund"],
                medium: ["Monthly Salary", "Quarterly Bonus", "Benefits Payment", "Freelance Payment", "Contract Payment", "Professional Fee"],
                large: ["Annual Bonus", "Severance Package", "Profit Sharing", "Major Commission", "Executive Compensation", "Contract Settlement"]
            },
            medium: {
                small: ["Performance Bonus", "Incentive Payment", "Special Commission", "Consulting Fee", "Project Bonus", "Achievement Award"],
                medium: ["Investment Return", "Partnership Distribution", "Consulting Contract", "Professional Service", "Business Payment", "Performance Incentive"],
                large: ["Major Investment Return", "Partnership Payout", "Executive Package", "Major Consulting Contract", "Business Sale Proceeds", "Large Performance Bonus"]
            },
            high: {
                small: ["Cash Payment", "Under-table Payment", "Anonymous Bonus", "Irregular Commission", "Undisclosed Payment", "Private Deal"],
                medium: ["Suspicious Payment", "Anonymous Transfer", "Undisclosed Bonus", "Complex Commission", "Irregular Contract", "Private Agreement"],
                large: ["Shell Company Payment", "Offshore Transfer", "Anonymous Major Payment", "Complex Executive Package", "Undisclosed Major Deal", "High-Risk Payout"]
            }
        },
        'business-business': {
            low: {
                small: ["Supply Purchase", "Service Fee", "Monthly Subscription", "Software License", "Office Supplies", "Utility Payment"],
                medium: ["Vendor Payment", "Equipment Purchase", "Professional Service", "Contract Payment", "Insurance Premium", "Facility Rental"],
                large: ["Major Equipment", "Property Lease", "Annual Contract", "Large Vendor Payment", "Facility Purchase", "Major Service Contract"]
            },
            medium: {
                small: ["Premium Service", "Expedited Order", "Special Purchase", "Professional Consultation", "Technical Service", "Priority Support"],
                medium: ["Partnership Agreement", "Joint Venture", "Strategic Purchase", "Major Contract", "Business Investment", "Commercial Deal"],
                large: ["Acquisition Payment", "Major Investment", "Strategic Partnership", "Large Commercial Deal", "Business Merger", "Major Joint Venture"]
            },
            high: {
                small: ["Cash Transaction", "Anonymous Purchase", "Irregular Payment", "Undisclosed Service", "Private Deal", "Off-books Purchase"],
                medium: ["Anonymous Business Deal", "Complex Transaction", "Undisclosed Partnership", "Irregular Contract", "Suspicious Investment", "Private Agreement"],
                large: ["Shell Company Transaction", "Offshore Business Deal", "Anonymous Acquisition", "Complex Financial Structure", "Undisclosed Major Deal", "High-Risk Investment"]
            }
        },
        'business-government': {
            low: {
                small: ["Business License", "Registration Fee", "Compliance Fee", "Filing Fee", "Permit Fee", "Administrative Fee"],
                medium: ["Monthly Tax Payment", "Regulatory Fee", "Compliance Payment", "Import Duty", "Business Tax", "Municipal Fee"],
                large: ["Annual Corporate Tax", "Major Compliance Payment", "Large Import Duty", "Regulatory Settlement", "Major Business Tax", "Large Municipal Fee"]
            },
            medium: {
                small: ["Penalty Fee", "Late Payment", "Administrative Penalty", "Audit Fee", "Compliance Adjustment", "Processing Fee"],
                medium: ["Audit Settlement", "Penalty Payment", "Back Taxes", "Regulatory Fine", "Compliance Settlement", "Legal Fee"],
                large: ["Major Tax Settlement", "Large Penalty Payment", "Major Audit Settlement", "Regulatory Settlement", "Complex Tax Payment", "Large Legal Settlement"]
            },
            high: {
                small: ["Irregular Payment", "Anonymous Fee", "Cash Payment", "Undisclosed Fine", "Private Settlement", "Off-record Payment"],
                medium: ["Suspicious Tax Payment", "Anonymous Settlement", "Complex Payment", "Irregular Settlement", "Undisclosed Payment", "Private Agreement"],
                large: ["Offshore Tax Settlement", "Anonymous Major Payment", "Complex Legal Settlement", "Undisclosed Major Payment", "High-Risk Government Payment", "Irregular Major Settlement"]
            }
        },
        'government-person': {
            low: {
                small: ["Social Security", "Unemployment Benefits", "Small Refund", "Benefit Payment", "Government Stipend", "Administrative Refund"],
                medium: ["Tax Refund", "Pension Payment", "Disability Benefits", "Government Salary", "Benefits Package", "Social Payment"],
                large: ["Large Tax Refund", "Retirement Payout", "Major Benefits", "Government Contract Payment", "Large Pension", "Major Social Payment"]
            },
            medium: {
                small: ["Emergency Aid", "Disaster Relief", "Special Benefits", "Crisis Payment", "Emergency Fund", "Relief Payment"],
                medium: ["Legal Settlement", "Compensation Payment", "Emergency Relief", "Government Contract", "Special Program", "Major Benefits"],
                large: ["Major Legal Settlement", "Large Compensation", "Major Emergency Relief", "Large Government Contract", "Major Program Payment", "Large Relief Fund"]
            },
            high: {
                small: ["Anonymous Payment", "Irregular Benefits", "Undisclosed Payment", "Cash Transfer", "Private Settlement", "Off-record Payment"],
                medium: ["Suspicious Government Payment", "Anonymous Relief", "Complex Payment", "Irregular Settlement", "Undisclosed Transfer", "Private Agreement"],
                large: ["Offshore Government Payment", "Anonymous Major Transfer", "Complex Legal Settlement", "Undisclosed Major Payment", "High-Risk Government Transfer", "Irregular Major Payment"]
            }
        },
        'government-business': {
            low: {
                small: ["Government Purchase", "Administrative Fee", "Service Payment", "Regulatory Payment", "License Payment", "Processing Fee"],
                medium: ["Government Contract", "Subsidy Payment", "Grant Funding", "Public Service", "Infrastructure Payment", "Municipal Contract"],
                large: ["Major Government Contract", "Large Subsidy", "Major Grant", "Infrastructure Contract", "Public Works", "Large Municipal Contract"]
            },
            medium: {
                small: ["Emergency Purchase", "Priority Service", "Special Contract", "Crisis Payment", "Expedited Service", "Emergency Fund"],
                medium: ["Emergency Funding", "Strategic Investment", "Crisis Contract", "Major Service", "Special Program", "Priority Contract"],
                large: ["Major Emergency Funding", "Strategic Partnership", "Major Crisis Response", "Large Strategic Investment", "Major Defense Contract", "Large Emergency Contract"]
            },
            high: {
                small: ["Anonymous Contract", "Irregular Payment", "Undisclosed Purchase", "Cash Transaction", "Private Deal", "Off-record Payment"],
                medium: ["Suspicious Government Contract", "Anonymous Funding", "Complex Payment", "Irregular Contract", "Undisclosed Deal", "Private Agreement"],
                large: ["Offshore Government Payment", "Anonymous Major Contract", "Complex Defense Deal", "Undisclosed Major Funding", "High-Risk Investment", "Irregular Major Contract"]
            }
        },
        'government-government': {
            low: {
                small: ["Administrative Transfer", "Department Payment", "Inter-office Transfer", "Administrative Fee", "Service Payment", "Processing Fee"],
                medium: ["Budget Allocation", "Inter-agency Transfer", "Department Budget", "Municipal Transfer", "Administrative Payment", "Service Contract"],
                large: ["Major Budget Transfer", "Large Allocation", "Major Inter-agency Transfer", "Large Municipal Payment", "Major Administrative Transfer", "Large Service Contract"]
            },
            medium: {
                small: ["Emergency Transfer", "Crisis Payment", "Special Allocation", "Priority Transfer", "Emergency Fund", "Crisis Response"],
                medium: ["Emergency Funding", "Crisis Budget", "International Aid", "Strategic Transfer", "Major Emergency Fund", "Crisis Response Fund"],
                large: ["Major Emergency Funding", "Large Crisis Budget", "Major International Aid", "Large Strategic Transfer", "Major Crisis Fund", "Large Emergency Response"]
            },
            high: {
                small: ["Classified Payment", "Anonymous Transfer", "Irregular Payment", "Undisclosed Transfer", "Private Deal", "Off-record Payment"],
                medium: ["Classified Transfer", "Anonymous Government Payment", "Complex Payment", "Irregular Transfer", "Undisclosed Deal", "Private Agreement"],
                large: ["Major Classified Transfer", "Anonymous Major Payment", "Complex International Payment", "Undisclosed Major Transfer", "High-Security Fund", "Irregular Major Operation"]
            }
        }
    }

    const key = `${sourceUser.type}-${targetUser.type}`
    const riskCategory = risklevel < 4 ? 'low' : risklevel < 7 ? 'medium' : 'high'
    const amountTier = amount < 1000 ? 'small' : amount < 10000 ? 'medium' : 'large'

    return selectRandomly(referenceData[key][riskCategory][amountTier])
}

// == Recurrent Transaction System ==
function scheduleRecurrentTransaction(sourceUser, targetUser, txPath, amount, daysInterval, maxRecurrences) {
    const recurrenceInterval = daysInterval * 1000 // 30 seconds (1 month in game time)

    let count = 0

    if (debug) {
        console.log(`📅 Scheduled recurrent transaction: ${sourceUser.name} → ${targetUser.name} (${maxRecurrences} times)`)
    }

    function createRecurrence() {
        if (count >= maxRecurrences || !sourceUser.active || !targetUser.active) {
            return
        }
        const risk = 6 // Fixed for the moment (questionable that is illegal)

        // Create new transaction with same parameters
        const newTx = new Transaction(sourceUser, targetUser, txPath, amount, risk)
        newTx.isRecurrent = true
        transactions.push(newTx)

        count++

        if (debug) {
            console.log(`🔄 Recurrent transaction ${count}/${maxRecurrences}: ${sourceUser.name} → ${targetUser.name}`)
        }

        // Schedule next recurrence
        setTimeout(createRecurrence, recurrenceInterval)
    }

    // Schedule first recurrence
    setTimeout(createRecurrence, recurrenceInterval)
}
