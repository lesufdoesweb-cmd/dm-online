# Socket.IO Architecture Migration Plan

## Background & Motivation
The current architecture uses PeerJS for direct peer-to-peer communication during gameplay and Gun for decentralized matchmaking. Peer connections can be flaky depending on NATs and network conditions. Switching to a direct server-client architecture using Socket.IO will dramatically improve connection reliability and give us a central source of truth for matchmaking and game state relay.

## Scope & Impact
- **Lobby & Matchmaking:** Replace Gun with Socket.IO rooms/events.
- **Gameplay:** Replace PeerJS with Socket.IO for real-time game state synchronization.
- **Server:** Create a new `server.cjs` (replacing `relay.cjs`) that hosts the Socket.IO server.
- **Client:** Update `App.jsx`, `useGameLogic.js`, and potentially other UI components to use `socket.io-client` instead of `peerjs` and `gun`.
- **Infrastructure:** Set up the Node.js Socket.IO server on a DigitalOcean droplet.

## Proposed Solution

1. **Server Setup (`server.cjs`)**
   - Initialize an Express/HTTP server with Socket.IO.
   - Implement event handlers for matchmaking: `create_room`, `join_room`, `leave_room`, `get_rooms`.
   - Implement event handlers for gameplay relay: `game_action` (broadcasting state or actions between the two players in a room).
   - Handle disconnects to notify the other player gracefully.

2. **Client Refactor (`src/`)**
   - Install `socket.io-client`.
   - Remove `peerjs` and `gun` dependencies from `package.json`.
   - **`App.jsx`**:
     - Remove Gun initialization and PeerJS instantiation.
     - Initialize `socket.io-client` connecting to the new server.
     - Refactor Lobby to fetch rooms from the Socket.IO server and listen for new room broadcasts.
   - **`useGameLogic.js`**:
     - Replace the `conn.send(...)` and `conn.on('data', ...)` with `socket.emit('game_action', ...)` and `socket.on('game_action', ...)`.
     - Manage player host/client roles based on who created the room vs who joined.

3. **DigitalOcean Deployment**
   - Provision a standard Ubuntu Droplet.
   - Install Node.js and PM2.
   - Clone the repository (or copy server files).
   - Use PM2 to run `server.cjs` on port 8765.
   - (Optional/Recommended) Set up Nginx as a reverse proxy with Let's Encrypt for WSS (WebSocket Secure) to ensure compatibility with HTTPS front-end.

## Phased Implementation Plan
- **Phase 1: Server Implementation:** Create the `server.cjs` with all necessary Socket.IO logic for matchmaking and gameplay relay.
- **Phase 2: Client Migration:** Install `socket.io-client`, refactor `App.jsx` and `useGameLogic.js`, and remove old dependencies (`peerjs`, `gun`).
- **Phase 3: Local Testing:** Run the server locally and connect two local clients to ensure matchmaking and gameplay work seamlessly.
- **Phase 4: DigitalOcean Setup:** Provide the step-by-step commands to configure the droplet, PM2, and Nginx.

## Verification
- Players can create and list rooms instantly.
- Players can join rooms without connection failures.
- Game actions sync smoothly without WebRTC ICE candidate issues.
- Disconnects are properly handled and communicated to the remaining player.

## Alternatives Considered
- **WebRTC Turn Server:** We could have hosted a TURN server for PeerJS to improve reliability, but Socket.IO provides a simpler and more robust architecture for this type of card game, additionally giving us centralized matchmaking.