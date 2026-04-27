from flask import Flask, request, jsonify
import numpy as np
from sklearn.linear_model import LinearRegression
import json

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predicts next resource usage using Scikit-Learn's Linear Regression.
    Expects JSON: { "data": [ {"time": 1, "usage": 10}, ... ] }
    """
    try:
        req_data = request.get_json()
        history = req_data.get('data', [])
        
        if len(history) < 2:
            return jsonify({"error": "Insufficient data for prediction"}), 400

        # Prepare data for Scikit-Learn
        X = np.array([item['time'] for item in history]).reshape(-1, 1)
        y = np.array([item['usage'] for item in history])

        # Training the model
        model = LinearRegression()
        model.fit(X, y)

        # Predict next time step
        next_time = X[-1][0] + 1
        prediction = model.predict([[next_time]])

        return jsonify({
            "predictedUsage": float(prediction[0]),
            "model_type": "Scikit-Learn Linear Regression",
            "next_time_step": int(next_time)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("NexusAlloc Python ML Service running on http://localhost:5000")
    app.run(port=5000)
