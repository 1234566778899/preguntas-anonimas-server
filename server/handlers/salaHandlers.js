const registrarEventosSala = (io, socket, salas) => {
  
  socket.on('enviar-nombre', (data) => {
    const { codigo, name } = data;
    
    console.log('\n' + '='.repeat(50));
    console.log(`👤 "${name}" intenta unirse a sala ${codigo}`);
    console.log(`   Socket ID: ${socket.id}`);

    socket.join(codigo);
    socket.sala = codigo;

    // Crear sala si no existe
    if (!salas.has(codigo)) {
      const Sala = require('../models/Sala');
      salas.set(codigo, new Sala(codigo));
      console.log(`🆕 Sala ${codigo} creada`);
    }

    const sala = salas.get(codigo);

    // Verificar si la partida está en curso
    if (sala.enJuego) {
      console.log(`❌ Partida en curso - Rechazado`);
      console.log('='.repeat(50) + '\n');
      socket.emit('en-juego');
      return;
    }

    // Verificar si este MISMO socket ya está en la sala
    const usuarioExistente = sala.obtenerUsuario(socket.id);
    
    if (usuarioExistente) {
      console.log(`♻️ Socket ya existe en sala`);
      console.log(`   Nombre anterior: "${usuarioExistente.name}"`);
      console.log(`   Nombre nuevo: "${name}"`);
      
      // Si cambió el nombre, verificar que el nuevo no esté usado
      if (usuarioExistente.name !== name) {
        const otroConMismoNombre = sala.users.find(
          u => u.name === name && u.id !== socket.id
        );
        
        if (otroConMismoNombre) {
          console.log(`❌ Nombre "${name}" ya usado por otro usuario`);
          console.log('='.repeat(50) + '\n');
          socket.emit('nombre-repetido');
          return;
        }
        
        // Actualizar nombre
        usuarioExistente.name = name;
        console.log(`✅ Nombre actualizado a "${name}"`);
      }
      
      console.log(`✅ Usuario reconectado exitosamente`);
      console.log('='.repeat(50) + '\n');
      
      io.to(codigo).emit('lista-usuarios', sala.users);
      
      if (usuarioExistente.esAdmin) {
        socket.emit('admin-asignado');
      }
      
      return;
    }

    // Es un socket NUEVO, verificar nombre duplicado
    const otroUsuarioConMismoNombre = sala.users.find(u => u.name === name);
    
    if (otroUsuarioConMismoNombre) {
      console.log(`❌ Nombre "${name}" ya existe`);
      console.log(`   Usado por socket: ${otroUsuarioConMismoNombre.id}`);
      console.log('='.repeat(50) + '\n');
      socket.emit('nombre-repetido');
      return;
    }

    // TODO OK - Agregar nuevo usuario
    const usuario = sala.agregarUsuario(socket.id, name);
    
    console.log(`✅ "${name}" agregado exitosamente`);
    console.log(`   Admin: ${usuario.esAdmin}`);
    console.log(`   Total usuarios: ${sala.users.length}`);
    console.log('='.repeat(50) + '\n');

    // Notificar si es admin
    if (usuario.esAdmin) {
      socket.emit('admin-asignado');
    }

    // Enviar lista actualizada de usuarios
    io.to(codigo).emit('lista-usuarios', sala.users);
  });

  socket.on('empezar', () => {
    const codigo = socket.sala;
    if (!codigo) return;

    const sala = salas.get(codigo);
    if (!sala) return;

    const usuario = sala.obtenerUsuario(socket.id);
    if (!usuario || !usuario.esAdmin) {
      console.log(`❌ Usuario ${socket.id} no es admin`);
      return;
    }

    if (sala.users.length < 2) {
      console.log(`❌ Se necesitan al menos 2 jugadores`);
      return;
    }

    sala.enJuego = true;
    sala.fase = 'preguntas';
    console.log(`\n🎮 PARTIDA INICIADA en sala ${codigo}`);
    console.log(`   Jugadores: ${sala.users.length}\n`);

    io.to(codigo).emit('empezar');
  });

  socket.on('reiniciar', () => {
    const codigo = socket.sala;
    if (!codigo) return;

    const sala = salas.get(codigo);
    if (!sala) return;

    const usuario = sala.obtenerUsuario(socket.id);
    if (!usuario || !usuario.esAdmin) return;

    sala.reiniciar();
    console.log(`🔄 Sala ${codigo} reiniciada\n`);

    io.to(codigo).emit('reiniciar');
  });

  socket.on('disconnect', () => {
    const codigo = socket.sala;
    if (!codigo) return;

    const sala = salas.get(codigo);
    if (!sala) return;

    const usuario = sala.obtenerUsuario(socket.id);
    const nombreUsuario = usuario?.name || 'Desconocido';

    const nuevoAdminId = sala.eliminarUsuario(socket.id);
    
    console.log(`\n👋 DESCONEXIÓN`);
    console.log(`   Usuario: "${nombreUsuario}"`);
    console.log(`   Socket: ${socket.id}`);
    console.log(`   Sala: ${codigo}`);

    if (sala.isEmpty()) {
      salas.delete(codigo);
      console.log(`🗑️ Sala ${codigo} eliminada (vacía)\n`);
      return;
    }

    console.log(`   Usuarios restantes: ${sala.users.length}`);

    if (nuevoAdminId) {
      const nuevoAdmin = sala.obtenerUsuario(nuevoAdminId);
      console.log(`👑 Nuevo admin: "${nuevoAdmin?.name}"`);
      io.to(nuevoAdminId).emit('admin-asignado');
    }
    
    console.log('\n');

    io.to(codigo).emit('lista-usuarios', sala.users);
  });
};

module.exports = registrarEventosSala;
