import * as Camera from '../canvas/camera.js'
import { isMobile } from '../canvas/visual-constants.js'
import { legalityColorMap, countries } from '../game/config.js'
import { setSelectedTransaction, show, tooltip, hide } from './ui-manager.js'
import { unlock } from '../tutorial.js'

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
        // Default: above the transaction
        left = pt.x - PANEL_W / 2
        top = pt.y - 60 - PANEL_H

        // Clamp horizontally to stay on screen
        if (left < M) left = M
        if (left + PANEL_W > innerWidth - M) left = innerWidth - PANEL_W - M
        // Clamp vertically to stay on screen (in case flipping still goes above)
        if (top < M) top = M

    } else {
        // Default: to the right of the transaction
        left = pt.x + 60
        top = pt.y - 35

        // Flip to left if it would overflow right
        if (left + PANEL_W > innerWidth - M) {
            left = pt.x - PANEL_W - 60
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

    const statusEl = document.querySelector(".transaction-status")
    if (tx.validated) statusEl.innerHTML += `<div><small>✅</small></div>`
    if (tx.wasFreezed) statusEl.innerHTML += `<div><small>🧊</small></div>`

    positionTransactionTooltip(tx)

    // Configure action buttons based on transaction state
    const { allowBtn, blockBtn, freezeBtn } = tooltip

    if (tx.validated) {
        // Transaction already approved - hide all actions
        hide(allowBtn, blockBtn, freezeBtn)
    } else if (tx.freezed) {
        // Transaction currently frozen - show all buttons but disable them
        show(allowBtn, blockBtn, freezeBtn)
        allowBtn.disabled = blockBtn.disabled = freezeBtn.disabled = true
    } else {
        // Normal state - enable allow/block, conditionally show freeze
        show(allowBtn, blockBtn)
        allowBtn.disabled = blockBtn.disabled = false
        freezeBtn.disabled = tx.wasFreezed

        // Only show freeze button when unlocked in tutorial
        unlock.suspicious ? show(freezeBtn) : hide(freezeBtn)
    }
    // Show tooltip and store transaction
    show(tooltip.panel)
}

