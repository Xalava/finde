
export const towerOptions = {
    basic: {
        name: 'Basic Filter',
        cost: 50,
        accuracy: 0.5,
        maintenance: 0,
        icon: '🔍',
        description: 'Detects medium and large illegal transactions with 50% accuracy',
        depend: null,
    },
    medium: {
        name: 'Medium Filter',
        cost: 75,
        accuracy: 0.7,
        maintenance: 0,
        icon: '🔬',
        description: 'Detects all sizes of illegal transactions with 70% accuracy',
        depend: 'basic',
    },
    robust: {
        name: 'Robust Filter',
        cost: 50,
        accuracy: 0.8,
        maintenance: 1,
        icon: '🔧',
        description: 'Robust detection with 80% accuracy. Reduces false positives by 50%',
        depend: 'medium',
    },
    superRobust: {
        name: 'Super Robust Filter',
        cost: 75,
        accuracy: 0.9,
        maintenance: 3,
        icon: '🔩',
        description: 'Super robust detection with 90% accuracy. Reduces false positives by 75%',
        depend: 'robust',
    },
    advanced: {
        name: 'Advanced Filter',
        cost: 100,
        accuracy: 0.85,
        maintenance: 2,
        icon: '🔭',
        description: 'Advanced detection with 85% accuracy',
        depend: 'medium',
    },
    ai: {
        name: 'AI System',
        cost: 100,
        accuracy: 0.6,
        maintenance: 1,
        icon: '🧠',
        description: 'Powerful detection with 60% accuracy that learns and improves by 0.5% per day, up to 80%.',
        depend: 'basic',
    },
    super: {
        name: 'Supra AI System',
        cost: 150,
        accuracy: 0.8,
        maintenance: 5,
        icon: '🤖',
        description: 'High-end system with 80% accuracy that learns and improves by 1% per day, up to 98%!.',
        depend: 'ai',
    },
    quantum: {
        name: 'Quantum Filter',
        cost: 200,
        accuracy: 0.95,
        maintenance: 8,
        icon: '⚛️',
        description: 'State-of-the-art quantum system with 95% accuracy, ',
        depend: 'advanced',
    }
}

export const actionOptions = {
    audit: {
        name: 'Audit',
        cost: 100,
        description: 'Audit the node for illegal transactions. It will reduce corruption when completed',
        icon: '🕵️‍♂️',
        duration: 10,

        reputationEffect: -5,
        corruptionEffect: 2,

    },

    raid: {
        name: 'Raid',
        cost: 500,
        description: 'The raid will damage reputation, but significantly reduce corruption',
        icon: '🚨',
        duration: 30,
        reputationEffect: -15,
        corruptionEffect: 3,
    }
}


export const CORRUPTION_THRESHOLD = 4;

export const txSizeOptions = {
    small: { name: 'small', amount: 5 },
    medium: { name: 'medium', amount: 10 },
    large: { name: 'large', amount: 15 }
}

export const legalityOptions = ['legit', 'questionable', 'illegal']


export const nodeOptions = {
    bank: {
        name: 'Bank',
        InitialReputation: 80,
        icon: '🏦',
        color: '#EEE'
    },
    processor: {
        name: 'Processor',
        InitialReputation: 70,
        icon: '🌐',
        color: '#AAF'
    },
    fintech: {
        name: 'Fintech',
        InitialReputation: 60,
        icon: '🚀',
        color: '#AFF'
    },
    cryptoExchange: {
        name: 'Crypto Exchange',
        InitialReputation: 50,
        icon: '💱',
        color: '#AFA'
    }
}
