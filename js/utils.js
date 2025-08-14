// Pure utility functions for convenience

export function selectRandomly(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export function normalRandom(max) {
    // Ideally, we look for a normal distribution, with a spike in low / medium
    // Returns a random number between 1 and 100, with 50% below 10
    let normalDice = Math.pow(1.5849, Math.random() * 10)
    let result = Math.ceil(normalDice / 100 * max)
    return result
}