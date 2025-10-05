const registrarEventosPreguntas = (io, socket, salas) => {
  
  socket.on('enviar-pregunta', (pregunta) => {
    const codigo = socket.sala;
    if (!codigo) return;

    const sala = salas.get(codigo);
    if (!sala) return;

    sala.agregarPregunta(socket.id, pregunta);
    console.log(`❓ Pregunta recibida en sala ${codigo}: "${pregunta}"`);

    // Verificar si todos enviaron
    if (sala.todasPreguntasEnviadas()) {
      sala.fase = 'respuestas';
      console.log(`✅ Todas las preguntas enviadas en sala ${codigo}`);
      io.to(codigo).emit('responder-preguntas', sala.preguntas);
    } else {
      const pendientes = sala.preguntasPendientes();
      io.to(codigo).emit('cantidad-preguntas', pendientes);
      console.log(`⏳ ${pendientes} preguntas pendientes en sala ${codigo}`);
    }
  });
};

module.exports = registrarEventosPreguntas;