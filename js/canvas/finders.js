import * as Camera from './camera.js'

const CLICK_DETECTION_RADIUS = 20

// == UI/GAME helper functions ==
export function findNodeAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    return nodes.find(node => {
        const dx = node.x - worldPos.x
        const dy = node.y - worldPos.y

        return node.active && Math.hypot(dx, dy) < CLICK_DETECTION_RADIUS
    })
}
export function findTransactionAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)

    return activeTransactions.find(tx => {
        const dx = tx.x - worldPos.x
        const dy = tx.y - worldPos.y
        const radius = tx.size === 'small' ? 10 : tx.size === 'medium' ? 12 : 18
        return Math.hypot(dx, dy) < radius // Math.max(CLICK_DETECTION_RADIUS, radius )
    })
}
export function findUserAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    if (activeUsers.length === 0) {
        if (debug) console.log('No active users found at', screenX, screenY)
        return null
    }

    const found = activeUsers.find(user => {
        const dx = user.x - worldPos.x
        const dy = user.y - worldPos.y
        const distance = Math.hypot(dx, dy)
        if (distance < CLICK_DETECTION_RADIUS) { // Increased click area for debugging
            // console.log(`User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${distance.toFixed(1)} - MATCH`)
        }
        return distance < CLICK_DETECTION_RADIUS
    })

    if (!found) {
        // console.log('Closest users:')
        activeUsers.slice(0, 3).forEach(user => {
            const dx = user.x - worldPos.x
            const dy = user.y - worldPos.y
            const distance = Math.hypot(dx, dy)
            // console.log(`  User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${distance.toFixed(1)}`)
        })
    }

    return found
}

