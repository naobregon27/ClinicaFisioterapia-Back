/**
 * Wrapper para funciones asíncronas que captura errores automáticamente
 * Evita tener que escribir try-catch en cada controlador
 * @param {Function} fn - Función asíncrona a ejecutar
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;


