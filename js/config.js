
export const towerOptions = {
    basic: {
        name: 'Basic Filter',
        cost: 50,
        accuracy: 0.5,
        maintenance: 0,
        icon: '🔍',
        description: 'Detects medium and large illegal transactions with 50% accuracy',
        depend: null,
        errors: 1,
        techRequirement: null
    },
    medium: {
        name: 'Medium Filter',
        cost: 75,
        accuracy: 0.7,
        maintenance: 0,
        icon: '🔬',
        description: 'Detects all sizes of illegal transactions with 70% accuracy',
        depend: 'basic',
        errors: 1,
        techRequirement: 'basic_compliance'
    },
    robust: {
        name: 'Robust Filter',
        cost: 50,
        accuracy: 0.8,
        maintenance: 1,
        icon: '🔧',
        description: 'Robust detection with 80% accuracy. Reduces false positives by 50%',
        depend: 'medium',
        errors: 0.5,
        techRequirement: 'false_positive_reduction'
    },
    superRobust: {
        name: 'Super Robust Filter',
        cost: 175,
        accuracy: 0.9,
        maintenance: 3,
        icon: '🔩',
        description: 'Super robust detection with 90% accuracy. Reduces false positives by 99%',
        depend: 'robust',
        errors: 0.01,
        techRequirement: 'false_positive_reduction'
    },
    advanced: {
        name: 'Advanced Filter',
        cost: 200,
        accuracy: 0.85,
        maintenance: 1,
        icon: '🔭',
        description: 'Advanced detection with 85% accuracy. Not compatible with AI',
        depend: 'medium',
        errors: 1,
        techRequirement: 'advanced_compliance'
    },
    ai: {
        name: 'AI System',
        cost: 200,
        accuracy: 0.6,
        maintenance: 1,
        icon: '🧠',
        description: '60% accuracy detection that learns and improves by 0.5% per day, up to 80%.',
        depend: 'basic',
        errors: 1,
        techRequirement: 'ai_research'
    },
    super: {
        name: 'Supra AI System',
        cost: 250,
        accuracy: 0.8,
        maintenance: 5,
        icon: '🤖',
        description: 'High-end system with 80% accuracy that improves by 1% per day, up to 98%!.',
        depend: 'ai',
        errors: 1,
        techRequirement: 'behavioral_analysis'
    },
    quantum: {
        name: 'Quantum Filter',
        cost: 1200,
        accuracy: 0.95,
        maintenance: 8,
        icon: '⚛️',
        description: 'State-of-the-art quantum system with 95% accuracy and low errors ',
        depend: 'advanced',
        errors: 0.3,
        techRequirement: 'quantum_computing'
    }
}

export const actionOptions = {
    audit: {
        name: 'Audit',
        cost: 120,
        description: 'Request an audit. It will reduce corruption when completed',
        icon: '🕵️‍♂️',
        duration: 10,
        reputationEffect: -5,
        corruptionEffect: 0.5,
        techRequirement: null
    },
    raid: {
        name: 'Raid',
        cost: 500,
        description: 'The raid will damage reputation, but significantly reduce corruption',
        icon: '🚨',
        duration: 30,
        reputationEffect: -15,
        corruptionEffect: 0.2,
        techRequirement: 'special_operations'
    },
    international_task_force: {
        name: 'International Task Force',
        cost: 1000,
        description: 'Removes corruption',//'Target multiple connected nodes to reduce corruption across a network segment',
        icon: '🌍',
        duration: 15,
        reputationEffect: -10,
        corruptionEffect: 0,
        techRequirement: 'international_cooperation',
        // affectsConnected: true, TODO
    },
}

export const CORRUPTION_THRESHOLD = 4;

export const txSizeOptions = {
    small: { name: 'small', amount: 5 },
    medium: { name: 'medium', amount: 10 },
    large: { name: 'large', amount: 30 }
}

export const legalityOptions = ['legit', 'questionable', 'illegal']


export const nodeTypes = {
    bank: {
        name: 'Bank',
        InitialReputation: 80,
        icon: '🏦',
        color: '#DDE',
        usersCount: 4
    },
    processor: {
        name: 'Processor',
        InitialReputation: 70,
        icon: '🌐',
        color: '#99D',
        usersCount: 0
    },
    fintech: {
        name: 'Fintech',
        InitialReputation: 60,
        icon: '🚀',
        color: '#9DD',
        usersCount: 8,
    },
    cryptoExchange: {
        name: 'Crypto Exchange',
        InitialReputation: 50,
        icon: '💱',
        color: '#9DA',
        usersCount: 5
    }
}

export const userTypes = {
    person: {
        name: 'Individual',
        color: '#BBB',
        icon: '👤',
        frequency: 0.6
    },
    business: {
        name: 'Business',
        color: '#119',
        icon: '🏢',
        frequency: 0.3
    },
    government: {
        name: 'Government',
        color: '#555',
        icon: '🏛️',
        frequency: 0.1
    },
}

