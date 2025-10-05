require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://preguntas-anonimas-web.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// SOLO IMPORTAR HANDLERS
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
    version: '3.0.0',
    salasActivas: salas.size,
    totalUsuarios: Array.from(salas.values()).reduce(
      (sum, sala) => sum + sala.users.length,
      0
    ),
    timestamp: new Date().toISOString(),
  });
});

app.get('/stats', (req, res) => {
  const stats = {
    salasActivas: salas.size,
    salas: Array.from(salas.values()).map((sala) => sala.toJSON()),
  };
  res.json(stats);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// ✅ SOLO ESTO en el connection
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // SOLO registrar handlers importados
  registrarEventosSala(io, socket, salas);
  registrarEventosPreguntas(io, socket, salas);
  registrarEventosRespuestas(io, socket, salas);
  registrarEventosVotacion(io, socket, salas);

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

server.listen(port, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🎮 SERVIDOR DE PREGUNTAS ANÓNIMAS V2');
  console.log('='.repeat(50));
  console.log(`🚀 Servidor ejecutándose en puerto: ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${port}`);
  console.log(`📡 Socket.io listo para conexiones`);
  console.log('='.repeat(50) + '\n');
});

process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});