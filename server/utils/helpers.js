
/**
 * Genera un código aleatorio de 4 dígitos
 */
const generarCodigo = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Desordena un array usando algoritmo Fisher-Yates
 */
const desordenarArray = (array) => {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

/**
 * Valida que un código tenga 4 dígitos
 */
const validarCodigo = (codigo) => {
  return /^\d{4}$/.test(codigo);
};

/**
 * Limpia y formatea un nombre de usuario
 */
const formatearNombre = (nombre) => {
  return nombre.trim().substring(0, 20);
};

module.exports = {
  generarCodigo,
  desordenarArray,
  validarCodigo,
  formatearNombre,
};