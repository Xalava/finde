const debug = false
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const budgetEl = document.getElementById('budget');
let budget = 100;
const maintenanceEl = document.getElementById('maintenance');
let maintenance = 0;
const auditedNodes = [];

const nodes = [
    { id: 0, x: 250, y: 200, tower: null, corruption: 0, type: 'processor', name: 'PayFlow' },
    { id: 1, x: 300, y: 600, tower: null, corruption: 0, type: 'processor', name: 'TransactPro' },
    { id: 2, x: 400, y: 350, tower: null, corruption: 0, type: 'processor', name: 'SecurePay' },
    { id: 3, x: 600, y: 650, tower: null, corruption: 0, type: 'processor', name: 'FastFunds' },
    { id: 4, x: 750, y: 300, tower: null, corruption: 0, type: 'processor', name: 'QuickTransfer' },

    { id: 5, x: 400, y: 200, tower: null, corruption: 0, type: 'bank', name: 'Global Bank' },
    { id: 6, x: 200, y: 250, tower: null, corruption: 0, type: 'bank', name: 'Trust Bank' },
    { id: 7, x: 150, y: 350, tower: null, corruption: 2, type: 'bank', name: 'Safe Savings' },
    { id: 8, x: 950, y: 50, tower: null, corruption: 0, type: 'bank', name: 'Prime Bank' },
    { id: 9, x: 900, y: 200, tower: null, corruption: 0, type: 'bank', name: 'Capital Trust' },
    { id: 10, x: 100, y: 150, tower: null, corruption: 0, type: 'bank', name: 'Union Bank' },
    { id: 11, x: 300, y: 50, tower: null, corruption: 0, type: 'bank', name: 'Metro Bank' },
    { id: 12, x: 900, y: 550, tower: null, corruption: 0, type: 'bank', name: 'PioneerB ank' },
    { id: 13, x: 850, y: 100, tower: null, corruption: 0, type: 'bank', name: 'Elite Bank' },
    { id: 14, x: 600, y: 250, tower: null, corruption: 0, type: 'bank', name: 'Summit Bank' },
    { id: 15, x: 700, y: 700, tower: null, corruption: 0, type: 'bank', name: 'Horizon Bank' },
    { id: 16, x: 200, y: 500, tower: null, corruption: 0, type: 'bank', name: 'Anchor Bank' },
    { id: 17, x: 800, y: 450, tower: null, corruption: 3, type: 'bank', name: 'Crest Bank' },
    { id: 18, x: 200, y: 730, tower: null, corruption: 0, type: 'bank', name: 'Fortune Bank' },
    { id: 19, x: 400, y: 600, tower: null, corruption: 0, type: 'bank', name: 'Legacy Bank' },
];

const edges = [
    // processor to processor
    [0, 2], [1, 2], [2, 4],
    // processor to banks
    [0, 10], [0, 11], [0, 6], [1, 16], [1, 18], [1, 19], [2, 16], [3, 19], [3, 15], [4, 9], [4, 14], [4, 17], [5, 0],
    // banks to banks
    [6, 7], [8, 13], [9, 13], [10, 11], [11, 13], [11, 14], [12, 17], [13, 14], [15, 17], [16, 17], [16, 18], [17, 19],

];

let transactions = [];
const effects = [];

function spawnTransaction() {
    const banks = nodes.filter(n => n.type === 'bank');
    const source = banks[Math.floor(Math.random() * banks.length)];
    const type = Math.random() * 10 / (source.corruption + 1) < 1 ? 'bad' : 'legit'; //10%, 20%, 33%... 
    const size = ['small', 'medium', 'large'][Math.floor(Math.random() * 3)];
    transactions.push({
        path: getPathFrom(source.id),
        index: 0,
        x: source.x,
        y: source.y,
        speed: size === 'small' ? 1.8 : size === 'large' ? 1 : 1.5,
        type,
        size,
        source,
        active: true
    });
}
function getPathFrom(start) {
    const visited = new Set();
    const queue = [[start]];

    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
        if (!visited.has(node)) {
            visited.add(node);
            for (const edge of edges) {
                if (edge.includes(node)) {
                    const neighbor = edge[0] === node ? edge[1] : edge[0];
                    // const isAudited = auditedNodes.some(a => a.id === neighbor && a.until > Date.now());
                    // if (isAudited) continue; // Skip audited nodes entirely
                    if (!visited.has(neighbor)) {
                        const newPath = [...path, neighbor];
                        queue.push(newPath);
                        if (nodes[neighbor].type === 'bank') {
                            // If a valid path to a bank is found, continue exploring for longer paths occasionally
                            if (Math.random() < 0.5 || queue.length === 0) {
                                return newPath;
                            }
                        }
                    }
                }
            }
        }
    }
    const fallbackPath = Array.from(visited); // Use visited nodes as a fallback path
    return fallbackPath.length > 1 ? fallbackPath : [start];
}

