let effects = []
let objectEffects = []


export function addEffect(x, y, emoji, type = 'default', color = null) {
    effects.push({
        x,
        y,
        emoji,
        type,
        color,
        timer: getEffectTimer(type)
    })
}

export function addObjectEffect(object, emoji, direction = "+", timer = 30, offset = { x: 4, y: 0 }) {
    if (object.size === 'large') offset.x += 4
    else if (object.size === 'medium') offset.x += 1

    objectEffects.push({ object, emoji, direction, timer, offset })
}

export function updateAndDrawEffects(graphics) {
    // Update and clean up regular effects
    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i]
        effect.timer--

        if (effect.timer <= 0) {
            effects.splice(i, 1)
        }
    }

    // Update object effects
    for (let i = objectEffects.length - 1; i >= 0; i--) {
        objectEffects[i].timer--
        if (objectEffects[i].timer <= 0) {
            objectEffects.splice(i, 1)
        }
    }

    // Draw all effects
    graphics.drawEffects(effects)
    graphics.drawObjectEffects(objectEffects)
}

export function getEffectTimer(type) {
    switch (type) {
        case 'default': return 30
        case 'invertedPulse':
        case 'pulseNode': return 10
        case 'pulse': return 8
        case 'freeze': return 180
        default: return 15
    }
}


