// Game constants
export const BASE_SPAWN_RATE = 0.0018
export const HOLIDAY_SPAWN_BONUS = 10
export let NEW_NODE_FREQUENCY = 60
export const DISTANCE = {
    MAX_USERTONODE: 150,
    MIN_USERTONODE: 30,
    MIN_USERTOUSER: 25
}
export const REPUTATION = {
    STARTING: 80,
    POSTFAILURE: 50,
}

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
        cost: 95,
        accuracy: 0.7,
        maintenance: 0,
        icon: '🔬',
        description: 'Detects all sizes of illegal transactions with 70% accuracy',
        depend: 'basic',
        errors: 1,
        techRequirement: 'basic_compliance'
    },

    advanced: {
        name: 'Advanced Filter',
        cost: 350,
        accuracy: 0.85,
        maintenance: 2,
        icon: '🔭',
        description: 'Advanced detection with 85% accuracy. Not compatible with AI.',
        depend: 'medium',
        errors: 1,
        techRequirement: 'advanced_compliance'
    },
    ai: {
        name: 'AI System',
        cost: 299,
        accuracy: 0.6,
        maintenance: 3,
        icon: '🧠',
        description: '60% accuracy detection that learns and improves by 0.5% per day, up to 80%. Not compatible with advanced towers',
        depend: 'medium',
        errors: 1,
        techRequirement: 'ai_research'
    },
    super: {
        name: 'Supra AI System',
        cost: 1475,
        accuracy: 0.8,
        maintenance: 12,
        icon: '🤖',
        description: 'High-end system with 80% accuracy that improves by 1% per day, up to 98%!',
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
        description: 'State-of-the-art quantum system with 95% accuracy and low errors.',
        depend: 'advanced',
        errors: 0.3,
        techRequirement: 'quantum_computing'
    }
}

export const actionOptions = {
    audit: {
        name: 'Audit',
        cost: 160,
        description: 'Reduces local corruption when completed.',
        icon: '🕵️‍♂️',
        duration: 10,
        reputationEffect: -1,
        corruptionEffect: 0.6,
        techRequirement: null
    },
    raid: {
        name: 'Raid',
        cost: 600, //450 after discount
        description: 'Significantly reduces corruption, but damages reputation and popularity.',
        icon: '🚨',
        duration: 5,
        reputationEffect: -25,
        popularityEffect: -3,
        corruptionEffect: 0.2,
        techRequirement: 'special_operations'
    },
    international_task_force: {
        name: 'International Task Force',
        cost: 1900,
        description: 'Removes corruption and launches a raid in neghbouring institutions.',
        icon: '🌍',
        duration: 25,
        reputationEffect: -5,
        corruptionEffect: 0,
        techRequirement: 'international_cooperation',
        affectsConnected: true,
    },
}

export const HIGH_CORRUPTION_THRESHOLD = 4
export const MAX_CORRUPTION = 9

export const txSizeOptions = {
    small: { name: 'small', max: 10 },
    medium: { name: 'medium', max: 100 },
    large: { name: 'large', max: 10000 }
}
export const getSizeTier = (amount) => {
    if (amount < txSizeOptions.small.max) return 'small'
    if (amount < txSizeOptions.medium.max) return 'medium'
    return 'large'
}

