/**
 * Banker's Algorithm Implementation
 * Used for deadlock avoidance by checking if a resource request leads to a safe state.
 */

function isSafe(available, max, allocation) {
    const numProcesses = max.length;
    const numResources = available.length;

    let need = max.map((row, i) => row.map((val, j) => val - allocation[i][j]));
    let finish = new Array(numProcesses).fill(false);
    let work = [...available];
    let safeSequence = [];

    let count = 0;
    while (count < numProcesses) {
        let found = false;
        for (let p = 0; p < numProcesses; p++) {
            if (!finish[p]) {
                let j;
                for (j = 0; j < numResources; j++) {
                    if (need[p][j] > work[j]) break;
                }

                if (j === numResources) {
                    for (let k = 0; k < numResources; k++) {
                        work[k] += allocation[p][k];
                    }
                    safeSequence.push(p);
                    finish[p] = true;
                    found = true;
                    count++;
                }
            }
        }

        if (!found) {
            return { safe: false, sequence: [] };
        }
    }

    return { safe: true, sequence: safeSequence };
}

module.exports = { isSafe };
