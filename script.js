const API_BASE = 'http://localhost:3000/api';

// DOM Elements
const cpuFill = document.getElementById('cpu-fill');
const ramFill = document.getElementById('ram-fill');
const diskFill = document.getElementById('disk-fill');
const cpuVal = document.getElementById('cpu-val');
const ramVal = document.getElementById('ram-val');
const diskVal = document.getElementById('disk-val');
const processTableBody = document.querySelector('#process-table tbody');
const logMsg = document.getElementById('log-msg');
const predVal = document.getElementById('pred-val');

let chart;

async function fetchState() {
    try {
        const response = await fetch(`${API_BASE}/state`);
        const data = await response.json();
        updateUI(data);
    } catch (err) {
        console.error('Failed to fetch state', err);
    }
}

function updateUI(state) {
    // Update Resource Meters
    const totals = [10, 5, 7]; // Max system resources for scaling
    cpuFill.style.width = `${(state.available[0] / totals[0]) * 100}%`;
    ramFill.style.width = `${(state.available[1] / totals[1]) * 100}%`;
    diskFill.style.width = `${(state.available[2] / totals[2]) * 100}%`;

    cpuVal.innerText = state.available[0];
    ramVal.innerText = state.available[1];
    diskVal.innerText = state.available[2];

    // Update Table
    processTableBody.innerHTML = '';
    state.max.forEach((maxRow, i) => {
        const allocRow = state.allocation[i];
        const needRow = maxRow.map((v, j) => v - allocRow[j]);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>Process P${i}</td>
            <td>(${maxRow.join(', ')})</td>
            <td>(${allocRow.join(', ')})</td>
            <td>(${needRow.join(', ')})</td>
            <td><button class="btn-mini" onclick="fillRequest(${i}, [${needRow}])">Select</button></td>
        `;
        processTableBody.appendChild(tr);
    });
}

function fillRequest(pid, needs) {
    document.getElementById('req-pid').value = pid;
    document.getElementById('req-c').value = Math.min(1, needs[0]);
    document.getElementById('req-r').value = Math.min(1, needs[1]);
    document.getElementById('req-d').value = Math.min(1, needs[2]);
}

document.getElementById('btn-request').addEventListener('click', async () => {
    const pid = parseInt(document.getElementById('req-pid').value);
    const c = parseInt(document.getElementById('req-c').value) || 0;
    const r = parseInt(document.getElementById('req-r').value) || 0;
    const d = parseInt(document.getElementById('req-d').value) || 0;

    logMsg.innerText = 'Processing request...';
    logMsg.style.color = '#fff';

    try {
        const response = await fetch(`${API_BASE}/request`, {
            method: 'POST',
            header: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processId: pid, request: [c, r, d] })
        });
        const data = await response.json();

        if (data.success) {
            logMsg.innerText = `Success: ${data.message} Safe Seq: ${data.sequence.join(' -> ')}`;
            logMsg.style.color = '#10b981';
            fetchState();
        } else {
            logMsg.innerText = `Denied: ${data.message}`;
            logMsg.style.color = '#ef4444';
        }
    } catch (err) {
        logMsg.innerText = 'Server Error: Ensure backend is running.';
        logMsg.style.color = '#ef4444';
    }
});

async function initMLChart() {
    const ctx = document.getElementById('predictionChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['T-4', 'T-3', 'T-2', 'T-1', 'Now', 'Predicted'],
            datasets: [{
                label: 'Resource Demand',
                data: [10, 12, 15, 14, 18, null],
                borderColor: '#22d3ee',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(34, 211, 238, 0.1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    try {
        const res = await fetch(`${API_BASE}/predict`);
        const data = await res.json();
        predVal.innerHTML = `${data.predictedUsage.toFixed(2)} Units <br><small>Engine: ${data.model_type || 'Python'}</small>`;
        chart.data.datasets[0].data[5] = data.predictedUsage;
        chart.update();
    } catch (e) {}
}

// Initial Load
fetchState();
initMLChart();
setInterval(fetchState, 5000);
