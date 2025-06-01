export const isFirstPlay = () => !localStorage.getItem('hasPlayedBefore')

const tutorialContainer = document.getElementById('tutorial')
const tutorialHeader = tutorialContainer?.querySelector('#tutorial-title')
const tutorialContent = tutorialContainer?.querySelector('.panel-content')
const tutorialButtons = document.getElementById('tutorial-buttons')
const tutorialProgress = document.getElementById('tutorial-progress')

let currentStep

function completeTutorial() {
    tutorialContainer.classList.add('hidden')
    localStorage.setItem('hasPlayedBefore', 'true')
}


function nextStep() {
    tutorialContainer.classList.add('hidden');
    currentStep++;

    // Shorter delay between steps for better flow
    setTimeout(showTutorialStep, 1000);
}
export function showTutorial() {

    // Set tutorial content
    tutorialHeader.textContent = 'Welcome to Financial Defense 💼'
    tutorialContent.innerHTML = `
            <p>Defend the financial network against illegal transactions and corruption.</p>
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
        tutorialContainer.classList.add('hidden')
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
    tutorialContainer.classList.remove('hidden')
}


const TUTORIAL_STEPS = [
    {
        title: '<small>⚪️⚫️🔵</small> 🏦 <small>⚪️⚫️🔵</small>',
        content: `
            <p>Banks process payments between users.</p>
        `
    },
    {
        title: '🔍 Transaction Types',
        content: `
            <p>Every transaction has a legality status:</p>
            <div>
                <p><span class="glow glow-green"></span> <strong>Legitimate</strong> - Probably safe and legal</p>
                <p><span class="glow glow-orange"></span> <strong>Questionable</strong> - May require investigation</p>
                <p><span class="glow glow-red"></span> <strong>Illegal</strong> - Must be stopped</p>
            </div>
        `
    },
    {
        title: '<span class="glow glow-green"></span>  <span class="glow glow-orange"></span>',
        content: `
            <p>Successful transactions move money between users and generate revenue for you.</p>
        `
    },
    {
        title: '<span class="glow glow-red"></span>',
        content: `
                        <p>Illegal transactions move money too, but they damage bank reputation and increase corruption.</p>
  
        `
    },
    {
        title: '👆 Your turn',
        content: `
            <p>Click on any bank to place a Basic Filter.</p>
        `
    },
    {
        title: '🔍 Basic Filter',
        content: `
            <p>This filter catches 50% of illegal transactions.</p>
            <p>Each catch grants you research points for upgrades.</p>
        `
    },
    {
        title: '🎉 et voila!',
        content: `
            <p>The rest is your history. You will soon discover policy and other features. Good luck!</p>
        `
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
    tutorialProgress.style.width = `${(currentStep + 1) / TUTORIAL_STEPS.length * 100}%`

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
                Next →
            </button>
        `

        document.getElementById('tutorial-next').onclick = nextStep
    }

    tutorialContainer.classList.remove('hidden')


}

function getTutorialProgress() {
    return {
        current: currentStep,
        total: TUTORIAL_STEPS.length,
        percentage: (currentStep / TUTORIAL_STEPS.length) * 100
    };
}




