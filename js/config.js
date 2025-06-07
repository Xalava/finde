
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
        cost: 125,
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
        cost: 375,
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
        cost: 350,
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
        cost: 299,
        accuracy: 0.6,
        maintenance: 1,
        icon: '🧠',
        description: '60% accuracy detection that learns and improves by 0.5% per day, up to 80%. Costs maintenance',
        depend: 'medium',
        errors: 1,
        techRequirement: 'ai_research'
    },
    super: {
        name: 'Supra AI System',
        cost: 1475,
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
        cost: 2400,
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
        cost: 120, // will be 90
        description: 'Request an audit. It will reduce corruption when completed',
        icon: '🕵️‍♂️',
        duration: 10,
        reputationEffect: -5,
        corruptionEffect: 0.6,
        techRequirement: null
    },
    raid: {
        name: 'Raid',
        cost: 600, //450 after discount
        description: 'The raid will damage reputation, but significantly reduce corruption',
        icon: '🚨',
        duration: 20,
        reputationEffect: -20,
        corruptionEffect: 0.2,
        techRequirement: 'special_operations'
    },
    international_task_force: {
        name: 'International Task Force',
        cost: 1600,
        description: 'Removes corruption and launches a raid in neghbouring institutions',
        icon: '🌍',
        duration: 25,
        reputationEffect: -10,
        corruptionEffect: 0,
        techRequirement: 'international_cooperation',
        affectsConnected: true,
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
            id: 'investigation_methods',
            name: 'Investigation Methods',
            cost: 90,
            prerequisites: [],
            description: 'Augments enforcement efficiency.',
            effects: {
                enforcementEfficiency: 0.6,
            },
            icon: '👮',
        },
        {
            id: 'organised_procedures',
            name: 'Organised Procedures',
            cost: 350,
            prerequisites: ['investigation_methods'],
            description: 'Reduces Enforcement cost.',
            effects: {
                enforcementCost: 0.75,
                // unlockActions: ['audit'],
            },
            icon: '🗃️',
        },
        {
            id: 'special_operations',
            name: 'Special Operations Unit',
            cost: 500,
            prerequisites: ['organised_procedures'],
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
        //     prerequisites: ['special_operations'],
        //     description: 'Unlock Forensic Analysis action.',
        //     effects: {
        //         unlockActions: ['forensic_analysis'],
        //     },
        //     icon: '💻',
        // },
        {
            id: 'public_relations',
            name: 'Public Relations Department',
            cost: 750,
            prerequisites: ['organised_procedures'],
            description: 'Strongly reduces reputational damage from enforcement actions.',
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
            name: 'Standardised Messaging',
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
            cost: 350,
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
            cost: 400,
            prerequisites: ['basic_network'],
            description: 'Greatly improves transaction speed and reduces maintenance costs',
            effects: {
                transactionSpeed: 2,
                maintenance: 0.5,
            },
            icon: '⚡',
        },
        {
            id: 'distributed_architecture',
            name: 'Distributed Systems Architecture',
            cost: 1600,
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

export const countries = {
    kosi: {
        name: "Kosi Republic",
        x: 455, y: 330,
        color: "#2E86AB", // Deep blue
        flag: "🌊",
        corruptionRisk: 1,
        secrecy: 3,
        activity: 3,
        description: "A developed democracy with strong institutions and pioneering digital transparency initiatives."
    },
    tafada: {
        name: "Tafada Federation",
        x: 980, y: 410,
        color: "#8E44AD", // *Royal purple*
        flag: "🏜️",
        corruptionRisk: 6,
        secrecy: 5,
        activity: 7,
        description: "A trading hub undergoing significant economic modernization."
    },
    valerian: {
        name: "Valerian Islands",
        x: 1140, y: 690,
        color: "#20B2AA", // Light sea green
        flag: "🏝️",
        corruptionRisk: 9,
        secrecy: 4,
        activity: 2,
        description: "An island nation transitioning from traditional banking toward international standards."
    },
    drakmoor: {
        name: "Drakmoor",
        x: 290, y: 850,
        color: "#7B68EE", // Medium slate blue
        flag: "🏰",
        corruptionRisk: 5,
        secrecy: 9,
        activity: 4,
        description: "A mountainous nation that maintains financial privacy laws rooted in centuries-old principles."
    },
    ustah: {
        name: "Ustah Kingdom",
        x: 700, y: 880,
        color: "#F4A261", // Warm amber
        flag: "🏗️",
        corruptionRisk: 4,
        secrecy: 6,
        activity: 9,
        description: "A manufacturing powerhouse combining informal economy activity and developed financial sector."
    }
}

export const countryKeys = Object.keys(countries)    