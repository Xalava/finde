import * as UI from '../UI/ui-manager.js'
import * as config from '../game/config.js'
import { pointsDistance } from '../utils.js'
import { isMobile, uiFont, colors, performance, effects } from './visual-constants.js'

// Simplified helper functions
function createGradient(x, y, innerRadius, outerRadius, innerColor, outerColor) {
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius)
    gradient.addColorStop(0, innerColor)
    gradient.addColorStop(1, outerColor)
    return gradient
}

// Cached selection ring for better performance
function drawSelectionRing(x, y, radius) {
    ctx.save()
    // Subtle outer glow
    ctx.shadowColor = colors.selection
    ctx.shadowBlur = 6

    // Main ring with cached styling
    ctx.strokeStyle = `${colors.selection}7f`
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.arc(x, y, radius + 1, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
}

// Performance-optimized animation cache
let animationCache = {
    time: 0,
    pulse: 0,
    lastUpdate: 0,
    selectionRing: null,
    selectionRadius: 0
}


function updateAnimationCache() {
    const now = Date.now()
    if (now - animationCache.lastUpdate > performance.minFrameTime) {
        animationCache.time = now
        animationCache.pulse = (Math.sin(now * effects.pulseSpeed) + 1) * 0.5
        animationCache.lastUpdate = now
    }
}

function hexToRgb(hex) {
    // Handle shorthand hex colors (e.g., #f0a -> #f0a)
    const shorthandResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex)
    if (shorthandResult) {
        return {
            r: parseInt(shorthandResult[1] + shorthandResult[1], 16),
            g: parseInt(shorthandResult[2] + shorthandResult[2], 16),
            b: parseInt(shorthandResult[3] + shorthandResult[3], 16)
        }
    }

    // Handle full hex colors (e.g., #1a2b3c)
    const fullResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return fullResult ? {
        r: parseInt(fullResult[1], 16),
        g: parseInt(fullResult[2], 16),
        b: parseInt(fullResult[3], 16)
    } : { r: 255, g: 255, b: 255 }
}

function brightenColor(hex, amount = 40) {
    const rgb = hexToRgb(hex)
    const r = Math.min(255, rgb.r + amount)
    const g = Math.min(255, rgb.g + amount)
    const b = Math.min(255, rgb.b + amount)
    return `rgb(${r}, ${g}, ${b})`
}

