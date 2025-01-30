const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = app.listen(process.env.PORT || 3001);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Track connected users
const users = new Map();

io.on('connection', socket => {
  socket.on('wallet-connected', data => {
    users.set(socket.id, data);
    io.emit('users-updated', Array.from(users.values()));
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    io.emit('users-updated', Array.from(users.values()));
  });
}); 