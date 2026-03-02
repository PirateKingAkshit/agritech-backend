# Agritech Backend

Node.js + Express backend for the Agritech platform.  
It provides REST APIs, Socket.IO chat, MongoDB persistence, media serving, and utility import scripts.

## Tech Stack

-   Node.js (CommonJS)
-   Express 5
-   MongoDB + Mongoose
-   Socket.IO
-   JWT authentication
-   Firebase Admin (push notifications)
-   Winston + Morgan logging

## Project Structure

```text
agritech-backend/  app.js                 # Express app and routes  index.js               # Server entrypoint + Socket.IO init  config/                # DB and service configs  controllers/           # Request handlers  services/              # Business logic  models/                # Mongoose models  routes/                # API route modules  middleware/            # Auth + error middleware  socket/                # Socket.IO handlers  utils/                 # Shared utilities  script/                # Utility scripts
```

## Prerequisites

-   Node.js 18+ (recommended)
-   MongoDB instance

## Setup

1.  Install dependencies:

```bash
npm install
```

2.  Create environment file:

```bash
cp .env.example .env
```

3.  Update `.env` values for your environment.
    
4.  Start the backend:
    

```bash
npm start
```

Server default: `http://localhost:5000`

## Environment Variables

The app validates core env values at startup (`utils/envValidator.js`).

Required:

-   `MONGO_URI` (must be a valid MongoDB URL)
-   `JWT_SECRET` (minimum 32 characters)

Common:

-   `PORT` (default: `5000`)
-   `NODE_ENV` (`development` | `production` | `test`)
-   `CORS_ORIGIN` (default fallback: `*`)
-   `LOG_LEVEL` (default: `debug`)
-   `BASE_URL` (used for media/chat URLs)
-   `MANDI_API_KEY` (required for mandi import/integration)
-   `FRONTEND_URL` (used in Socket.IO CORS allowlist)

## API Base Path

All REST endpoints are mounted under:

```text
/api/v1
```

Health check:

```http
GET /api/v1/health
```

Main route groups:

-   `/users`
-   `/crop-master`
-   `/product-category-master`
-   `/product-master`
-   `/government-scheme`
-   `/media-master`
-   `/tutorial-master`
-   `/crop-sale-requests`
-   `/product-orders`
-   `/dashboard`
-   `/states`
-   `/districts`
-   `/markets`
-   `/commodities`
-   `/mandi-price`
-   `/recent-activities`
-   `/textToSpeech`
-   `/chat`

## Socket.IO (Chat)

Socket.IO is initialized in `index.js` on the same HTTP server as Express.  
CORS allows local frontend origins and `FRONTEND_URL` from `.env`.

## File Serving

Uploaded files are served through:

```http
GET /uploads/:type/:filename
```

Range requests are supported for media streaming.

## Utility Scripts

Run directly with Node when needed:

```bash
node mandiImportFromApi.js
node insertStatesAndDistricts.js
node migrateTutorialDescriptions.js
```

Cron requirement:

- Schedule `mandiImportFromApi.js` as a cron job to keep mandi data updated regularly.

## Notes

-   `config/serviceAccountKey.json` is required for Firebase push notifications and is intentionally gitignored.
-   `googleCred/` and `.env` are also gitignored; provide them locally per environment.