function clearerColor(hex, amount = 40) {
    const rgb = hexToRgb(hex)
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b},${amount})`
}

let canvas, ctx

export function init(canvasEl, context) {
    canvas = canvasEl
    ctx = context
}

// Todo: modularise, create visual language
export function drawEffects(effects) {
    effects.forEach(e => {
        e.timer -= 1
        switch (e.type) {
            case 'insitus':
                ctx.font = `6px ${uiFont}`
                ctx.fillText(e.emoji, e.x, e.y)
                break
            case 'malus':
                ctx.fillStyle = '#ff3e3e'
                ctx.font = `12px ${uiFont}`
                ctx.fillText(e.emoji, e.x - 5, e.y - 50)
                break
            case 'bonus':
                ctx.fillStyle = '#00cc66'
                ctx.font = `12px ${uiFont}`
                ctx.fillText(e.emoji, e.x + 25, e.y + 5)
                break
            case 'smallbonus':
                ctx.save()
                ctx.globalAlpha = Math.min(e.timer / 10, 1)
                ctx.fillStyle = colors.success
                ctx.font = `4px ${uiFont}`
                ctx.fillText(e.emoji, e.x + 8, e.y - 2 - (30 - e.timer) * 0.3)
                ctx.restore()
                break
            case 'budget':
                ctx.fillStyle = '#AAA'
                ctx.font = `8px ${uiFont}`
                ctx.fillText(e.emoji, e.x + 25, e.y + 5)
                ctx.font = `4px ${uiFont}`
                ctx.fillText('🪙', e.x + 35, e.y + 4)
                break
            case 'invertedPulse':
                ctx.beginPath()
                const InvertedPulseRadius = e.timer // contract over time
                ctx.arc(e.x, e.y, InvertedPulseRadius, 0, Math.PI * 2)
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'
                ctx.lineWidth = 2
                ctx.stroke()
                break
            case 'pulse':
                ctx.beginPath()
                const pulseRadius = 8 - e.timer // expand over time
                ctx.arc(e.x, e.y, pulseRadius, 0, Math.PI * 2)
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'
                ctx.lineWidth = 2
                ctx.stroke()
                break
            case 'pulseNode':
                ctx.save()
                ctx.beginPath()
                const pulseRadiusNode = 25 - e.timer * 2
                const opacity = 1 - e.timer / 30 // Fade out as timer decreases
                ctx.globalAlpha = Math.max(0.1, opacity)
                ctx.arc(e.x, e.y, pulseRadiusNode, 0, Math.PI * 2)
                ctx.strokeStyle = e.color
                ctx.lineWidth = 5
                ctx.stroke()
                ctx.restore()
                break
            case 'tower':
                ctx.font = `12px ${uiFont}`
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x + 5, e.y + 30)
                break
            case 'freeze':
                ctx.font = `8px ${uiFont}`
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x, e.y)
                break
            default:
                ctx.font = `24px ${uiFont}`
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x - 12, e.y - 30)
        }
    })
    // effects = effects.filter(e => {
    //     e.timer -= 1
    //     return e.timer >= 0
    // })

}

export function drawObjectEffects(objectEffects) {
    objectEffects.forEach(e => {
        e.timer -= 1
        if (!e.object.active) {
            e.timer = 0
            return
        } else {
            ctx.save()
            if (e.direction === '+') {
                ctx.font = `4px ${uiFont}`
                ctx.fillText(e.emoji, e.object.x + e.offset.x, e.object.y + e.offset.y - ((30 - e.timer) / 10))// object moves up. Assumes timer 30
                //
            } else {
                ctx.shadowColor = 'red'
                ctx.shadowBlur = 16
                ctx.filter = "hue-rotate(-50deg)"
                // display nothing for the moment
                // ctx.fillText(e.emoji, e.object.x + e.offset.x, e.object.y + e.offset.y)//
            }

            ctx.restore()
        }
    })
}

export function drawUser(user, debug = false) {
    ctx.save()
    const isSelectedUser = user === UI.getSelectedUser()
    const baseRadius = Math.max(2, 1 + Math.log(user.activity))
    const userColor = config.userTypes[user.type].color


    // Enhanced user circle with gradient from brighter to current color
    const userGradient = createGradient(
        user.x - 1, user.y - 1, 0, baseRadius * 1.5,
        brightenColor(userColor, 40),
        userColor
    )

    ctx.fillStyle = userGradient
    ctx.beginPath()
    ctx.arc(user.x, user.y, baseRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // Unified selection system (drawn after restore to avoid shadow interference)
    if (isSelectedUser) {
        drawSelectionRing(user.x, user.y, baseRadius)
    }

    if (debug) {
        ctx.save()
        ctx.font = '6px sans-serif'
        ctx.fillStyle = 'white'
        ctx.shadowColor = 'black'
        ctx.shadowBlur = 2
        ctx.fillText(user.id, user.x + baseRadius + 2, user.y - 2)
        ctx.fillStyle = colors.error
        ctx.fillText(user.riskLevel, user.x + baseRadius + 2, user.y + 4)
        ctx.restore()
    }
}

export function drawUserEdge([userId, bankId], users, nodes) { //could be improved by sharing directly the user object
    const user = users.find(u => u.id === userId)
    const bank = nodes.find(n => n.id === bankId)
    if (!user || !bank) return
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(user.x, user.y)
    ctx.lineTo(bank.x, bank.y)
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 0.3
    ctx.stroke()
    ctx.restore()
}

export function drawNode(node) {
    const isSelected = node === UI.getSelectedNode()
    const nodeRadius = 20
    ctx.save()

    // Draw outer ring
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)
    let color = config.nodeTypes[node.type].color

    // Add corruption glow
    if (node.corruption > config.HIGH_CORRUPTION_THRESHOLD) {
        ctx.shadowColor = 'red'
        ctx.shadowBlur = 15
        color = '#ffdddd'
    } else if (node.corruption > Math.floor(config.HIGH_CORRUPTION_THRESHOLD / 2)) { // Should be 2 currently
        ctx.shadowColor = 'orange'
        ctx.shadowBlur = 10
        color = '#fff0dd'
    } else if (!isSelected) {
        ctx.shadowColor = 'black'
        ctx.shadowBlur = 5
    }

    // Add selection highlight
    if (isSelected) {
        ctx.strokeStyle = colors.selection
        ctx.lineWidth = 2
    } else {
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 0.1
    }

    ctx.stroke()
    ctx.fillStyle = color
    ctx.fill()

    if (node.tower) {
        // Draw tower icon background and icon
        const gradient = ctx.createRadialGradient(node.x, node.y + 25, 5, node.x, node.y + 25, 14)
        gradient.addColorStop(0, color)
        gradient.addColorStop(0.5, color)
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)')
        ctx.beginPath()
        ctx.arc(node.x, node.y + 25, 14, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.shadowColor = 'rgba(0, 0, 0, 1)'
        ctx.shadowBlur = 6
        ctx.font = `14px ${uiFont}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(config.towerOptions[node.tower].icon, node.x, node.y + 25)
        ctx.shadowBlur = 0
    }
    ctx.restore()

    // Draw node type emoji
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 4
    ctx.font = `20px ${uiFont}`
    ctx.fillText(config.nodeTypes[node.type].icon, node.x - 12, node.y + 7)

    if (node.enforcementAction) {
        ctx.font = `14px ${uiFont}`
        ctx.fillStyle = '#000'
        ctx.shadowColor = color
        ctx.shadowBlur = 4
        ctx.fillText(`${config.actionOptions[node.enforcementAction].icon} ${config.actionOptions[node.enforcementAction].name}`, node.x - 24, node.y - 30)
    }

    if (debug) {
        ctx.font = `14px ${uiFont}`
        ctx.fillStyle = 'white'
        ctx.fillText(node.id, node.x + 20, node.y - 6)
        if (node.corruption) {
            ctx.fillStyle = 'red'
            ctx.fillText(node.corruption, node.x + 20, node.y + 16)
        }
    }
}

