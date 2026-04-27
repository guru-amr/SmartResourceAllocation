const { isSafe } = require('./bankers');

const available = [3, 3, 2];
const max = [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
];
const allocation = [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
];

const result = isSafe(available, max, allocation);
console.log('Safe State Test:', result.safe);
console.log('Safe Sequence:', result.sequence);

if (result.safe && result.sequence.length === 5) {
    console.log('TEST PASSED');
} else {
    console.log('TEST FAILED');
}
