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

export function addObjectEffect(object, emoji, direction = "+", timer = 30, offset = { x: 3, y: 0 }) {
    if (object.size === 'large') offset.x += 5
    else if (object.size === 'medium') offset.x += 1


    objectEffects.push({ object, emoji, direction, timer, offset })
}

export function updateAndDrawEffects(graphics) {
    // Update and clean up regular effects
    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].timer--
        if (effects[i].timer <= 0) {
            effects.splice(i, 1)
        }
    }
    graphics.drawEffects(effects)

    // Update object effects
    for (let i = objectEffects.length - 1; i >= 0; i--) {
        objectEffects[i].timer--
        if (objectEffects[i].timer <= 0 || !objectEffects[i].object.active) {
            objectEffects.splice(i, 1)
        }
    }
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


