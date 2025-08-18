import { normalRandom, selectRandomly, distance } from '../utils.js'
import { DISTANCE, countries } from './config.js'
import { skewedRandom } from '../utils.js'
window.userEdges = []

export function generateUsers(target = false) {
    const targetNodes = target ? [target] : activeNodes.filter(n => n.type !== 'processor')

    targetNodes.forEach(t => {
        const c = nodeTypes[t.type].usersCount
        const finalCount = Math.max(Math.floor(c / 2), Math.ceil(Math.random() * c * 2)) // count/2 to count*2 
        for (let i = 0; i < finalCount; i++) {
            const user = new User(t)

            if (user) {
                // assignNearestBank(user)
                // As we generate around a platform, we don't need to look for the nearest for the moment
                user.bankId = t.id
                userEdges.push([user.id, t.id])
                users.push(user)
            } else {
                console.warning("User creation failed for node", t.id)
            }
        }
    })
}

class User {
    constructor(node) {
        // Location
        const { x, y } = _findSuitablePosition(node)
        if (!x || !y) return null
        this.id = `${users.length}`
        this.x = x
        this.y = y
        //type
        const random = Math.random()
        if (node.type === 'bank')
            this.type = random < 0.6 ? 'person' : random < 0.9 ? 'business' : 'government'
        else
            type = random < 0.7 ? 'person' : 'business'
        this.name = _nameUser(this.type, node.country)
        this.country = node.country
        // economic activity
        this.activity = skewedRandom(countries[node.country].activity) // 1 to 9: indicator of activity level
        this.annualIncome = _defineAnnualIncome(this.type, this.activity, countries[node.country].gdpPerCapita)
        this.active = true

        //Risk level 0-3 : low, 4-6 : medium, 7-9 : high
        if (this.type === 'person')
            this.PoliticallyExposedPerson = Math.random() < 0.05
        if (this.PoliticallyExposedPerson) {
            this.riskLevel = 7
        } else {
            // For most users, risk is associated with income and their country.
            this.riskLevel = skewedRandom((countries[node.country].corruptionRisk + this.activity * 2) / 2)
        }
        //Todo : associate business type with risklevel
        if (this.type === 'person')
            this.job = _defineJob(this.riskLevel)
        // console.log("new users", this)
        if (debug) console.log(`${this.type.slice(0, 7)}\tRisk ${this.riskLevel}\t 💰️ ${this.activity} ${this.annualIncome} `)

    }
}
function _findSuitablePosition(node) {
    let tries = 0
    do {
        const x = node.x + (Math.random() - 0.5) * DISTANCE.MAX_USERTONODE
        const y = node.y + (Math.random() - 0.5) * DISTANCE.MAX_USERTONODE
        const overlapping = nodes.some(n => distance({x, y}, n) < DISTANCE.MIN_USERTONODE) || users.some(u => distance({x, y}, u) < DISTANCE.MIN_USERTOUSER)
        if (!overlapping) {
            return ({ x, y })
        }
        tries++
    } while (tries < 10)
    return null
}

function _nameUser(type, country) {
    // todo name based on country too
    switch (type) {
        case 'person':
            // Select a random worldwide common name in alphabet order
            const names = [
                "Alice", "Anatole", "Aroha", "Ah-yoon", "Aadhya", "Bob", "Boris", "Carlos", "Carolina", "David", "Daria", "Elena", "Elijah", "Fatima", "Fiona", "Giulia", "Gaëlle", "Hector", "Hiroshi", "Haruto", "Ines", "Isabela", "Jamal", "James", "Khalid", "Kobe", "Koharu", "Kai", "Konstantinos", "Linh", "Liam", "Maria", "Maryan", "Nia", "Noah", "Nivi", "Omar", "Priya", "Qiang", "Ravi", "Sofia", "Silvia", "Shivansh", "Shu-fen", "Seo-yoon", "Tariq", "Umar", "Valeria", "Wei", "Ximena", "Yusuf", "Yǔ tóng", "Yìchén", "Zara", "Zoe"
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
            const businessType = ["Cafe", "Salon", "Logistics", "Restaurant", "Hotel", "Shop", "Warehouse", "Factory", "Corp", "Agency", "Investments", "Theater", "Consulting", "Services", "Transport", "Energy", "Telecom"]
            const businessNames = ["Pink", "Happy", "Twisted", "Arrow", "Star", "Lion", "Panda", "Pirate", "Duck", "Bland", "Ironic", "Hiha", "Elite", "Red", "Black", "Ruskea", "Chéngzǐ", "Smart", "Kimchi", "Sunny", "Provence", "Carota", "Shuruq", "Parvat", "Sjø", "Rivyè", "Sōdai", "Smešno", "Lēti", "Mātī", "Civappu", "Netëx", "Zard", "Blauwe", "Blablabla"]
            return selectRandomly(businessNames) + ' ' + selectRandomly(businessType)
            break
        case 'government':
            const governmentType = ["Ministry", "Department", "Agency", "Commission", "Board", "Council", "Office"]
            const governmentDomains = ["Education", "Health", "Defense", "Justice", "Interior", "Labor", "Transport", "Environment", "Trade", "Tourism", "Science", "Finance", "Local"]
            return selectRandomly(governmentDomains) + ' ' + selectRandomly(governmentType)
            break
    }
}

function _defineAnnualIncome(type, activity, gdpPerCapita) {
    // Annual income in thousands. Mostly dependant on activity
    let baseIncome = normalRandom(activity * 100 + gdpPerCapita * 10)
    switch (type) {
        case 'person':
            return Math.round(baseIncome)
            break
        case 'business':
            return Math.round(baseIncome * normalRandom(100))
            break
        case 'government':
            return Math.round(baseIncome * normalRandom(1000))
            break
    }
    console.error("Unknown user type", type)
}

function _defineJob(riskLevel) {
    if (riskLevel < 4)
        return selectRandomly(["Teacher", "Engineer", "Nurse", "Accountant", "Store Manager", "Coffee shop owner", "Yoga instructor", "Painter", "Musician", "Chef", "Poet", "Accountant", "Gardener", "Professional Cuddler", "Sommelier", "Voice Actor", "DJ", "Opthalmologist", "Surgeon", "Doctor", "Ghostwriter", "Nez", "Fisherman", "Scientist"])
    if (riskLevel < 7)
        return selectRandomly(["Real Estate Agent", "Import/Export Manager", "Casino Manager", "Lawyer", "Art Dealer", "Banker", "Judge", "Entrepreneur", "Football player", "Travel agent", "Manager"])
    return selectRandomly(["Politician", "Businessperson", "Trader", "Poker player", "Business Owner", "Activist"])
}

export function assignNearestBank(user) {
    let validNodes = []
    if (user.type === 'government') {
        validNodes = activeNodes.filter(n => n.type === 'bank')
    } else {
        validNodes = activeNodes.filter(n => n.type !== 'processor')
    }
    const nearest = validNodes.sort((a, b) => distance(user, a) - distance(user, b))[0]
    if (nearest && distance(user, nearest) < DISTANCE.MAX_USERTONODE) {
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