export function drawEdge([a, b], nodes) {
    ctx.beginPath()
    ctx.moveTo(nodes[a].x, nodes[a].y)
    ctx.lineTo(nodes[b].x, nodes[b].y)
    ctx.strokeStyle = '#aaa'
    ctx.lineWidth = 2
    ctx.stroke()
}

export function drawTransaction(tx) {
    ctx.save()
    const radius = tx.size === 'small' ? 2 : tx.size === 'medium' ? 4 : 6

    // Set shadow based on legality
    ctx.shadowColor = config.legalityColorMap[tx.legality]

    if (tx.freezed) {
        const seq = Math.floor(Date.now() / 18) % 60
        if (seq < 30) {
            ctx.shadowColor = 'rgba(0, 8, 255, 0.5)'
        }
    }
    ctx.shadowBlur = 4

    // Create gradient

    const gradient = createGradient(tx.x, tx.y, 1, radius * 2,
        'rgb(255, 255, 255)',
        'rgba(145, 145, 145, 0)'
    )

    if (tx.isSelected) {
        updateAnimationCache()
        const pulse = animationCache.pulse
        const opacity = 0.8 + pulse * 0.2 // Pulse between 0.8 and 1.0
        ctx.globalAlpha = opacity
    }

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(tx.x, tx.y, radius * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (debug) {
        ctx.font = '6px sans-serif'
        ctx.fillStyle = 'gray'
        ctx.fillText(tx.id, tx.x + 5, tx.y - 6)
        ctx.fillStyle = config.legalityColorMap[tx.legality]
        ctx.fillText(tx.riskLevel, tx.x + 5, tx.y + 6)
    }
}

export function drawCorruptionMeter(spread) {
    ctx.save()
    let meterX, meterY, meterWidth, meterHeight
    if (isMobile) {
        meterWidth = 150

    } else {
        meterWidth = 240
    }
    meterX = canvas.width - (meterWidth + 10)
    meterY = 10
    meterHeight = 20

    // Draw background with rounded corners
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.beginPath()
    ctx.roundRect(meterX, meterY, meterWidth, meterHeight, 6)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
    // Draw corruption bar
    const barWidth = (meterWidth * Math.min(spread, 100)) / 100
    const gradient = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY)
    gradient.addColorStop(0, 'green')
    gradient.addColorStop(0.6, 'orange')
    gradient.addColorStop(1, 'red')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(meterX, meterY, barWidth, meterHeight, 8)
    ctx.fill()

    // Add subtle glow for high corruption
    if (spread > 60) {
        ctx.shadowColor = colors.error
        ctx.shadowBlur = 4
        ctx.stroke()
    }

    // Draw text 
    ctx.fillStyle = 'white'
    ctx.font = `12px ${uiFont}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.fillText(`Corruption  ${Math.floor(spread)}%`, meterX + meterWidth / 2, meterY + meterHeight / 2)

    ctx.restore()
}

export function drawPopularityMeter(popularity) {
    ctx.save()
    let meterX, meterY, meterWidth, meterHeight

    if (isMobile) {
        meterWidth = 150
    } else {
        meterWidth = 240
    }
    meterHeight = 20
    meterX = 10 //canvas.width - 230
    meterY = 10 //40

    // Draw background with rounded corners
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.beginPath()
    ctx.roundRect(meterX, meterY, meterWidth, meterHeight, 6)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
    // Draw popularity bar
    const barWidth = (meterWidth * popularity) / 1000
    const gradient = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY)
    gradient.addColorStop(0, '#000040ff')
    gradient.addColorStop(0.4, '#000050ff')
    gradient.addColorStop(0.8, '#000060ff')
    gradient.addColorStop(1, '#3b3ba0ff')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(meterX, meterY, barWidth, meterHeight, 6)
    ctx.fill()

    // Draw text
    ctx.fillStyle = 'white'
    ctx.font = `12px ${uiFont}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'

    ctx.fillText(`Popularity  ${Math.floor(popularity)}`, meterX + meterWidth / 2, meterY + meterHeight / 2)

    ctx.restore()
}