function moveTransaction(tx) {
    const curr = nodes[tx.path[tx.index]];
    const next = nodes[tx.path[tx.index + 1]];
    if (!next) return;

    const dx = next.x - tx.x;
    const dy = next.y - tx.y;
    const dist = Math.hypot(dx, dy);

    if (dist < tx.speed) {
        tx.index++;
        if (tx.index >= tx.path.length - 1) {
            const dest = nodes[tx.path[tx.index]];
            if (tx.type === 'bad') {
                dest.corruption++;
                let basePenalty = tx.size === 'large' ? 30 : tx.size === 'medium' ? 20 : 10;
                budget -= basePenalty;
                drawEffect(dest.x, dest.y, '💥');
                drawEffect(dest.x, dest.y, "-" + basePenalty, 'malus');


                console.log(`💥 Breach at node ${dest.id}`);
            } else {
                let baseIncome = tx.size === 'large' ? 15 : tx.size === 'medium' ? 10 : 5;
                const isAudited = auditedNodes.some(a => a.id === dest.id);
                if (isAudited) baseIncome = Math.floor(baseIncome / 2)
                budget += baseIncome;
                drawEffect(dest.x, dest.y, "+" + baseIncome, 'bonus');

            }
            tx.active = false;
        }
    } else {
        tx.x += (dx / dist) * tx.speed;
        tx.y += (dy / dist) * tx.speed;
    }
}

function detect(tx) {
    const node = nodes[tx.path[tx.index]];
    if (!node || !node.tower || tx.type !== 'bad') return;

    let efficiency = 0;
    if (node.tower === 'basic') {
        if (tx.size !== 'small') efficiency = 0.5;
    }
    if (node.tower === 'enhanced') {
        efficiency = 0.5;
    }
    if (node.tower === 'ai') {
        efficiency = 0.8;
    }
    if (node.tower === 'advanced') {
        efficiency = 0.9;
    }

    if (Math.random() < efficiency) {
        tx.active = false;
        // budget += tx.size === 'large' ? 30 : tx.size === 'medium' ? 20 : 10;
        drawEffect(node.x, node.y, '✔️');
        console.log(`✔️ Blocked at node ${node.id}`);
    }
}

function drawEffect(x, y, emoji, type = 'default') {
    if (type === "default")
        effects.push({ x, y, emoji, timer: 60, type: type })
    else
        effects.push({ x, y, emoji, timer: 20, type: type })
}

function updateEffects() {
    effects.forEach(e => {
        e.timer -= 1;
        switch (e.type) {
            case 'malus':
                ctx.fillStyle = 'red';
                ctx.font = '12px Arial';
                ctx.fillText(e.emoji, e.x - 5, e.y - 50);
                break;
            case 'bonus':
                ctx.fillStyle = 'green';
                ctx.font = '12px Arial';
                ctx.fillText(e.emoji, e.x - 10, e.y - 25);
                break;
            default:
                ctx.font = '24px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(e.emoji, e.x - 10, e.y - 30);
        }
    });
    for (let i = effects.length - 1; i >= 0; i--) {
        if (effects[i].timer <= 0) effects.splice(i, 1);
    }
}

// Handle mouse click to place towers
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let node of nodes) {
        const dx = node.x - mx;
        const dy = node.y - my;
        if (Math.hypot(dx, dy) < 20) {
            if (!node.tower) {
                if (e.shiftKey && budget >= 100) {
                    node.tower = 'ai';
                    budget -= 100;
                    maintenance -= 1
                } else if (budget >= 50) {
                    node.tower = 'basic';
                    budget -= 50;
                }
            } else {
                if (node.tower === 'basic' && budget >= 75) {
                    node.tower = 'enhanced';
                    budget -= 75;
                } else if (node.tower === 'ai' && budget >= 150) {
                    node.tower = 'advanced';
                    budget -= 150;
                    maintenance -= 5
                }
            }
            break;
        }
    }
});

// Handle mouse hover to show tower info with a delay but no delay after
let hoverNode = null;
let hoverTimeout = null;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (hoverTimeout) clearTimeout(hoverTimeout);

    hoverTimeout = setTimeout(() => {
        hoverNode = null;
        for (let node of nodes) {
            const dx = node.x - mx;
            const dy = node.y - my;
            if (Math.hypot(dx, dy) < 20) {
                hoverNode = node;
                break;
            }
        }
    }, 100); // Increased delay to 500ms before showing hover info
});

canvas.addEventListener('mouseleave', () => {
    hoverNode = null; // Clear tooltip instantly when mouse leaves the canvas
    if (hoverTimeout) clearTimeout(hoverTimeout);
});

