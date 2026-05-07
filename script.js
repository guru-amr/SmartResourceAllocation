/**
 * NexusAlloc | Smart Resource Allocation Logic
 * Integrates with Node.js backend for State, Banker's Algorithm, and ML Predictions.
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : null; // No backend on GitHub Pages — demo mode

// --- State Management ---
let systemState = {
    available: [0, 0, 0],
    max: [],
    allocation: [],
    safeSequence: []
};

let mainChart, miniChart;
const TOTALS = [10, 5, 7]; // System Capacity [CPU, RAM, Disk]

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initTabs();
    initCharts();
    setupEventListeners();
    
    // Initial fetch
    refreshData();
    
    // Background polling for state
    setInterval(refreshData, 5000);
});

// --- UI Interaction ---

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`panel-${target}`).classList.add('active');
            
            // Re-render charts if hidden
            if (target === 'ml' && mainChart) mainChart.update();
            if (target === 'dashboard' && miniChart) miniChart.update();
        });
    });
}

function setupEventListeners() {
    document.getElementById('btn-request').addEventListener('click', handleRequest);
    document.getElementById('btn-refresh').addEventListener('click', refreshData);
    document.getElementById('btn-clear-log').addEventListener('click', () => {
        document.getElementById('activity-log').innerHTML = '';
        addLog('SYSTEM', 'Activity log cleared.', 'sys-tag');
    });
    document.getElementById('btn-run-safety').addEventListener('click', runSafetyTrace);
}

// --- Data Fetching ---

async function refreshData() {
    if (!API_BASE) {
        // Demo mode: use built-in state
        updateSystemStatus(false, true);
        updateDashboardUI();
        updateBankersTab();
        fetchPredictions();
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/state`);
        if (!response.ok) throw new Error('Server unreachable');
        
        const data = await response.json();
        systemState = { ...systemState, ...data };
        
        updateSystemStatus(true);
        updateDashboardUI();
        updateBankersTab();
        fetchPredictions();
    } catch (err) {
        updateSystemStatus(false);
        console.error('State fetch error:', err);
    }
}

async function fetchPredictions() {
    if (!API_BASE) {
        // JS fallback predictor in demo mode
        const mockData = [
            { time: 1, usage: 10 }, { time: 2, usage: 12 }, { time: 3, usage: 15 },
            { time: 4, usage: 14 }, { time: 5, usage: 18 }
        ];
        const predictor = new ResourcePredictor();
        predictor.train(mockData);
        updateMLUI({ predictedUsage: predictor.predict(6), model_type: 'JS Fallback (Demo Mode)' });
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/predict`);
        const data = await res.json();
        updateMLUI(data);
    } catch (e) {
        console.warn('Prediction fetch failed');
    }
}

// --- UI Updates ---

function updateSystemStatus(online, demo = false) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    
    if (online) {
        dot.classList.add('online');
        text.innerText = 'System Active';
    } else if (demo) {
        dot.classList.add('online');
        text.innerText = 'Demo Mode';
    } else {
        dot.classList.remove('online');
        text.innerText = 'Server Offline';
    }
}

function updateDashboardUI() {
    const { available, allocation, max } = systemState;
    
    // Update Rings
    updateRing('cpu', available[0], TOTALS[0]);
    updateRing('ram', available[1], TOTALS[1]);
    updateRing('disk', available[2], TOTALS[2]);
    
    // Update Progress Bars
    updateBar('cpu', available[0], TOTALS[0]);
    updateBar('ram', available[1], TOTALS[1]);
    updateBar('disk', available[2], TOTALS[2]);
    
    // Update Header Stats
    document.getElementById('active-procs').innerText = max.length;
    
    // Populate Table
    const tbody = document.getElementById('process-tbody');
    tbody.innerHTML = '';
    
    max.forEach((maxRow, i) => {
        const allocRow = allocation[i];
        const needRow = maxRow.map((v, j) => v - allocRow[j]);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700">P${i}</td>
            <td><span class="mono">(${maxRow.join(', ')})</span></td>
            <td><span class="mono">(${allocRow.join(', ')})</span></td>
            <td><span class="mono">(${needRow.join(', ')})</span></td>
            <td><span class="card-badge success">Safe</span></td>
            <td><button class="btn-icon" onclick="selectProcess(${i}, [${needRow}])" title="Fill Request">🎯</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('safe-badge').innerText = 'System Safe';
    document.getElementById('safe-badge').className = 'safe-badge';
}

function updateRing(id, val, total) {
    const ring = document.getElementById(`svg-${id}`);
    const text = document.getElementById(`${id}-val`);
    const pct = (val / total) * 100;
    const offset = 213.6 - (pct / 100) * 213.6;
    
    ring.style.strokeDashoffset = offset;
    text.innerText = val;
}

function updateBar(id, val, total) {
    const bar = document.getElementById(`${id}-bar`);
    const pctLabel = document.getElementById(`${id}-pct`);
    const pct = Math.round((val / total) * 100);
    
    bar.style.width = `${pct}%`;
    pctLabel.innerText = `${pct}%`;
}

function selectProcess(pid, needs) {
    document.getElementById('req-pid').value = pid;
    document.getElementById('req-c').value = needs[0] > 0 ? 1 : 0;
    document.getElementById('req-r').value = needs[1] > 0 ? 1 : 0;
    document.getElementById('req-d').value = needs[2] > 0 ? 1 : 0;
    
    showToast(`Process P${pid} selected`, 'info');
}

// --- Request Handling ---

async function handleRequest() {
    const pid = parseInt(document.getElementById('req-pid').value);
    const c = parseInt(document.getElementById('req-c').value) || 0;
    const r = parseInt(document.getElementById('req-r').value) || 0;
    const d = parseInt(document.getElementById('req-d').value) || 0;
    
    if (isNaN(pid)) return showToast('Invalid Process ID', 'error');

    const logBox = document.getElementById('log-box');
    logBox.innerHTML = '<div style="color:var(--accent)">Executing safety validation...</div>';

    if (!API_BASE) {
        // Run Banker's Algorithm locally in demo mode
        const { isSafe } = window.BankersLocal;
        let tempAvailable = [...systemState.available];
        let tempAllocation = systemState.allocation.map(row => [...row]);

        for (let i = 0; i < [c,r,d].length; i++) {
            if ([c,r,d][i] > tempAvailable[i]) {
                logBox.innerHTML = `<div style="color:var(--danger)">❌ DENIED: Resource unavailable.</div>`;
                showToast('Allocation Denied', 'error');
                return;
            }
        }
        [c,r,d].forEach((v,i) => { tempAvailable[i] -= v; tempAllocation[pid][i] += v; });
        const { safe, sequence } = isSafe(tempAvailable, systemState.max, tempAllocation);

        if (safe) {
            systemState.available = tempAvailable;
            systemState.allocation = tempAllocation;
            logBox.innerHTML = `<div style="color:var(--success)">✅ GRANTED (Demo Mode)</div>
                               <div style="font-size:0.75rem; margin-top:5px; color:var(--text-dim)">Safe Sequence: ${sequence.join(' → ')}</div>`;
            showToast('Allocation Successful (Demo)', 'success');
            addLog(`P${pid}`, `Requested (${c},${r},${d}) - GRANTED. Seq: ${sequence.join('→')}`, 'safe-tag');
            updateSequenceUI(sequence);
            updateDashboardUI();
            updateBankersTab();
        } else {
            logBox.innerHTML = `<div style="color:var(--danger)">❌ DENIED: Unsafe state detected.</div>`;
            showToast('Allocation Denied (Unsafe)', 'error');
            addLog(`P${pid}`, `Requested (${c},${r},${d}) - DENIED (Deadlock Risk)`, 'fail-tag');
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processId: pid, request: [c, r, d] })
        });
        
        const data = await response.json();
        
        if (data.success) {
            logBox.innerHTML = `<div style="color:var(--success)">✅ GRANTED: ${data.message}</div>
                               <div style="font-size:0.75rem; margin-top:5px; color:var(--text-dim)">Safe Sequence: ${data.sequence.join(' → ')}</div>`;
            showToast('Allocation Successful', 'success');
            addLog(`P${pid}`, `Requested (${c},${r},${d}) - GRANTED. Seq: ${data.sequence.join('→')}`, 'safe-tag');
            updateSequenceUI(data.sequence);
            refreshData();
        } else {
            logBox.innerHTML = `<div style="color:var(--danger)">❌ DENIED: ${data.message}</div>`;
            showToast('Allocation Denied (Unsafe)', 'error');
            addLog(`P${pid}`, `Requested (${c},${r},${d}) - DENIED (Deadlock Risk)`, 'fail-tag');
        }
    } catch (err) {
        logBox.innerHTML = `<div style="color:var(--danger)">Error: Server error during allocation.</div>`;
    }
}

function updateSequenceUI(sequence) {
    const container = document.getElementById('seq-display');
    container.innerHTML = '';
    
    sequence.forEach(pid => {
        const item = document.createElement('div');
        item.className = 'seq-item';
        item.innerHTML = `<span>P${pid}</span> <span class="seq-arrow">→</span>`;
        container.appendChild(item);
    });
    
    document.getElementById('safe-seq-count').innerText = sequence.length > 0 ? sequence.join('→') : '—';
}

// --- Bankers Algorithm Trace ---

function updateBankersTab() {
    const { available, max, allocation } = systemState;
    if (!max.length) return;

    document.getElementById('avail-row').innerText = `[ ${available.join(', ')} ]`;
    
    const fillTable = (id, data) => {
        const tbody = document.getElementById(id);
        tbody.innerHTML = '';
        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>P${i}</td>` + row.map(v => `<td>${v}</td>`).join('');
            tbody.appendChild(tr);
        });
    };

    const need = max.map((row, i) => row.map((v, j) => v - allocation[i][j]));

    fillTable('alloc-tbody', allocation);
    fillTable('max-tbody', max);
    fillTable('need-tbody', need);
}

function runSafetyTrace() {
    const { available, max, allocation } = systemState;
    const numP = max.length;
    const numR = available.length;
    
    let need = max.map((row, i) => row.map((v, j) => v - allocation[i][j]));
    let work = [...available];
    let finish = new Array(numP).fill(false);
    let sequence = [];
    
    const stepsCont = document.getElementById('steps-container');
    const resultCont = document.getElementById('safety-result');
    stepsCont.innerHTML = '';
    resultCont.innerHTML = '<div class="loader-dots"><span></span><span></span><span></span></div> Tracing algorithm...';

    let count = 0;
    let iterations = 0;
    const maxIterations = numP * numP;

    while (count < numP && iterations < maxIterations) {
        let found = false;
        for (let p = 0; p < numP; p++) {
            if (!finish[p]) {
                let canAllocate = true;
                for (let j = 0; j < numR; j++) {
                    if (need[p][j] > work[j]) {
                        canAllocate = false;
                        break;
                    }
                }

                const step = document.createElement('div');
                step.className = 'step-item checking';
                step.innerHTML = `<strong>Iteration ${iterations+1}:</strong> Checking Process P${p}... <br>
                                 Need: (${need[p].join(',')}) Work: (${work.join(',')})`;
                stepsCont.appendChild(step);

                if (canAllocate) {
                    for (let k = 0; k < numR; k++) work[k] += allocation[p][k];
                    finish[p] = true;
                    sequence.push(p);
                    found = true;
                    count++;
                    
                    step.className = 'step-item success';
                    step.innerHTML += `<br>✅ Resources available. Work updated to (${work.join(',')})`;
                } else {
                    step.className = 'step-item fail';
                    step.innerHTML += `<br>❌ Insufficient resources. Skipping.`;
                }
            }
        }
        if (!found) break;
        iterations++;
    }

    if (count === numP) {
        resultCont.innerHTML = `<div class="card-badge success">SYSTEM IS SAFE</div> 
                               <p style="margin-top:10px">Sequence: ${sequence.join(' → ')}</p>`;
    } else {
        resultCont.innerHTML = `<div class="card-badge warning">SYSTEM IS UNSAFE</div>
                               <p style="margin-top:10px">Deadlock possible. No safe sequence found.</p>`;
    }
}

// --- ML Visuals ---

function updateMLUI(data) {
    const val = data.predictedUsage.toFixed(2);
    const engine = data.model_type || 'Python Service';
    
    document.getElementById('pred-val').innerText = `${val} Units`;
    document.getElementById('pred-model-badge').innerText = engine;
    
    document.getElementById('ml-predicted').innerText = `${val} Units`;
    document.getElementById('ml-engine').innerText = engine;
    
    // Update Chart
    if (mainChart) {
        mainChart.data.datasets[0].data[5] = data.predictedUsage;
        mainChart.update();
    }
    
    if (miniChart) {
        miniChart.data.datasets[0].data[5] = data.predictedUsage;
        miniChart.update();
    }
    
    // Update Bars
    const predBar = document.getElementById('pred-bar');
    const predNum = document.getElementById('pred-num');
    const pct = Math.min(100, (data.predictedUsage / 25) * 100);
    predBar.style.width = `${pct}%`;
    predNum.innerText = val;
}

// --- Charts ---

function initCharts() {
    const mainCtx = document.getElementById('predictionChart').getContext('2d');
    const miniCtx = document.getElementById('miniChart').getContext('2d');
    
    const chartConfig = {
        type: 'line',
        data: {
            labels: ['T-4', 'T-3', 'T-2', 'T-1', 'Now', 'Predicted'],
            datasets: [{
                label: 'Resource Demand',
                data: [10, 12, 15, 14, 18, null],
                borderColor: '#6366f1',
                borderWidth: 3,
                pointBackgroundColor: '#22d3ee',
                pointRadius: 5,
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    };

    mainChart = new Chart(mainCtx, JSON.parse(JSON.stringify(chartConfig)));
    
    const miniConfig = JSON.parse(JSON.stringify(chartConfig));
    miniConfig.options.scales.y.display = false;
    miniConfig.options.scales.x.display = false;
    miniChart = new Chart(miniCtx, miniConfig);
}

// --- Helpers ---

function addLog(tag, text, tagClass) {
    const log = document.getElementById('activity-log');
    const time = new Date().toLocaleTimeString();
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-tag ${tagClass}">${tag}</span>
        <span class="log-text">${text}</span>
    `;
    
    log.prepend(entry);
    if (log.children.length > 50) log.lastChild.remove();
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.life = Math.random() * 1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(99, 102, 241, ${this.life * 0.2})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 50; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    animate();
}
