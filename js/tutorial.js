import * as UI from './ui-manager.js'
import * as tech from './tech.js'
import * as camera from './camera.js'

// Returns yes once the tutorial is completed
export const isFirstPlay = () => !localStorage.getItem('hasPlayedBefore')

const tutorialContainer = document.getElementById('tutorial')
const tutorialHeader = tutorialContainer?.querySelector('#tutorial-title')
const tutorialContent = tutorialContainer?.querySelector('.panel-content')
const tutorialButtons = document.getElementById('tutorial-buttons')
const tutorialProgress = document.getElementById('tutorial-progress')

let currentStep

function completeTutorial() {
    UI.hide(tutorialContainer)
    localStorage.setItem('hasPlayedBefore', 'true')
    UI.showFullInterface()
}


function nextStep() {
    UI.hide(tutorialContainer);
    currentStep++;
    setTimeout(showTutorialStep, 600);
}
export function showTutorial() {

    // Set tutorial content
    tutorialHeader.innerHTML = `Welcome to Financial Defense`
    tutorialContent.innerHTML = `
            <p>Facilitate economic growth while defending the financial network against illegal transactions.</p>
        `

    // Create and add buttons
    tutorialButtons.innerHTML = `
            <button id="tutorial-skip">Skip</button>
            <button id="tutorial-start">Start Tutorial ➡️ </button>
        `

    // Add event listeners
    const startButton = document.getElementById('tutorial-start')
    const skipButton = document.getElementById('tutorial-skip')

    const onStart = () => {
        UI.hide(tutorialContainer)
        currentStep = 0
        setTimeout(showTutorialStep, 1000)
    }

    const onSkip = () => {
        completeTutorial()
        window.location.reload()
    }

    startButton.onclick = onStart
    skipButton.onclick = onSkip

    // Show tutorial
    UI.show(tutorialContainer)
}

