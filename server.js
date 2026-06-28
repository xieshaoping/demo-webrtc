const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    cleanupClient(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    cleanupClient(ws);
  });
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'create-room':
      createRoom(ws, data);
      break;
    case 'join-room':
      joinRoom(ws, data);
      break;
    case 'signal':
      forwardSignal(ws, data);
      break;
    case 'leave-room':
      leaveRoom(ws);
      break;
    default:
      console.log('Unknown message type:', data.type);
  }
}

function createRoom(ws, data) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    clients: [ws],
    host: ws
  };
  
  rooms.set(roomId, room);
  clients.set(ws, { roomId, isHost: true });
  
  ws.send(JSON.stringify({
    type: 'room-created',
    roomId: roomId
  }));
  
  console.log(`Room created: ${roomId}`);
}

function joinRoom(ws, data) {
  const roomId = data.roomId;
  const room = rooms.get(roomId);
  
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found'
    }));
    return;
  }
  
  if (room.clients.length >= 4) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room is full'
    }));
    return;
  }
  
  room.clients.push(ws);
  clients.set(ws, { roomId, isHost: false });
  
  ws.send(JSON.stringify({
    type: 'room-joined',
    roomId: roomId,
    isHost: false,
    peerCount: room.clients.length - 1
  }));
  
  room.clients.forEach((client) => {
    if (client !== ws) {
      client.send(JSON.stringify({
        type: 'peer-joined',
        peerCount: room.clients.length
      }));
    }
  });
  
  console.log(`Client joined room: ${roomId}`);
}

function forwardSignal(ws, data) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const room = rooms.get(clientInfo.roomId);
  if (!room) return;
  
  room.clients.forEach((client) => {
    if (client !== ws) {
      client.send(JSON.stringify({
        type: 'signal',
        from: clientInfo.isHost ? 'host' : 'peer',
        data: data.data
      }));
    }
  });
}

function leaveRoom(ws) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const room = rooms.get(clientInfo.roomId);
  if (!room) return;
  
  room.clients = room.clients.filter(client => client !== ws);
  
  if (room.clients.length === 0) {
    rooms.delete(clientInfo.roomId);
    console.log(`Room deleted: ${clientInfo.roomId}`);
  } else {
    room.clients.forEach((client) => {
      client.send(JSON.stringify({
        type: 'peer-left',
        peerCount: room.clients.length
      }));
    });
    console.log(`Client left room: ${clientInfo.roomId}`);
  }
  
  clients.delete(ws);
}

function cleanupClient(ws) {
  leaveRoom(ws);
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});