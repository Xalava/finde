import * as UI from './ui-manager.js'
import * as config from './config.js'

// Font constant
export const uiFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

let canvas, ctx

export function init(canvasEl, context) {
    canvas = canvasEl
    ctx = context
}

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
            case 'budget':
                ctx.fillStyle = '#666'
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
                ctx.beginPath()
                const pulseRadiusNode = 5 + (20 - e.timer)
                ctx.arc(e.x, e.y, pulseRadiusNode, 0, Math.PI * 2)
                ctx.strokeStyle = e.color
                ctx.lineWidth = 4
                ctx.stroke()
                break
            case 'tower':
                ctx.font = `12px ${uiFont}`
                ctx.fillStyle = 'black'
                ctx.fillText(e.emoji, e.x + 5, e.y + 30)
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

export function drawUser(user, debug = false) {
    ctx.save()
    if (user.corruption > 1) {
        ctx.shadowColor = 'rgba(255,0,0,0.5)'
        ctx.shadowBlur = 10
        // ctx.fillStyle = 'rgba(255,0,0,0.05)'
        // ctx.beginPath()
        // ctx.arc(user.x, user.y, user.corruption / 2, 0, Math.PI * 2)
        // ctx.fill()
        // ctx.shadowBlur = 0
    }
    ctx.beginPath()
    ctx.arc(user.x, user.y, 1 + user.activity / 2, 0, Math.PI * 2)

    ctx.fillStyle = config.userTypes[user.type].color

    if (user.corruption > 1) {
        ctx.shadowColor = `rgba(255,0,0,${0.1 * user.corruption})`
    } else {
        ctx.shadowColor = '#0e0e14'
    }
    ctx.shadowBlur = 10

    ctx.fill()

    if (debug) {
        ctx.font = '6px sans-serif'
        ctx.fillText(user.id, user.x + 5, user.y - 2)
        ctx.fillStyle = 'red'
        ctx.fillText(user.corruption, user.x + 5, user.y + 4)
    }
    // Fun fact : the filder belwo destroys perforamnce
    // ctx.filter = "brightness(50%)";
    ctx.restore()
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

export function drawNode(node, debug = false) {
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
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 3
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

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 4
        ctx.font = `14px ${uiFont}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#000'
        ctx.fillText(config.towerOptions[node.tower].icon, node.x, node.y + 25)
        ctx.shadowBlur = 0
    }
    ctx.restore()

    // Draw node type emoji
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

    ctx.shadowBlur = 4

    // Create gradient
    const gradient = ctx.createRadialGradient(tx.x, tx.y, 1, tx.x, tx.y, radius * 2)
    if (tx.isSelected) {
        const now = Date.now();
        if (Math.floor(now / 50) % 5 === 0) {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
        } else {
            gradient.addColorStop(0, 'rgb(255, 255, 255)');
        }
    } else {
        gradient.addColorStop(0, 'rgb(255, 255, 255)')
    }
    gradient.addColorStop(1, 'rgba(145, 145, 145, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(tx.x, tx.y, radius * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

export function drawCorruptionMeter(spread) {
    ctx.save()
    const meterX = canvas.width - 230
    const meterY = 10
    const meterWidth = 220
    const meterHeight = 20

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
    ctx.roundRect(meterX, meterY, barWidth, meterHeight, 6)
    ctx.fill()


    // Draw text
    ctx.fillStyle = 'white'
    ctx.font = `12px ${uiFont}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Corruption: ${Math.floor(spread)}%`, meterX + meterWidth / 2, meterY + meterHeight / 2)

    ctx.restore()
}

export function drawCountries(nodes, users) {
    config.countryKeys.forEach(countryKey => {
        const country = config.countries[countryKey]
        if (nodes.filter(node => node.country === countryKey && node.active).length > 0) {

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
                Math.hypot(p.x - current.x, p.y - current.y) > Math.hypot(next.x - current.x, next.y - current.y))) {
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

export function drawTooltip(hoverNode) {
    const tooltip = [
        { text: hoverNode.name, bold: true },
        { text: `Type: ${hoverNode.type}` },
        { text: `Controls: ${hoverNode.tower ? config.towerOptions[hoverNode.tower].name : "None"}` },
        { text: `Click for details` }
    ]
    ctx.font = `14px ${uiFont}`
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)'
    const tooltipX = hoverNode.x + 25
    const tooltipY = hoverNode.y
    const lineHeight = 18
    const tooltipWidth = 180
    const tooltipHeight = tooltip.length * lineHeight + 8

    ctx.beginPath()
    ctx.roundRect(tooltipX - 5, tooltipY - 15, tooltipWidth, tooltipHeight, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(58, 123, 213, 0.5)'
    ctx.stroke()

    tooltip.forEach((line, index) => {
        ctx.font = line.bold ? `bold 14px ${uiFont}` : `14px ${uiFont}`
        ctx.fillStyle = '#fff'
        ctx.fillText(line.text, tooltipX, tooltipY + index * lineHeight)
    })
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