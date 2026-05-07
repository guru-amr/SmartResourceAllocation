# SmartResourceAllocation (NexusAlloc)

A smart resource allocation system using the **Banker's Algorithm** for deadlock avoidance, with an **ML-powered prediction engine** built on Python (Flask + Scikit-Learn) and a **Node.js/Express** backend connected to **MySQL**.

---

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **ML Service**: Python, Flask, Scikit-Learn
- **Database**: MySQL
- **Containerization**: Docker, Docker Compose

---

## Features

- Banker's Algorithm for safe resource allocation
- Linear Regression-based resource usage prediction
- REST API for state management and resource requests
- Persistent logging via MySQL
- Fallback JS predictor if Python service is offline

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
# 1. Clone the repo
git clone https://github.com/guru-amr/SmartResourceAllocation.git
cd SmartResourceAllocation

# 2. Create your .env file
cp .env.example .env
# Edit .env with your credentials

# 3. Start all services
docker-compose up --build
```

Services will be available at:
- Node.js API → http://localhost:3000
- Python ML Service → http://localhost:5000
- Frontend → open `index.html` in browser

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/state` | Get current resource state |
| POST | `/api/request` | Request resource allocation |
| GET | `/api/predict` | Get ML-based usage prediction |

### Example Request
```json
POST /api/request
{
  "processId": 0,
  "request": [1, 0, 2]
}
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
PORT=3000
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=miniproject
```

---

## Project Structure

```
├── server.js          # Express API server
├── bankers.js         # Banker's Algorithm
├── ml_engine.js       # JS fallback predictor
├── ml_service.py      # Python Flask ML service
├── db.js              # MySQL connection & init
├── index.html         # Frontend UI
├── script.js          # Frontend logic
├── style.css          # Styles
├── Dockerfile.node    # Node.js Docker image
├── Dockerfile.python  # Python Docker image
└── docker-compose.yml # Multi-service orchestration
```

---

## License

MIT