function drawNode(node) {
    ctx.save();  // Save canvas state

    ctx.beginPath();
    ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
    let color = node.type === 'bank' ? '#eee' : '#aaf';

    if (node.corruption > 4) {
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 10;
    } else if (node.corruption > 1) {
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 5;
    }

    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
    ctx.restore(); // Restore to remove shadow for text drawing

    ctx.font = '20px Arial';
    ctx.fillText(node.type === 'bank' ? '🏦' : '🌐', node.x - 12, node.y + 7);
    if (node.tower) {
        const emoji = {
            'basic': '🔍',
            'enhanced': '🔬',
            'ai': '🧠',
            'advanced': '🤖'
        }[node.tower];
        ctx.fillText(emoji, node.x - 10, node.y + 25);
    }
    const auditStatus = auditedNodes.find(a => a.id === node.id && a.until > Date.now());
    if (auditStatus) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText('🕴️ Audit', node.x - 20, node.y - 30);
    }
    if (debug) {
        ctx.fillalign = 'center';
        ctx.fillStyle = 'black';
        ctx.fillText(node.id, node.x - 10, node.y - 20);
        if (node.corruption) {
            ctx.fillStyle = 'red';
            ctx.fillText(node.corruption, node.x, node.y + 30);
        }
    }
}

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent default right-click menu

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let node of nodes) {
        const dx = node.x - mx;
        const dy = node.y - my;
        if (Math.hypot(dx, dy) < 20) {
            const now = Date.now();
            if (budget >= 100 && !auditedNodes.find(a => a.id === node.id)) {
                auditedNodes.push({ id: node.id, until: now + 10000 });
                budget -= 100;
                console.log(`🔎 Audit started at node ${node.id}`);
            }
            break;
        }
    }
});

function drawEdge([a, b]) {

    ctx.beginPath();
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawTransaction(tx) {
    const emoji = tx.type === 'legit' ? '💵' : '💸';
    let fontSize = tx.size === 'small' ? '18px' : tx.size === 'medium' ? '24px' : '32px';
    ctx.font = fontSize + ' Arial';
    ctx.fillText(emoji, tx.x - 10, tx.y + 10);
}

function deductTowerCosts() {
    nodes.forEach(node => {
        if (node.tower === 'ai') budget -= 1 / 60;
        if (node.tower === 'advanced') budget -= 5 / 60;
    });
}
const startTime = Date.now()
function gameLoop() {
    if (debug) {
        console.log('> Game loop', Math.floor((Date.now() - startTime) / 1000), ' seconds');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    edges.forEach(drawEdge);
    nodes.forEach(drawNode);
    transactions.forEach(tx => {
        if (tx.active) {
            moveTransaction(tx);
            detect(tx);
            drawTransaction(tx);
        }
    });
    transactions = transactions.filter(t => t.active);
    updateEffects();
    if (Math.random() < 0.03) spawnTransaction();
    deductTowerCosts();
    budgetEl.textContent = Math.max(0, budget.toFixed(0))
    maintenanceEl.textContent = maintenance
    if (hoverNode) {
        const tooltip = `${hoverNode.name} \nCorruption: ${hoverNode.corruption}\nControls: ${hoverNode.tower || 'None'}`;
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        const lines = tooltip.split('\n');
        let tooltipX = hoverNode.x + 25;
        let tooltipY = hoverNode.y;
        ctx.fillStyle = '#fff';
        ctx.fillRect(tooltipX - 5, tooltipY - 15, 140, lines.length * 18 + 8);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(tooltipX - 5, tooltipY - 15, 140, lines.length * 18 + 8);
        ctx.fillStyle = '#000';
        lines.forEach((line, i) => ctx.fillText(line, tooltipX, tooltipY + i * 18));
    }
    const totalActors = nodes.length;// filter(n => n.type === 'bank')
    const totalCorruption = nodes.reduce((sum, n) => sum + n.corruption, 0);
    const spread = (totalCorruption / (3 * totalActors)) * 100;// We consider 4 as fully corrupted (red)

    ctx.fillStyle = '#333';
    ctx.fillRect(10, canvas.height - 30, 200, 20);
    ctx.fillStyle = spread > 70 ? 'red' : spread > 30 ? 'orange' : 'green';
    ctx.fillRect(10, canvas.height - 30, 2 * Math.min(spread, 100), 20);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`Corruption: ${Math.floor(spread)}%`, 15, canvas.height - 15);
    // Remove expired audits
    const now = Date.now();
    for (let i = auditedNodes.length - 1; i >= 0; i--) {
        if (auditedNodes[i].until <= now) {
            console.log(`✅ Audit complete on node ${auditedNodes[i].id}`);
            nodes[auditedNodes[i].id].corruption = Math.floor(nodes[auditedNodes[i].id].corruption / 2);
            auditedNodes.splice(i, 1);
        }
    }
    requestAnimationFrame(gameLoop);
}

gameLoop()