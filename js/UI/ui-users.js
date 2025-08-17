import { countries } from '../game/config.js'
import { getUserTransactions } from '../game/users.js'
import { userDetails, show, setSelectedTransaction, hide, closeAllPanels, setSelectedUser, clearSelectedUser } from './ui-manager.js'
import { formatTransactionList } from './ui-transaction.js'

// Keep handler refs to properly add/remove listeners
let userTxClickHandler = null
let userCloseHandler = null
let userRefreshInterval = null

export function showUserDetails(user) {
    userDetails.name.textContent = user.name || 'John Doe'
    userDetails.country.textContent = countries[user.country].flag

    // Set user type and add PEP badge if applicable
    if (user.type === 'person') {
        userDetails.type.textContent = user.job
    } else {
        userDetails.type.textContent = "A " + (user.activity > 5 ? "large " : "") + user.type
    }

    // Add PEP badge for politically exposed persons
    if (user.PoliticallyExposedPerson) {
        userDetails.baddge.innerHTML += '<span class="badge badge-warning">PEP</span>'
    }

    // Store user ID for refresh functionality
    userDetails.panel.setAttribute('data-user-id', user.id)

    const uidStr = String(user.id)
    let userTransactions = getUserTransactions(user.id)

    // Initial render
    userDetails.userTransactions.innerHTML = formatTransactionList(userTransactions, user.id, true)

    show(userDetails.panel)
    // Mark user as selected for canvas highlight
    setSelectedUser(user)

    // Clear any existing refresh interval to avoid stale updates from previous users
    if (userRefreshInterval) {
        clearInterval(userRefreshInterval)
        userRefreshInterval = null
    }

    // Hacky refresh. To be handled with events
    userRefreshInterval = setInterval(() => {
        const currentUserId = userDetails.panel.getAttribute('data-user-id')
        // We exit and clean if panel closed or user changed
        if (userDetails.panel.classList.contains('hidden') || currentUserId !== user.id) {
            clearInterval(userRefreshInterval)
            userRefreshInterval = null
            return
        }

        const newUserTransactions = getUserTransactions(user.id)
        if ((newUserTransactions.length !== userTransactions.length) || (newUserTransactions.some(tx => !userTransactions.includes(tx))) || (userTransactions.some(tx => !newUserTransactions.includes(tx)))) {
            userDetails.userTransactions.innerHTML = formatTransactionList(newUserTransactions, user.id, true)
            userTransactions = newUserTransactions
        }
    }, 500)

    // Ensure we don't accumulate multiple close handlers
    if (userCloseHandler) {
        userDetails.close.removeEventListener('click', userCloseHandler)
    }
    userCloseHandler = () => {
        closeUserDetails(userRefreshInterval)
    }
    userDetails.close.addEventListener('click', userCloseHandler)

    // Use event delegation so clicks keep working after list refreshes
    if (userTxClickHandler) {
        userDetails.userTransactions.removeEventListener('click', userTxClickHandler)
    }
    userTxClickHandler = (e) => {
        const item = e.target.closest('.clickable-transaction')
        if (!item || !userDetails.userTransactions.contains(item)) return
        e.preventDefault()
        e.stopPropagation()
        const txId = Number(item.getAttribute('data-tx-id'))
        const transaction = activeTransactions.find(t => t.id === txId)
        if (transaction) {
            closeAllPanels()
            // Clear selected user when jumping to a transaction
            clearSelectedUser()
            setSelectedTransaction(transaction)
        }
    }
    // querySelectorAll('.clickable-transaction').forEach(item => {
    //     item.removeEventListener('click', userTxClickHandler)
    // })
    userDetails.userTransactions.addEventListener('click', userTxClickHandler)
}
export function closeUserDetails(interval) {
    clearInterval(interval)
    hide(userDetails.panel)
    // Clear selected user when panel closes
    clearSelectedUser()
    if (userRefreshInterval) {
        clearInterval(userRefreshInterval)
        userRefreshInterval = null
    }
    if (userCloseHandler) {
        userDetails.close.removeEventListener('click', userCloseHandler)
        userCloseHandler = null
    }
    if (userTxClickHandler) {
        userDetails.userTransactions.removeEventListener('click', userTxClickHandler)
        userTxClickHandler = null
    }
}