export function drawCountries(nodes, users) {
    config.countryKeys.forEach(countryKey => {
        const country = config.countries[countryKey]
        if (nodes.some(node => node.country === countryKey && node.active)) {

            drawCountryShape(countryKey, country, nodes, users)
            drawCountryFlag(countryKey, country)
        }

    })
}

function drawCountryFlag(countryKey, country) {
    ctx.font = `32px ${uiFont}`
    ctx.fillText(country.flag, country.x - 16, country.y + 12)
    ctx.font = `12px ${uiFont}`
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.fillText(country.name, country.x, country.y + 35)
    ctx.textAlign = 'left'
}

function drawCountryShape(countryKey, country, nodes, users) {
    // Get all nodes and users belonging to this country
    const countryNodes = nodes.filter(node => node.country === countryKey && node.active)
    const countryUsers = users.filter(user => user.country === countryKey && user.active)

    if (countryNodes.length === 0 && countryUsers.length === 0) return

    // Get all points including country center
    const points = [
        ...countryNodes.map(n => ({ x: n.x, y: n.y })),
        ...countryUsers.map(u => ({ x: u.x, y: u.y })),
        { x: country.x, y: country.y }
    ]

    if (points.length < 3) return

    // Get expanded convex hull
    const expandedHull = getExpandedConvexHull(points, 20)

    // Draw the shape
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.fillStyle = country.color

    ctx.beginPath()
    ctx.moveTo(expandedHull[0].x, expandedHull[0].y)
    for (let i = 1; i < expandedHull.length; i++) {
        ctx.lineTo(expandedHull[i].x, expandedHull[i].y)
    }
    ctx.closePath()
    ctx.fill()

    // Draw border
    ctx.globalAlpha = 0.4
    ctx.strokeStyle = country.color
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
}

function getExpandedConvexHull(points, distance) {
    if (points.length < 3) return points

    // Find leftmost point
    let leftmost = points[0]
    for (let p of points) {
        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) {
            leftmost = p
        }
    }

    // Build convex hull
    const hull = []
    let current = leftmost

    do {
        hull.push(current)
        let next = points[0]

        for (let p of points) {
            if (p === current) continue

            const cross = (next.x - current.x) * (p.y - current.y) - (next.y - current.y) * (p.x - current.x)
            if (next === current || cross > 0 || (cross === 0 &&
                pointsDistance(p, current) > pointsDistance(next, current))) {
                next = p
            }
        }
        current = next
    } while (current !== leftmost)

    // Expand hull outward by distance
    const expanded = []
    for (let i = 0; i < hull.length; i++) {
        const prev = hull[(i - 1 + hull.length) % hull.length]
        const curr = hull[i]
        const next = hull[(i + 1) % hull.length]

        // Calculate edge normals
        const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
        const v2 = { x: next.x - curr.x, y: next.y - curr.y }

        const len1 = Math.hypot(v1.x, v1.y)
        const len2 = Math.hypot(v2.x, v2.y)

        const n1 = { x: -v1.y / len1, y: v1.x / len1 }
        const n2 = { x: -v2.y / len2, y: v2.x / len2 }

        // Average normal and expand
        const nx = (n1.x + n2.x) / 2
        const ny = (n1.y + n2.y) / 2
        const nlen = Math.hypot(nx, ny) || 1

        expanded.push({
            x: curr.x + (nx / nlen) * distance,
            y: curr.y + (ny / nlen) * distance
        })
    }

    return expanded
}

export function drawEndGame(condition, win = false) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'red'
    ctx.font = `48px ${uiFont}`
    ctx.textAlign = 'center'
    if (!win) {
        ctx.fillText('You have lost', canvas.width / 2, canvas.height / 2 - 20)

    } else {
        ctx.fillText('Congratulations! 🥳', canvas.width / 2, canvas.height / 2 - 20)
    }
    ctx.font = `24px ${uiFont}`
    ctx.fillStyle = 'white'
    ctx.fillText(condition, canvas.width / 2, canvas.height / 2 + 20)
}
export function drawDebugGrid(ctx) {
    ctx.save()
    // Draw coordinate grid
    const gridSize = 100
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)'
    ctx.lineWidth = 1

    // Draw grid lines
    for (let x = 0; x < 1500; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 1500)
        ctx.stroke()

        // Add coordinate labels
        ctx.fillStyle = 'rgba(150, 150, 150, 0.7)'
        ctx.font = '12px Arial'
        ctx.fillText(x.toString(), x + 5, 15)
    }

    for (let y = 0; y < 1500; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(1500, y)
        ctx.stroke()

        // Add coordinate labels
        ctx.fillText(y.toString(), 5, y + 15)
    }

    ctx.restore()
}