export const techTree = {
    compliance: [
        {
            id: 'basic_compliance',
            name: 'Compliance Training',
            cost: 25,
            prerequisites: [],
            description: 'Enables Medium Filters.',
            effects: {
                unlockTowers: ['medium'],
                // accuracy: 0,
            },
            icon: '🔍',
        },
        {
            id: 'advanced_compliance',
            name: 'Compliance Protocols',
            cost: 150,
            prerequisites: ['basic_compliance'],
            description: 'Unlocks Advanced Filter and improves accuracy for all systems.',
            effects: {
                unlockTowers: ['advanced'],
                accuracy: 1.05,
            },
            icon: '📘',
        },
        {
            id: 'ai_research',
            name: 'AI Research Initiative',
            cost: 300,
            prerequisites: ['basic_compliance'],
            description: 'Unlocks AI System .',
            effects: {
                unlockTowers: ['ai'],
            },
            icon: '🤖',
        },
        {
            id: 'behavioral_analysis',
            name: 'Behavioral Pattern Analysis',
            cost: 400,
            prerequisites: ['ai_research'],
            description: 'Unlocks Supra AI System and improves learning speed.',
            effects: {
                unlockTowers: ['supra_ai'],
                aiLearning: 1.1,
            },
            icon: '📊',
        },
        {
            id: 'false_positive_reduction',
            name: 'Robust Technologies',
            cost: 350,
            prerequisites: ['advanced_compliance'],
            description: 'Reduces false positives by 10% and unlock robust filters.',
            effects: {
                unlockTowers: ['robust', 'superRobust'],
                falsePositive: 0.8,
            },
            icon: '🔩',
        },
        {
            id: 'quantum_computing',
            name: 'Quantum Computing',
            cost: 2000,
            prerequisites: ['false_positive_reduction', 'behavioral_analysis'],
            description: 'Unlocks Quantum Filter and greatly improves accuracy.',
            effects: {
                unlockTowers: ['quantum'],
                accuracy: 1.2,
            },
            icon: '⚛️',
        },
    ],
    enforcement: [
        {
            id: 'basic_enforcement',
            name: 'Organised Procedures',
            cost: 90,
            prerequisites: [],
            description: 'Reduces Enforcement cost.',
            effects: {
                enforcementCost: 0.8,
                // unlockActions: ['audit'],
            },
            icon: '👮',
        },
        {
            id: 'enhanced_investigation',
            name: 'Investigation Methods',
            cost: 500,
            prerequisites: ['basic_enforcement'],
            description: 'Reduces reputation damage from enforcement actions.',
            effects: {
                reputationDamage: 0.5,
            },
            icon: '🔍',
        },
        {
            id: 'special_operations',
            name: 'Special Operations Unit',
            cost: 400,
            prerequisites: ['enhanced_investigation'],
            description: 'Unlocks Raid action.',
            effects: {
                unlockActions: ['raid'],
                // corruptionReduction: 0.2,
            },
            icon: '🚔',
        },
        // {
        //     id: 'digital_forensics',
        //     name: 'Digital Forensics',
        //     cost: 600,
        //     prerequisites: ['enhanced_investigation'],
        //     description: 'Unlock Forensic Analysis action.',
        //     effects: {
        //         unlockActions: ['forensic_analysis'],
        //     },
        //     icon: '💻',
        // },
        {
            id: 'public_relations',
            name: 'Public Relations Department',
            cost: 550,
            prerequisites: ['basic_enforcement'],
            description: 'Strongly reduces reputation damage.',
            effects: {
                reputationDamage: 0.3,
            },
            icon: '📢',
        },
        {
            id: 'international_cooperation',
            name: 'International Cooperation',
            cost: 1500,
            prerequisites: ['special_operations'],
            description: 'Unlocks International Task Force action.',// and enables multi-node targeting.',
            effects: {
                unlockActions: ['international_task_force'],
                multiNodeTargeting: true,
            },
            icon: '🌍',
        }
    ],
    network: [
        {
            id: 'basic_network',
            name: 'Basic Network Upgrades',
            cost: 80,
            prerequisites: [],
            description: 'Improves transaction speed.',
            effects: {
                transactionSpeed: 1.5,
            },
            icon: '🌐',
        },
        {
            id: 'secure_tunneling',
            name: 'Secure Tunneling Protocols',
            cost: 250,
            prerequisites: ['basic_network'],
            description: 'Reduces transaction drop probability.',
            effects: {
                transactionDrop: 0.5,
            },
            icon: '🔒',
        },
        {
            id: 'high_speed_processing',
            name: 'High-Speed Processing',
            cost: 300,
            prerequisites: ['basic_network'],
            description: 'Greatly improves transaction speed and reduces future maintenace costs',
            effects: {
                transactionSpeed: 2,
                maintenance: 0.5,
            },
            icon: '⚡',
        },
        {
            id: 'distributed_architecture',
            name: 'Distributed Systems Architecture',
            cost: 1400,
            prerequisites: ['secure_tunneling'],
            description: 'Minimizes transaction drops.',// and speeds up node activation.',
            effects: {
                transactionDrop: 0.3,
                // nodeActivationSpeed: 0.2,
            },
            icon: '🖧',
        }
    ],
};