// Pure utility functions for convenience

export function selectRandomly(array) {
    if (array.length === 0) {
        console.error("Empty array")
        return null
    }
    return array[Math.floor(Math.random() * array.length)]
}

export function normalRandom(max) {
    // Ideally, we look for a normal distribution, with a spike in low / medium
    // Returns a random number between 1 and max, with 50% below 10 (for max = 100)
    let normalDice = Math.pow(1.5849, Math.random() * 10)
    let result = Math.ceil(normalDice / 100 * max)
    return result
}

export function skewedRandom(bias, stddev = 3, min = 1, max = 9) {
    // Box-Muller normal distribution
    let u = Math.random(), v = Math.random()
    let num = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)

    // scale + shift
    let result = Math.round(bias + num * stddev)

    // clamp into [min,max]
    return Math.min(max, Math.max(min, result))
}

export function pointsDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y)
}

function displayConsoleRandom() {
    let BIAS = 15
    let STDDEV = 10
    let MAX = 999
    let MIN = 1

    let step = (MAX - MIN) / 10
    console.log("Step is", step)

    // for (let bias = MIN; bias <= MAX / 10; bias += step) {
    let counts = Array(MAX).fill(0)
        for (let i = 0; i < 5000; i++) {
            counts[skewedRandom(BIAS, STDDEV, MIN, MAX) - 1]++
            // counts[normalRandom(bias) - 1]++
        }
    console.log(`Bias ${BIAS}:`)
        counts.forEach((c, i) => {
            console.log(`${i + 1}: ${'*'.repeat(c / 50)}`)
        })
        console.log("\n")
    // }
}

window.d = displayConsoleRandom
