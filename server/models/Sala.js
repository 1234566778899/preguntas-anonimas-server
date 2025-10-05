class Sala {
  constructor(codigo) {
    this.codigo = codigo;
    this.users = [];
    this.admin = null; // ID del admin
    this.preguntas = [];
    this.respuestas = [];
    this.votos = [];
    this.enJuego = false;
    this.fase = 'espera'; // 'espera', 'preguntas', 'respuestas', 'votacion', 'resultados'
  }

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================

  agregarUsuario(socketId, nombre) {
    const usuario = {
      id: socketId,
      name: nombre,
      esAdmin: false,
    };

    // Si es el primer usuario, hacerlo admin
    if (this.users.length === 0) {
      usuario.esAdmin = true;
      this.admin = socketId;
    }

    this.users.push(usuario);
    return usuario;
  }

  eliminarUsuario(socketId) {
    const index = this.users.findIndex((u) => u.id === socketId);
    if (index !== -1) {
      const usuario = this.users[index];
      this.users.splice(index, 1);

      // Si era el admin, asignar nuevo admin
      if (usuario.esAdmin && this.users.length > 0) {
        this.users[0].esAdmin = true;
        this.admin = this.users[0].id;
        return this.users[0].id; // Retornar nuevo admin
      }
    }
    return null;
  }

  obtenerUsuario(socketId) {
    return this.users.find((u) => u.id === socketId);
  }

  existeNombre(nombre) {
    return this.users.some((u) => u.name === nombre);
  }

  obtenerUsuariosPorIds(ids) {
    return this.users.filter((u) => ids.includes(u.id));
  }

  // ============================================
  // GESTIÓN DE PREGUNTAS
  // ============================================

  agregarPregunta(socketId, descripcion) {
    const pregunta = {
      id: socketId,
      description: descripcion,
      autor: this.obtenerUsuario(socketId)?.name,
    };
    this.preguntas.push(pregunta);
  }

  todasPreguntasEnviadas() {
    return this.preguntas.length === this.users.length;
  }

  preguntasPendientes() {
    return this.users.length - this.preguntas.length;
  }

  // ============================================
  // GESTIÓN DE RESPUESTAS
  // ============================================

  agregarRespuestas(socketId, respuestasObj) {
    this.respuestas.push({
      userId: socketId,
      respuestas: respuestasObj,
    });
  }

  todasRespuestasEnviadas() {
    return this.respuestas.length === this.users.length;
  }

  respuestasPendientes() {
    return this.users.length - this.respuestas.length;
  }

  // ============================================
  // GESTIÓN DE VOTACIÓN
  // ============================================

  agregarVotos(socketId, votosObj) {
    this.votos.push({
      userId: socketId,
      votos: votosObj, // { 'respuestaId': 'usuarioId' }
    });
  }

  todosVotosEnviados() {
    return this.votos.length === this.users.length;
  }

  votosPendientes() {
    return this.users.length - this.votos.length;
  }

  // ============================================
  // PREPARAR DATOS PARA VOTACIÓN
  // ============================================

  prepararDatosVotacion() {
    const datosVotacion = [];

    for (let pregunta of this.preguntas) {
      const respuestasParaPregunta = [];

      // Recopilar todas las respuestas para esta pregunta
      for (let userRespuesta of this.respuestas) {
        const respuesta = userRespuesta.respuestas[pregunta.id];
        if (respuesta) {
          respuestasParaPregunta.push({
            texto: respuesta,
            autorId: userRespuesta.userId,
            id: `${pregunta.id}-${userRespuesta.userId}`,
          });
        }
      }

      // Desordenar respuestas para mantener anonimato
      const respuestasDesordenadas = this.desordenarArray(respuestasParaPregunta);

      datosVotacion.push({
        id: pregunta.id,
        pregunta: pregunta.description,
        respuestas: respuestasDesordenadas.map(r => r.texto),
        respuestasCompletas: respuestasDesordenadas, // Para uso interno
      });
    }

    return datosVotacion;
  }

  // ============================================
  // CALCULAR RESULTADOS Y PUNTUACIONES
  // ============================================

  calcularResultados() {
    const resultados = [];
    const puntuaciones = new Map();

    // Inicializar puntuaciones
    this.users.forEach((u) => {
      puntuaciones.set(u.id, {
        id: u.id,
        nombre: u.name,
        esAdmin: u.esAdmin,
        puntos: 0,
        aciertos: 0,
      });
    });

    // Mapear respuestas por pregunta y usuario
    const respuestasPorPregunta = new Map();
    for (let pregunta of this.preguntas) {
      const respuestasMap = new Map();
      for (let userRespuesta of this.respuestas) {
        const respuesta = userRespuesta.respuestas[pregunta.id];
        if (respuesta) {
          respuestasMap.set(userRespuesta.userId, respuesta);
        }
      }
      respuestasPorPregunta.set(pregunta.id, respuestasMap);
    }

    // Procesar cada pregunta
    for (let pregunta of this.preguntas) {
      const respuestasMap = respuestasPorPregunta.get(pregunta.id);
      const respuestasConAutor = [];

      // Crear mapa de respuestas
      respuestasMap.forEach((texto, autorId) => {
        respuestasConAutor.push({
          texto,
          autor: this.obtenerUsuario(autorId)?.name || 'Anónimo',
          autorId,
        });
      });

      // Procesar votos para calcular puntuaciones
      for (let userVoto of this.votos) {
        const votosUsuario = userVoto.votos;

        // Revisar cada voto de este usuario
        for (let [respuestaId, usuarioVotado] of Object.entries(votosUsuario)) {
          // Encontrar el autor real de esta respuesta
          const [preguntaId, autorRealId] = respuestaId.split('-');
          
          if (preguntaId === pregunta.id) {
            // Si el voto coincide con el autor real
            if (usuarioVotado === autorRealId) {
              const puntuacion = puntuaciones.get(userVoto.userId);
              if (puntuacion) {
                puntuacion.puntos += 10;
                puntuacion.aciertos += 1;
              }
            }
          }
        }
      }

      resultados.push({
        id: pregunta.id,
        pregunta: pregunta.description,
        autor: pregunta.autor,
        respuestas: respuestasConAutor,
      });
    }

    return {
      resultados,
      puntuaciones: Array.from(puntuaciones.values()),
    };
  }

  // ============================================
  // REINICIAR SALA
  // ============================================

  reiniciar() {
    this.preguntas = [];
    this.respuestas = [];
    this.votos = [];
    this.enJuego = false;
    this.fase = 'espera';
  }

  // ============================================
  // UTILIDADES
  // ============================================

  desordenarArray(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  isEmpty() {
    return this.users.length === 0;
  }

  toJSON() {
    return {
      codigo: this.codigo,
      usuarios: this.users.length,
      admin: this.admin,
      enJuego: this.enJuego,
      fase: this.fase,
    };
  }
}

module.exports = Sala;