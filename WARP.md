# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

- Install deps: npm install
- Configure env (required): copy .env.example to .env and set values (MONGO_URI, JWT_SECRET≥32 chars, PORT, etc.)
- Start dev server (Express + Socket.IO via nodemon): npm start
- Start without nodemon: node index.js
- Health check: curl http://localhost:${PORT:-5000}/api/v1/health
- Lint: not configured in this repo
- Tests: not configured (package.json scripts.test is a placeholder)

Notes
- Requires a running MongoDB instance reachable at MONGO_URI.
- Logs are written to logs/error.log and logs/combined.log (ensure logs/ exists or create it).

## High-level architecture

Runtime stack
- Node.js (CommonJS) with Express for HTTP, Socket.IO for realtime, MongoDB via Mongoose.

Entry and server composition
- index.js: process/bootstrap, env validation, Mongo connect, creates HTTP server, attaches Socket.IO, initializes chat sockets, starts server, graceful shutdown. Exposes io on the Express app via app.set('io', io) for emissions from HTTP routes.
- app.js: Express app factory and middleware/route wiring; also serves media from /uploads with Range support.

HTTP layer (REST)
- Route prefixing done in app.js under /api/v1/*.
- routes/* → controllers/* → services/* → models/* pattern.
- Central error middleware middleware/errorMiddleware.js structures JSON errors and logs with stack in development.
- Request logging via morgan to Winston.

AuthN/AuthZ
- JWT required for protected routes (middleware/authMiddleware.js).
- Token must be present in Authorization: Bearer ... and must exist in User.activeSessions; req.user is populated with id/role/phone.

Realtime chat (primary messaging path)
- Socket hub: socket/chatSocket.js; initialized from index.js.
- Auth on connection via JWT (handshake auth.token or Authorization header). On connect, user joins a personal room (userId) and is broadcast as online.
- Conversations use room-per-conversation model. Key client→server events: conversation:join/leave, message:send, typing:start/stop, message:read, conversation:mark-all-read. Server→client: conversation:joined, message:new, message:sent, notification:new-message, typing:user-typing/user-stopped, message:read-receipt, user:online/offline, error.
- HTTP routes in routes/chatRoutes.js provide fallback/aux ops (list conversations/messages, upload media, status changes, etc.). See api-doc.md or api.md for endpoint and event details; base REST path is /api/v1/chat.

Data layer
- MongoDB via Mongoose (config/db.js). Core chat collections: Conversation, Message, MediaMaster, User (see models/).
- Some models use soft-delete (mongoose-delete) elsewhere in the app.

Utilities & cross-cutting
- Environment validation with Zod (utils/envValidator.js) enforces required envs and minimum JWT secret length.
- Logging with Winston (utils/logger.js); morgan pipes HTTP logs to Winston.
- Async error handling via utils/asyncHandler.js; structured errors via utils/error.js.
- File uploads configured via utils/multerConfig.js (used by chat media uploads to uploads/chat/).

Static/media serving
- GET /uploads/:type/:filename streams files with proper MIME and partial content (Range) support and CORS headers.

Operational endpoints & docs
- Health: GET /api/v1/health → { status: "OK", timestamp }.
- Chat API and Socket.IO usage: api-doc.md and api.md in repo root document request/response shapes, flows, and sample clients.

Workflow guidance for agents
- Adding a new REST endpoint: create route in routes/, controller in controllers/, business logic in services/, and Mongoose changes in models/. Wire route in app.js under appropriate /api/v1 prefix.
- Emitting realtime events from HTTP handlers: use req.app.get('io') to access the Socket.IO server instance.
- Adding new env vars: update utils/envValidator.js schema to enforce presence/shape.
