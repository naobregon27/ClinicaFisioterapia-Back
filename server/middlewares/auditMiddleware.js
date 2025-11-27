import AuditoriaService from '../services/auditoriaService.js';

/**
 * Middleware para registrar acciones en el log de auditoría
 * Se puede usar como middleware después de una acción exitosa
 */
export const registrarAuditoria = (accion, recursoTipo = null) => {
  return async (req, res, next) => {
    // Guardar referencia a la función original de res.json
    const originalJson = res.json.bind(res);

    // Sobrescribir res.json para capturar la respuesta
    res.json = function (data) {
      // Solo registrar si la respuesta es exitosa (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300 && data.success !== false) {
        // Obtener información del recurso si está disponible
        let recurso = {};
        if (recursoTipo) {
          recurso = {
            tipo: recursoTipo,
            id: req.params.id || req.body.id || null,
            nombre: req.body.nombre || req.body.email || null,
          };
        } else {
          // Intentar detectar el tipo de recurso desde la ruta
          if (req.path.includes('/usuarios')) {
            recurso.tipo = 'usuario';
            recurso.id = req.params.id || req.body.id || null;
            recurso.nombre = req.body.email || req.body.nombre || null;
          } else if (req.path.includes('/pacientes')) {
            recurso.tipo = 'paciente';
            recurso.id = req.params.id || req.body.id || null;
            recurso.nombre = req.body.nombre || `${req.body.apellido}, ${req.body.nombre}` || null;
          } else if (req.path.includes('/sesiones')) {
            recurso.tipo = 'sesion';
            recurso.id = req.params.id || req.body.id || null;
          } else if (req.path.includes('/pagos-personal')) {
            recurso.tipo = 'pago_personal';
            recurso.id = req.params.id || req.body.id || null;
          }
        }

        // Generar descripción de la acción
        let descripcion = `${accion} ${recurso.tipo || 'recurso'}`;
        if (recurso.nombre) {
          descripcion += `: ${recurso.nombre}`;
        }

        // Registrar la acción de forma asíncrona (no bloquear la respuesta)
        if (req.user) {
          AuditoriaService.registrarAccion({
            usuarioId: req.user._id,
            accion: accion,
            recurso: recurso,
            descripcion: descripcion,
            datosAnteriores: req.body.datosAnteriores || null,
            datosNuevos: req.body,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            metodo: req.method,
            ruta: req.originalUrl || req.path,
            estado: 'exitoso',
            metadata: {
              statusCode: res.statusCode,
            },
          }).catch((err) => {
            // No hacer nada si falla el registro de auditoría
            console.error('Error al registrar auditoría:', err);
          });
        }
      }

      // Llamar a la función original
      return originalJson(data);
    };

    next();
  };
};

/**
 * Función helper para registrar auditoría manualmente desde controladores
 */
export const registrarAccionManual = async (req, accion, descripcion, recurso = {}, datosAnteriores = null, datosNuevos = null) => {
  if (!req.user) return null;

  return await AuditoriaService.registrarAccion({
    usuarioId: req.user._id,
    accion: accion,
    recurso: recurso,
    descripcion: descripcion,
    datosAnteriores: datosAnteriores,
    datosNuevos: datosNuevos,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    metodo: req.method,
    ruta: req.originalUrl || req.path,
    estado: 'exitoso',
  });
};