export const legalityOptions = ['legit', 'questionable', 'illegal']
export const getLegalityCategory = (riskLevel) => {
    if (riskLevel < 4) return 'legit'
    if (riskLevel < 7) return 'questionable'
    return 'illegal'
}
export const legalityColorMap = {
    legit: 'rgba(0, 255, 0, 0.7)',
    questionable: 'rgba(255, 165, 0, 0.7)',
    illegal: 'rgba(255, 0, 0, 0.9)'
}

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
        color: '#119',
        icon: '👤',
        frequency: 0.6
    },
    business: {
        name: 'Business',
        color: '#BBB',
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

export const events = {
    structuredLayering: {
        id: 'structuredLayering',
        name: 'Structured Layering Operation Detected',
        description: 'Our systems flagged a coordinated scheme. Multiple entities move funds under thresholds to avoid Currency Transaction Reporting (CTR) requirements.',
        icon: '🚨',
        probability: 0.0008,
        cooldown: 480000, // 8 minutes
        choices: [
            {
                id: 'enhancedMonitoring',
                text: 'Deploy Enhanced Transaction Monitoring',
                description: 'Doubles illegal transaction detection for 1 minutes but increases operational costs.',
                effects: {
                    detectionMod: 2,
                    maintenance: 10,
                    duration: 60000,
                    toast: { success: 'Enhanced Monitoring Active' }
                }
            },
            {
                id: 'fileCTR',
                text: 'File Currency Transaction Reports',
                description: 'Report transactions to authorities. However, filing alerts may cause the criminal network to modify their methods.',
                effects: {
                    budget: 400,
                    launderingAlert: true,
                    duration: 90000,
                    toast: { success: 'Reports Filed Successfully', warning: 'Criminal Network Alerted' }
                }
            }
        ]
    },
    cybersecurityBreach: {
        id: 'cybersecurityBreach',
        name: 'Critical Infrastructure Cyber Attack',
        description: 'URGENT: Persistent Threat detected targeting core banking infrastructure. The attack vector appears to be a zero-day exploit against messaging interfaces. ',
        icon: '🔴',
        probability: 0.0004,
        cooldown: 720000, // 12 minutes
        choices: [
            {
                id: 'emergencyShutdown',
                text: 'Emergency Network Isolation',
                description: 'Immediately isolate all systems and halt transaction processing. Prevents further damage but causes complete network shutdown and significant financial losses.',
                effects: {
                    budget: -800,
                    detectionMod: 0.5,
                    maintenance: 0,
                    duration: 150000,
                    toast: { warning: 'Network Isolated - Major Disruption' }
                }
            },
            {
                id: 'activeDefense',
                text: 'Cyber Defense Countermeasures',
                description: 'Engage incident response team to contain threat while maintaining operations. Risky approach that may allow continued monitoring systems but keeps network functional.',
                effects: {
                    budget: 100,
                    detectionMod: 0.3,
                    maintenance: 25,
                    duration: 120000,
                    toast: { success: 'Containment Protocols Active', warning: 'Network Remains Vulnerable' }
                }
            }
        ]
    }
}

export const techTree = {
    compliance: [
        {
            id: 'basic_compliance',
            name: 'Compliance Training',
            cost: 40,
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
            cost: 160,
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
                unlockTowers: ['super'],
                aiLearning: 1.1,
            },
            icon: '🦾',
        },
        {
            id: 'false_positive_reduction',
            name: 'Robust Technologies',
            cost: 350,
            prerequisites: ['advanced_compliance'],
            description: 'Reduces false positives by 20%.',
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
            id: 'organised_procedures',
            name: 'Organised Procedures',
            cost: 60,
            prerequisites: [],
            description: 'Reduces Enforcement cost.',
            effects: {
                enforcementCost: 0.70,
            },
            icon: '🗃️',
        },
        {
            id: 'investigation_methods',
            name: 'Investigation Methods',
            cost: 350,
            prerequisites: ['organised_procedures'],
            description: 'Augments enforcement efficiency.',
            effects: {
                enforcementEfficiency: 1.4,
            },
            icon: '👮',
        },

        {
            id: 'special_operations',
            name: 'Special Operations Unit',
            cost: 500,
            prerequisites: ['organised_procedures'],
            description: 'Unlocks Raid action.',
            effects: {
                unlockActions: ['raid'],
            },
            icon: '🚔',
        },
        {
            id: 'public_relations',
            name: 'Public Relations Department',
            cost: 750,
            prerequisites: ['organised_procedures'],
            description: 'Reduces reputational damage from enforcement actions.',
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
        },
    ],
    network: [
        {
            id: 'basic_network',
            name: 'Standardised Messaging',
            cost: 30,
            prerequisites: [],
            description: 'Improves transaction speed.',
            effects: {
                transactionSpeed: 1.5,
            },
            icon: '🌐',
        },
        {
            id: 'reporting',
            name: 'Reporting System',
            cost: 80,
            prerequisites: ['basic_network'],
            description: 'Enables analytics.',
            effects: {
                unlockStatistics: true,
            },
            icon: '📊',
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
        ,
        {
            id: 'instant_settlement',
            name: 'Instant settlement ',
            cost: 800,
            prerequisites: ['high_speed_processing'],
            description: 'Instant transactions increase wealth, but crime too.',
            effects: {
                // TODO : enable instant settlement transactoins
            },
            icon: '☄️',
        },

        {
            id: 'distributed_architecture',
            name: 'Distributed Architecture',
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
}

export const countries = {
    kosi: {
        name: "Kosi Republic",
        x: 455, y: 330,
        color: "#2E86AB", // Deep blue
        flag: "🌊",
        corruptionRisk: 1,
        secrecy: 3,
        activity: 3, // nb of tx
        gdpPerCapita: 7,
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
        gdpPerCapita: 4,
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
        gdpPerCapita: 2,
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
        gdpPerCapita: 9,
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
        gdpPerCapita: 6,
        description: "A manufacturing powerhouse combining informal economy activity and developed financial sector."
    }
}

export const countryKeys = Object.keys(countries)// == Game data ==
