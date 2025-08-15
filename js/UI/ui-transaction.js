import { legalityColorMap, countries } from '../game/config.js'

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

    itemEl.setAttribute('data-tx-index', tx.index || 0)
    if (isClickable) itemEl.classList.add('clickable-transaction')

    amountEl.style.color = statusColor
    amountEl.textContent = `$${tx.amount}`

    if (userId) {
        // User-specific: show only counterparty with direction
        let counterparty, arrow, counterpartyCountry
        if (tx.path[0] === userId) {
            counterparty = receiver
            arrow = '→'
            counterpartyCountry = receiverCountry
        } else {
            counterparty = sender
            arrow = '←'
            counterpartyCountry = senderCountry
        }
        partiesEl.textContent = `${arrow} ${counterparty?.name || 'Unknown'} ${counterpartyCountry}`
    } else {
        // General format: show both parties with countries
        partiesEl.innerHTML = `${sender.name} ${senderCountry} <br><span class="arrow">→</span> ${receiver.name} ${receiverCountry}`
    }
    return itemEl.outerHTML
}

