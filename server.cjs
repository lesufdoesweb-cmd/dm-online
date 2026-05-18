const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const port = 8765;

// State
const rooms = new Map();
let decks = {};

// Load decks
const DECKS_FILE = path.join(__dirname, 'community_decks.json');
if (fs.existsSync(DECKS_FILE)) {
    try {
        decks = JSON.parse(fs.readFileSync(DECKS_FILE, 'utf8'));
    } catch(e) {}
}

const saveDecks = () => {
    fs.writeFileSync(DECKS_FILE, JSON.stringify(decks));
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Decks events
    socket.emit('decks_update', Object.values(decks));

    socket.on('save_deck', (deckData) => {
        const id = deckData.gunId || Math.random().toString(36).substr(2, 9);
        decks[id] = { ...deckData, gunId: id };
        saveDecks();
        io.emit('decks_update', Object.values(decks));
    });

    socket.on('delete_deck', (deckId) => {
        if (decks[deckId]) {
            delete decks[deckId];
            saveDecks();
            io.emit('decks_update', Object.values(decks));
        }
    });

    socket.on('increment_deck_play', (deckId) => {
        if (decks[deckId]) {
            decks[deckId].playedCount = (decks[deckId].playedCount || 0) + 1;
            saveDecks();
            io.emit('decks_update', Object.values(decks));
        }
    });

    // Matchmaking events
    socket.on('get_rooms', () => {
        broadcastRooms();
    });

    socket.on('create_room', (roomData) => {
        socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms.set(roomId, { host: socket.id, client: null, createdAt: Date.now(), format: roomData?.format || 'CLASSIC', hostName: roomData?.name || 'Player' });
        socket.join(roomId);
        socket.emit('room_created', roomId);
        broadcastRooms();
    });

    socket.on('join_room', (roomId, playerData) => {
        const room = rooms.get(roomId);
        if (room) {
            if (!room.client) {
                room.client = socket.id;
                socket.join(roomId);
                socket.emit('room_joined', roomId);
                socket.to(room.host).emit('player_joined', { id: socket.id, name: playerData?.name || 'Opponent', format: playerData?.format || 'CLASSIC' });
                broadcastRooms();
            } else {
                socket.emit('room_error', 'Room is full');
            }
        } else {
            socket.emit('room_error', 'Room not found');
        }
    });
    
    socket.on('accept_join', (clientId) => {
        socket.to(clientId).emit('join_accepted');
    });

    socket.on('reject_join', (clientId, reason) => {
        socket.to(clientId).emit('join_rejected', reason);
        // Clean up client from room
        rooms.forEach((roomData, roomId) => {
            if (roomData.host === socket.id && roomData.client === clientId) {
                roomData.client = null;
                const clientSocket = io.sockets.sockets.get(clientId);
                if (clientSocket) clientSocket.leave(roomId);
            }
        });
        broadcastRooms();
    });

    // Gameplay relay events
    socket.on('game_action', (data) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (roomId) socket.to(roomId).emit('game_action', data);
    });

    const checkRoomStatus = (roomId, room) => {
        const hostSocket = io.sockets.sockets.get(room.host);
        const clientSocket = io.sockets.sockets.get(room.client);
        
        if (hostSocket && clientSocket) {
            if (room.disconnectTimer) {
                clearTimeout(room.disconnectTimer);
                room.disconnectTimer = null;
            }
        } else {
            if (!room.disconnectTimer) {
                room.disconnectTimer = setTimeout(() => {
                    io.to(roomId).emit('opponent_disconnected');
                    rooms.delete(roomId);
                    broadcastRooms();
                }, 60000); // 60s grace period
            }
        }
    };

    socket.on('leave_room', () => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (roomId) {
            socket.leave(roomId);
            const room = rooms.get(roomId);
            if (room) {
                if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
                socket.to(roomId).emit('opponent_disconnected');
                rooms.delete(roomId);
                broadcastRooms();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        rooms.forEach((roomData, roomId) => {
            if (roomData.host === socket.id || roomData.client === socket.id) {
                if (roomData.client) {
                    checkRoomStatus(roomId, roomData);
                } else {
                    // Lobby waiting, delete instantly
                    rooms.delete(roomId);
                    broadcastRooms();
                }
            }
        });
    });

    socket.on('rejoin_room', (roomId, role) => {
        const room = rooms.get(roomId);
        if (room) {
            if (role === 'host') {
                room.host = socket.id;
            } else {
                room.client = socket.id;
            }
            socket.join(roomId);
            socket.emit('rejoin_accepted', roomId);
            socket.to(roomId).emit('opponent_reconnected');
            
            checkRoomStatus(roomId, room);
            broadcastRooms();
        } else {
            socket.emit('room_error', 'Game session expired or invalid.');
        }
    });

    function broadcastRooms() {
        const availableRooms = [];
        rooms.forEach((roomData, roomId) => {
            if (!roomData.client) {
                availableRooms.push({ id: roomId, host: roomData.host, name: roomData.hostName, format: roomData.format });
            }
        });
        io.emit('rooms_list', availableRooms);
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Socket.IO server is running at http://0.0.0.0:${port}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});