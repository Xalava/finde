import { selectRandomly } from '../utils.js'
import { DISTANCE } from './config.js'
window.userEdges = []

function nameUser(type, country) {
    // todo name based on country too
    switch (type) {
        case 'person':
            // Select a random worldwide common name in alphabet order
            const names = [
                "Alice", "Bob", "Carlos", "David", "Elena", "Fatima", "Giulia", "Hiroshi", "Ines", "Jamal",
                "Khalid", "Linh", "Maria", "Nia", "Omar", "Priya", "Qiang", "Ravi", "Sofia", "Tariq",
                "Umar", "Valeria", "Wei", "Ximena", "Yusuf", "Zara"
            ]
            const vowels = ["a", "e", "i", "o", "u"]
            const conso = country[0]
            let name = conso.toUpperCase()
            for (let i = 0; i < Math.ceil(Math.random() * 2); i++) {
                name += selectRandomly(vowels) + conso.toLowerCase()
            }
            name += selectRandomly(vowels)

            return selectRandomly(names) + ' ' + name

            break
        case 'business':
            const businessType = ["Cafe", "Salon", "Logistics", "Restaurant", "Hotel", "Shop", "Warehouse", "Factory", "Corp"]
            const businessNames = ["Pink", "Happy", "Twisted", "Arrow", "Star", "Lion", "Panda", "Pirate", "Duck", "Bland", "Ironic", "Hiha"]
            return selectRandomly(businessNames) + ' ' + selectRandomly(businessType)
            break
        case 'government':
            const governmentType = ["Ministry", "Department", "Agency", "Commission", "Board", "Council", "Office", "Agency", "Commission", "Board", "Council", "Office"]
            const governmentDomains = ["Education", "Health", "Defense", "Justice", "Interior", "Labor", "Transport", "Environment", "Trade", "Tourism", "Science"]
            return selectRandomly(governmentDomains) + ' ' + selectRandomly(governmentType)
            break
    }
}
export function generateUsers(target = false) {
    const targetNodes = target ? [target] : activeNodes.filter(n => n.type !== 'processor')

    targetNodes.forEach(t => {
        const c = nodeTypes[t.type].usersCount
        const finalCount = Math.max(Math.floor(c / 2), Math.ceil(Math.random() * c * 2)) // count/2 to count*2 
        for (let i = 0; i < finalCount; i++) {
            const random = Math.random()
            let type = ''
            if (t.type === 'bank')
                type = random < 0.6 ? 'person' : random < 0.9 ? 'business' : 'government'

            else
                type = random < 0.7 ? 'person' : 'business'
            let user = null
            let tries = 0
            let country = nodes[t.id].country
            do {
                const x = t.x + (Math.random() - 0.5) * DISTANCE.MAX_USERTONODE
                const y = t.y + (Math.random() - 0.5) * DISTANCE.MAX_USERTONODE
                const overlapping = nodes.some(n => Math.hypot(x - n.x, y - n.y) < DISTANCE.MIN_USERTONODE) || users.some(u => Math.hypot(x - u.x, y - u.y) < DISTANCE.MIN_USERTOUSER)
                if (!overlapping) {
                    user = {
                        id: `${users.length}`,
                        name: nameUser(type, country),
                        x,
                        y,
                        type: type,
                        country,
                        corruption: Math.round(Math.random() * countries[country].corruptionRisk), // 0 to 9
                        activity: Math.round(Math.random() * countries[country].activity), // 0 to 9
                        active: true
                    }
                }
                tries++
            } while (!user && tries < 10)

            if (user) {
                // assignNearestBank(user)
                // As we generate around a platform, we don't need to look for the nearest for the moment
                user.bankId = t.id
                userEdges.push([user.id, t.id])
                users.push(user)
            }
        }
    })
}

export function assignNearestBank(user) {
    let validNodes = []
    if (user.type === 'government') {
        validNodes = activeNodes.filter(n => n.type === 'bank')
    } else {
        validNodes = activeNodes.filter(n => n.type !== 'processor')
    }
    const nearest = validNodes.sort((a, b) => Math.hypot(user.x - a.x, user.y - a.y) - Math.hypot(user.x - b.x, user.y - b.y))[0]
    if (nearest && Math.hypot(user.x - nearest.x, user.y - nearest.y) < DISTANCE.MAX_USERTONODE) {
        user.bankId = nearest.id
        userEdges = userEdges.filter(e => e[0] !== user.id)
        userEdges.push([user.id, user.bankId])
    }
}
export function realignUsersBanks() {
    users.forEach(user => {
        const prevBank = user.bankId
        assignNearestBank(user)
        if (user.bankId !== prevBank) {
            const index = userEdges.findIndex(e => e[0] === user.id)
            if (index !== -1) userEdges[index] = [user.id, user.bankId]
        }
    })
}

export function getUserTransactions(userId) {
    return activeTransactions.filter(tx => tx.sourceUser.id === userId || tx.targetUser.id === userId)
}