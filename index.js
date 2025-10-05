require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://preguntas-anonimas-web.vercel.app', 'http://192.168.18.8:3000'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

const registrarEventosSala = require('./handlers/salaHandlers');
const registrarEventosPreguntas = require('./handlers/preguntaHandlers');
const registrarEventosRespuestas = require('./handlers/respuestaHandlers');
const registrarEventosVotacion = require('./handlers/votacionHandlers');

const port = process.env.PORT || 4000;
const salas = new Map();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    nombre: 'Preguntas Anónimas API v3.0',
    version: '2.0.0',
    salasActivas: salas.size,
  });
});

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  registrarEventosSala(io, socket, salas);
  registrarEventosPreguntas(io, socket, salas);
  registrarEventosRespuestas(io, socket, salas);
  registrarEventosVotacion(io, socket, salas);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

server.listen(port, () => {
  console.log('\n🚀 Servidor ejecutándose en puerto:', port);
});