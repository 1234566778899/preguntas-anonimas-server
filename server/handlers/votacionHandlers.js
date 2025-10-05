const registrarEventosVotacion = (io, socket, salas) => {
  
  socket.on('enviar-votos', (votos) => {
  const codigo = socket.sala;
  if (!codigo) return;

  const sala = salas.get(codigo);
  if (!sala) return;

  sala.agregarVotos(socket.id, votos);
  console.log(`🗳️ Votos recibidos en sala ${codigo}`);
  console.log(`   Total votos: ${sala.votos.length}`);
  console.log(`   Total usuarios: ${sala.users.length}`);

  if (sala.todosVotosEnviados()) {
    console.log('🎯 TODOS VOTARON, calculando resultados...');
    
    try {
      const { resultados, puntuaciones } = sala.calcularResultados();
      console.log('✅ Resultados calculados:', resultados);
      console.log('✅ Puntuaciones:', puntuaciones);
      
      io.to(codigo).emit('resultados', {
        resultados,
        puntuaciones,
      });
      console.log('📤 Evento "resultados" emitido');
    } catch (error) {
      console.error('❌ ERROR al calcular resultados:', error);
    }
  }
});
};

module.exports = registrarEventosVotacion;