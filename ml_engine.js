/**
 * Custom Machine Learning Engine
 * Implementation of Simple Linear Regression for Resource Demand Prediction.
 * demonstrates DAA (Design and Analysis of Algorithms) concepts.
 */

class ResourcePredictor {
    constructor() {
        this.slope = 0;
        this.intercept = 0;
    }

    /**
     * Train the model using historical resource usage data.
     * @param {Array} data - Array of { time, usage } objects
     */
    train(data) {
        if (data.length < 2) return;

        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (const point of data) {
            sumX += point.time;
            sumY += point.usage;
            sumXY += point.time * point.usage;
            sumX2 += point.time * point.time;
        }

        const denominator = (n * sumX2 - sumX * sumX);
        if (denominator === 0) return;

        this.slope = (n * sumXY - sumX * sumY) / denominator;
        this.intercept = (sumY - this.slope * sumX) / n;
    }

    /**
     * Predict future usage based on input time.
     * @param {number} time - the future time step
     */
    predict(time) {
        return Math.max(0, this.slope * time + this.intercept);
    }
}

module.exports = ResourcePredictor;
