import * as Camera from './camera.js'
import { pointsDistance } from '../utils.js'

const CLICK_DETECTION_RADIUS = 20

// == UI/GAME helper functions ==
export function findNodeAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    return nodes.find(node => {
        return node.active && pointsDistance(node, worldPos) < CLICK_DETECTION_RADIUS
    })
}
export function findTransactionAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)

    return activeTransactions.find(tx => {
        const radius = tx.size === 'small' ? 10 : tx.size === 'medium' ? 12 : 18
        return pointsDistance(tx, worldPos) < radius // Math.max(CLICK_DETECTION_RADIUS, radius )
    })
}
export function findUserAt(screenX, screenY) {
    const worldPos = Camera.getWorldPosition(screenX, screenY)
    if (activeUsers.length === 0) {
        if (debug) console.log('No active users found at', screenX, screenY)
        return null
    }

    const found = activeUsers.find(user => {
        const dist = pointsDistance(user, worldPos)
        if (dist < CLICK_DETECTION_RADIUS) { // Increased click area for debugging
            // console.log(`User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${dist.toFixed(1)} - MATCH`)
        }
        return dist < 2 + user.activity / 3// CLICK_DETECTION_RADIUS
    })

    if (!found) {
        // console.log('Closest users:')
        activeUsers.slice(0, 3).forEach(user => {
            const dist = pointsDistance(user, worldPos)
            // console.log(`  User ${user.id} at ${user.x.toFixed(1)}, ${user.y.toFixed(1)} - distance: ${dist.toFixed(1)}`)
        })
    }

    return found
}

