const registrarEventosRespuestas = (io, socket, salas) => {
  
  socket.on('enviar-respuestas', (respuestas) => {
    const codigo = socket.sala;
    if (!codigo) return;

    const sala = salas.get(codigo);
    if (!sala) return;

    sala.agregarRespuestas(socket.id, respuestas);
    console.log(`✍️ Respuestas recibidas en sala ${codigo}`);

    // Verificar si todos enviaron
    if (sala.todasRespuestasEnviadas()) {
      sala.fase = 'votacion';
      console.log(`✅ Todas las respuestas enviadas en sala ${codigo}`);
      
      // Preparar datos para votación
      const datosVotacion = sala.prepararDatosVotacion();
      io.to(codigo).emit('iniciar-votacion', datosVotacion);
    } else {
      const pendientes = sala.respuestasPendientes();
      io.to(codigo).emit('cantidad-respuestas', pendientes);
      console.log(`⏳ ${pendientes} respuestas pendientes en sala ${codigo}`);
    }
  });
};

module.exports = registrarEventosRespuestas;