const TUTORIAL_STEPS = [
    {
        title: `<small>⚪️⚫️🔵</small><span style="font-size:1.5rem;"> 🏦 → 🏦 </span><small>⚪️⚫️🔵</small>`,
        content: 'Banks process transactions between users.',
    },
    {
        title: `<span class="glow glow-green"></span><span class="glow glow-orange">  <span class="glow glow-red"></span></span> `,
        content: `Successful transactions move money and generate tax revenue for you.`,
    },
    // {
    //     title: `<span class="glow" style="font-size:0.3em"></span> <span class="glow"></span> <span class="glow" style="font-size:1.3em"></span> `,
    //     content: `Transaction have different sizes and speed.`,
    // },
    {
        title: 'Legality',
        content: `Each transaction has a legality status:
            <br><span class="glow glow-green"></span> <strong>Legitimate</strong> - Probably safe and legal
            <br><span class="glow glow-orange"></span> <strong>Suspicious</strong> - Could be reviewed
            <br><span class="glow glow-red"></span> <strong>Illegal</strong> - Must be stopped
      `,
    },
    {
        title: `<span class="glow glow-red"></span> <span class="glow glow-red"></span>`,
        content: 'Illegal transactions damage banks\' reputation and increase corruption.',
        // TODO : spawn a large illegal transaction (implies refactoring main.js)
    },
    {
        title: 'Your turn',
        content: 'To catch illegal transactions, 👆 click on any bank and place a 🔍 Basic Filter ',
        waitFor: () => {
            let towerNode = window.nodes.find(node => node.tower)
            if (towerNode) {

                camera.cinematicCenterPoint(towerNode.x, towerNode.y + 50, 3)
                UI.closeAllPanels()

                return true
            } else {
                return false
            }
        }
    },
    {
        title: '🔍️?',
        content: 'Each transaction passing through this bank will now be monitored. This filter has a 50% chance of detecting illegal transactions. Some legitimate transactions might be erroneously flagged.',
        onEnter: () => {
        }
    },
    {
        title: '<span><span class="glow glow-red"></span>✔️</span>',
        content: 'When an illegal transaction is caught, you collect intelligence that can be used for research.',
        onEnter: () => {

        }
    },
    {
        title: 'Corruption',
        content: 'Corrupt financial institutions produce more illegal transactions. They appear with a yellow or red glow.',
        onEnter: () => {
            //ensure there is a corrupt node
            const corruptNode = window.nodes.find(n => n.active && !n.tower);
            if (corruptNode.corruption < 3)
                corruptNode.corruption = 4
            camera.cinematicCenterPoint(corruptNode.x, corruptNode.y + 50, 3)
        }
    },
    {
        title: 'Enforcement Actions',
        content: 'Reduce corruption by taking direct action. Click on the corrupt bank and select Audit 🕵️‍♂️',
        onEnter: () => {

            if (window.budget < 160) {
                window.budget = 160
            }
        },
        waitFor: () => {
            if (window.nodes.some(node => node.enforcementAction === 'audit')) {
                setTimeout(() => {
                    UI.closeAllPanels()
                }, 300)
                camera.cinematicCenterMap(window.nodes.filter(n => n.active))
                return true

            }
        }
    },
    {
        title: 'Audits🕵️‍♂️ ',
        content: 'Audits take 10 days. When completed, they reduce corruption at the bank. However, audits damage the bank\'s reputation.',
        onEnter: () => {

            UI.closeAllPanels()

        },
        waitFor: () => {
            if (!window.nodes.some(node => node.enforcementAction === 'audit')) {

                camera.cinematicCenterMap(window.nodes.filter(n => n.active))
                return true

            }
        }
    },
    {
        title: 'Reputation & Bankruptcy ',
        content: 'When banks are not trusted enough, they will lose business and eventually go bust.',
    },
    {
        title: 'Research <span class="oscillate">🧪</span>',
        content: 'It is time for improvements. Open the research panel and develop a technology.',
        onEnter: () => {
            tech.addResearchPoints(100)
            //we reset the camera
            camera.cinematicCenterMap(window.nodes.filter(n => n.active))
        },
        waitFor: () => {
            const progress = tech.getResearchProgress()
            if (progress && Object.values(progress).some(p => p.researched === true)) {
                setTimeout(() => {
                    UI.closeAllPanels()
                }, 500);
                return true
            }
        }
    },
    {
        title: '🎉 First technology',
        content: `Congratulations! You will be able to improve compliance filters, enforcement actions, and network efficiency. 
        <br><br>
        Once advanced enough, you will also be able to adjust policies such as tax rates and minimal compliance.`

    },
    {
        title: 'Et voilà!',
        content: `The rest is your history. You will win if corruption stays below 2% or if the economy booms... Good luck!`,
    }
];


export function showTutorialStep() {
    if (currentStep >= TUTORIAL_STEPS.length) {
        completeTutorial();
        return;
    }

    const step = TUTORIAL_STEPS[currentStep]
    tutorialHeader.innerHTML = step.title
    tutorialContent.innerHTML = step.content
    tutorialProgress.style.width = `${getTutorialProgress()}%`

    // Run onEnter function if it exists
    if (step.onEnter) {
        step.onEnter()
    }

    // If step has waitFor, check periodically and auto-advance
    if (step.waitFor) {
        const checkInterval = setInterval(() => {
            if (step.waitFor()) {
                clearInterval(checkInterval)
                nextStep() // We move to the next step. (it will immediately close current one tutorial and settimeout before the next one.)
            }
        }, 400)
    }

    if (currentStep === TUTORIAL_STEPS.length - 1) {
        tutorialButtons.innerHTML = `
            <button id="tutorial-reload">Restart Game</button>
            <button id="tutorial-continue">Continue</button>
        `
        document.getElementById('tutorial-continue').onclick = completeTutorial;
        document.getElementById('tutorial-reload').onclick = () => {
            completeTutorial()
            window.location.reload()
        }
    } else {
        tutorialButtons.innerHTML = `
            <button id="tutorial-next">
                ${step.waitFor ? 'Waiting...' : 'Next →'}
            </button>
        `

        document.getElementById('tutorial-next').onclick = nextStep
        if (!step.waitFor) {
            document.getElementById('tutorial-next').style.display = 'inline-block'
        } else {
            document.getElementById('tutorial-next').style.display = 'none'
        }
    }

    UI.show(tutorialContainer)


}


function getTutorialProgress() {
    return ((currentStep + 1) / TUTORIAL_STEPS.length * 100)
}




