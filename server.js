const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./db');
const { isSafe } = require('./bankers');
const ResourcePredictor = require('./ml_engine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simulation State
let systemState = {
    available: [10, 5, 7], // CPU, RAM, Disk
    max: [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
    ],
    allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
    ]
};

const predictor = new ResourcePredictor();

// Route: Get current state
app.get('/api/state', (req, res) => {
    res.json(systemState);
});

// Route: Request Resource
app.post('/api/request', async (req, res) => {
    const { processId, request } = req.body; // e.g. { processId: 0, request: [1, 0, 2] }
    
    // Virtual simulation of the request
    let tempAvailable = [...systemState.available];
    let tempAllocation = systemState.allocation.map(row => [...row]);
    
    for (let i = 0; i < request.length; i++) {
        if (request[i] > tempAvailable[i]) {
            return res.json({ success: false, message: 'Resource unavailable.' });
        }
    }

    // Speculatively allocate
    for (let i = 0; i < request.length; i++) {
        tempAvailable[i] -= request[i];
        tempAllocation[processId][i] += request[i];
    }

    const { safe, sequence } = isSafe(tempAvailable, systemState.max, tempAllocation);

    if (safe) {
        systemState.available = tempAvailable;
        systemState.allocation = tempAllocation;
        
        // Log to DB
        try {
            await pool.query('INSERT INTO allocation_logs (process_id, resource_type, amount, status) VALUES (?, ?, ?, ?)', 
                [processId, 'ALL', request.join(','), 'GRANTED']);
        } catch (e) {}

        res.json({ success: true, message: 'Allocation successful.', sequence });
    } else {
        res.json({ success: false, message: 'Unsafe state detected. Request denied.', sequence: [] });
    }
});

// Route: Get Predictions
app.get('/api/predict', async (req, res) => {
    const mockData = [
        { time: 1, usage: 10 }, { time: 2, usage: 12 }, { time: 3, usage: 15 },
        { time: 4, usage: 14 }, { time: 5, usage: 18 }
    ];

    try {
        const pyResponse = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: mockData })
        });
        
        if (pyResponse.ok) {
            const pyData = await pyResponse.json();
            res.json(pyData);
        } else {
            // Fallback to internal JS predictor if Python service is down
            predictor.train(mockData);
            const prediction = predictor.predict(6);
            res.json({ predictedUsage: prediction, model_type: "Internal JS Fallback" });
        }
    } catch (e) {
        // Fallback
        predictor.train(mockData);
        const prediction = predictor.predict(6);
        res.json({ predictedUsage: prediction, model_type: "Internal JS Fallback (Service Offline)" });
    }
});

async function seedData() {
    try {
        // Seed allocation_logs
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM allocation_logs');
        if (rows[0].count === 0) {
            console.log('Seeding initial allocation logs...');
            await pool.query('INSERT INTO allocation_logs (process_id, resource_type, amount, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?)', 
                ['0', 'ALL', '0,1,0', 'GRANTED', '1', 'ALL', '2,0,0', 'GRANTED']);
        }

        // Seed resource_history for ML
        const [hRows] = await pool.query('SELECT COUNT(*) as count FROM resource_history');
        if (hRows[0].count === 0) {
            console.log('Seeding historical data for ML...');
            const values = [
                ['CPU', 10], ['CPU', 12], ['CPU', 15], ['CPU', 14], ['CPU', 18]
            ];
            await pool.query('INSERT INTO resource_history (resource_type, usage_value) VALUES ?', [values]);
        }
    } catch (e) {
        console.error('Seeding failed:', e.message);
    }
}

app.listen(PORT, async () => {
    console.log(`NexusAlloc Server running on http://localhost:${PORT}`);
    await initDB();
    await seedData();
});
