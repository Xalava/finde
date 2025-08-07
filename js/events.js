import * as UI from './ui-manager.js'
import * as config from './config.js'

// Events System
let eventStates = {} // Track last triggered times for each event
let activeEvent = null
let lastEventTime = 0
export let detectMod = 1

// Global variables for main.js to read
window.eventBudgetChange = 0
window.eventMaintenanceChange = 0
window.eventDuration = 0
window.launderingAlert = false

// Initialize all events as triggered to activate cooldowns
export function initializeEvents() {
    const now = Date.now()
    Object.keys(config.events).forEach(eventId => {
        eventStates[eventId] = now
    })
}

export function checkForEvents(startTime) {
    const now = Date.now()
    // Don't start events until 10 minutes of play
    if (now - startTime < 600000) return
    if (activeEvent || now - lastEventTime < 120000) return

    // Check each event from config
    for (const [eventId, event] of Object.entries(config.events)) {
        const lastTriggered = eventStates[eventId] || 0
        if (now - lastTriggered < event.cooldown) continue

        if (Math.random() < event.probability) {
            triggerEvent(eventId, event)
            eventStates[eventId] = now
            lastEventTime = now
            break
        }
    }

    return
}

function triggerEvent(eventId, event) {
    activeEvent = eventId

    const tutorial = document.getElementById('tutorial')
    const header = tutorial.querySelector('#tutorial-title')
    const content = tutorial.querySelector('.panel-content')
    const buttons = document.getElementById('tutorial-buttons')

    header.textContent = `${event.icon} ${event.name}`
    content.innerHTML = `<p>${event.description}</p><br><p><strong>Choose your response:</strong></p>`

    // Generate buttons from event choices
    buttons.innerHTML = event.choices.map(choice =>
        `<button class="option-button" data-event-id="${eventId}" data-choice-id="${choice.id}">
            <div class="option-info">
                <div class="option-name">${choice.text}</div>
                <div class="option-desc">${choice.description}</div>
            </div>
        </button>`
    ).join('')

    // Add event listeners to buttons
    buttons.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', () => {
            const eventId = button.getAttribute('data-event-id')
            const choiceId = button.getAttribute('data-choice-id')
            executeChoice(eventId, choiceId)
        })
    })

    UI.show(tutorial)
}

export function executeChoice(eventId, choiceId) {
    const event = config.events[eventId]
    const choice = event.choices.find(c => c.id === choiceId)
    const effects = choice.effects

    // Apply detection modifier
    if (effects.detectionMod) {
        detectMod = effects.detectionMod
        setTimeout(() => {
            detectMod = 1 // Reset detection mod after duration
            if (effects.toast.info) UI.showToast('Event Ended', effects.toast.info, 'info')
        }, effects.duration)
    }

    // Handle laundering alert
    if (effects.launderingAlert) {
        window.launderingAlert = true
        setTimeout(() => {
            window.launderingAlert = false
            UI.showToast('Alert Period', 'Criminal network behavior normalized', 'info')
        }, effects.duration || 180000) // Use duration from config, fallback to 3 minutes
    }

    // Store changes for main.js to apply
    window.eventBudgetChange = effects.budget || 0
    window.eventMaintenanceChange = effects.maintenance || 0
    window.eventDuration = effects.duration || 0

    // Show success/warning toasts
    if (effects.toast?.success) UI.showToast('Action Taken', effects.toast.success, 'success')
    if (effects.toast?.warning) UI.showToast('Consequence', effects.toast.warning, 'warning')

    UI.hide(document.getElementById('tutorial'))
    activeEvent = null
}

