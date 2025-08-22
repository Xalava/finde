import * as Camera from '../canvas/camera.js'
import { isMobile } from '../canvas/visual-constants.js'
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

export function positionTransactionTooltip(tx) {
    // Position tooltip: keep it on-screen by flipping side if near edges
    const pt = Camera.getScreenPos(tx.x, tx.y)
    const PANEL_W = parseFloat(getComputedStyle(tooltip.panel).width) || 204
    const PANEL_H = tooltip.panel.offsetHeight || 120 // fallback if hidden
    const M = 10 // margin to screen edges

    let left, top

    if (isMobile) {
        // Default: below the transaction
        left = pt.x - 120
        top = pt.y + 30

        // Flip above if it would overflow bottom
        if (top + PANEL_H > innerHeight - M) {
            top = pt.y - PANEL_H - 10
        }

        // Clamp horizontally to stay on screen
        if (left < M) left = M
        if (left + PANEL_W > innerWidth - M) left = innerWidth - PANEL_W - M
        // Clamp vertically to stay on screen (in case flipping still goes above)
        if (top < M) top = M

    } else {
        // Default: to the right of the transaction
        left = pt.x + 35
        top = pt.y - 35

        // Flip to left if it would overflow right
        if (left + PANEL_W > innerWidth - M) {
            left = pt.x - PANEL_W - 35
        }

        // Avoid overflowing bottom; keep margin
        if (top + PANEL_H > innerHeight - M) {
            top = innerHeight - PANEL_H - M
        }

        // Clamp to top/left margins
        if (left < M) left = M
        if (top < M) top = M
    }

    tooltip.panel.style.left = `${left}px`
    tooltip.panel.style.top = `${top}px`
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
    positionTransactionTooltip(tx)

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

