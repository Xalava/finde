import * as Camera from '../canvas/camera.js'
import { isMobile } from '../canvas/graphics.js'
import { legalityColorMap, countries } from '../game/config.js'
import { setSelectedTransaction, show, tooltip } from './ui-manager.js'

export function formatTransaction(tx, userId = null, isClickable = false) {
    const template = document.getElementById('transaction-template')
    const clone = template.content.cloneNode(true)

    const statusColor = legalityColorMap[tx.legality]
    const sender = window.users.find(u => u.id === tx.path?.[0])
    const receiver = window.users.find(u => u.id === tx.path?.[tx.path.length - 1])

    const senderCountry = countries[sender.country].flag
    const receiverCountry = countries[receiver.country].flag

    // Configure the template elements
    const itemEl = clone.querySelector('.transaction-item')
    const amountEl = clone.querySelector('.transaction-amount')
    const partiesEl = clone.querySelector('.transaction-parties')

    itemEl.setAttribute('data-tx-id', tx.id)

    if (isClickable) { // check Kept for historical reasons, but all tx are clickable.
        itemEl.classList.add('clickable-transaction')

    }

    amountEl.style.color = statusColor
    amountEl.textContent = `$${tx.amount}`

    // Deprecated to keep code simple and format consistent
    // if (userId) {
    //     // User-specific: show only counterparty with direction
    //     let counterparty, arrow, counterpartyCountry
    //     if (tx.path[0] === userId) {
    //         counterparty = receiver
    //         arrow = '→'
    //         counterpartyCountry = receiverCountry
    //     } else {
    //         counterparty = sender
    //         arrow = '←'
    //         counterpartyCountry = senderCountry
    //     }
    //     partiesEl.textContent = `${arrow} ${counterparty?.name || 'Unknown'} ${counterpartyCountry}`
    // } else {
    // General format: show both parties with countries
    let isSender, isReceiver = false
    if (userId) {
        if (sender.id === userId) {
            isSender = true
        } else if (receiver.id === userId) {
            isReceiver = true
        }
    }
    partiesEl.innerHTML = `
        <span style="font-style: ${isSender ? 'oblique' : 'normal'}">     ${sender.name} ${senderCountry}</span>
        <br><span class="arrow">→</span> 
        <span style="font-style:${isReceiver ? 'oblique' : 'normal'}">    ${receiver.name} ${receiverCountry}</span>`
    // }
    return itemEl.outerHTML
}

export function formatTransactionList(txs, userId = null, isClickable = false) {

    if (!txs || txs.length === 0) {
        return `<div class="no-transactions">No transactions found</div>`
    }

    return txs.map((tx, index) => {
        // tx.order = index // Add index for clickable functionality
        return formatTransaction(tx, userId, isClickable)
    }).join('')
}
// Transaction tooltip functions
export function showTransactionTooltip(tx) {

    tooltip.content.innerHTML = formatTransaction(tx, null, false)
    tooltip.motive.innerHTML = tx.motive
    if (tx.validated) {
        document.querySelector(".transaction-status").innerHTML += `<div><small>✅</small></div>`
    }

    if (tx.wasFreezed) {
        document.querySelector(".transaction-status").innerHTML += `<div><small>🧊</small></div>`
    }

    // Position tooltip
    if (isMobile) {
        // For mobile, offset the tx to be above any tutorial
        const screenPos = Camera.getScreenPos(tx.x, tx.y)
        // position below the transaction
        tooltip.panel.style.left = (screenPos.x - 120) + 'px'
        tooltip.panel.style.top = (screenPos.y + 30) + 'px'
    } else {

        const screenPos = Camera.getScreenPos(tx.x, tx.y)
        // For desktop, position to the right
        tooltip.panel.style.left = (screenPos.x + 35) + 'px'
        tooltip.panel.style.top = (screenPos.y - 35) + 'px'
    }

    if (tx.freezed) {
        tooltip.allowBtn.disabled = true
        tooltip.blockBtn.disabled = true
        tooltip.freezeBtn.disabled = true
    } else {
        tooltip.allowBtn.disabled = tx.validated
        tooltip.blockBtn.disabled = false
        tooltip.freezeBtn.disabled = tx.wasFreezed
    }

    // Show tooltip and store transaction
    show(tooltip.panel)
}

