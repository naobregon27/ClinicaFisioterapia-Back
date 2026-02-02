import Notificacion from '../models/Notificacion.js';
import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de gestión de notificaciones
 */
class NotificacionService {
  /**
   * Crear una notificación
   */
  static async crearNotificacion(datos) {
    try {
      const notificacion = await Notificacion.crearNotificacion({
        usuarioId: datos.usuarioId,
        tipo: datos.tipo,
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        datos: datos.datos || {},
        prioridad: datos.prioridad || 'media',
        fechaExpiracion: datos.fechaExpiracion || null,
      });

      if (!notificacion) {
        throw new ErrorResponse('Error al crear notificación', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      return {
        success: true,
        message: 'Notificación creada exitosamente',
        data: { notificacion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  static async obtenerNotificaciones(usuarioId, opciones = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        leida = null,
        tipo = null,
        prioridad = null,
      } = opciones;

      const query = { usuario: usuarioId };

      // Filtro por estado de lectura
      if (leida !== null) {
        query.leida = leida === 'true';
      }

      // Filtro por tipo
      if (tipo) {
        query.tipo = tipo;
      }

      // Filtro por prioridad
      if (prioridad) {
        query.prioridad = prioridad;
      }

      // Excluir notificaciones expiradas
      query.$or = [
        { fechaExpiracion: null },
        { fechaExpiracion: { $gt: new Date() } },
      ];

      const skip = (page - 1) * limit;

      const [notificaciones, total] = await Promise.all([
        Notificacion.find(query)
          .sort('-createdAt')
          .skip(skip)
          .limit(limit)
          .populate('datos.pacienteId', 'nombre apellido dni')
          .populate('datos.sesionId', 'fecha horaEntrada estado')
          .lean(),
        Notificacion.countDocuments(query),
      ]);

      return {
        success: true,
        data: {
          notificaciones,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener notificaciones no leídas de un usuario
   */
  static async obtenerNotificacionesNoLeidas(usuarioId) {
    try {
      const notificaciones = await Notificacion.find({
        usuario: usuarioId,
        leida: false,
        $or: [
          { fechaExpiracion: null },
          { fechaExpiracion: { $gt: new Date() } },
        ],
      })
        .sort('-createdAt')
        .limit(50)
        .populate('datos.pacienteId', 'nombre apellido')
        .populate('datos.sesionId', 'fecha horaEntrada')
        .lean();

      const cantidadNoLeidas = await Notificacion.countDocuments({
        usuario: usuarioId,
        leida: false,
        $or: [
          { fechaExpiracion: null },
          { fechaExpiracion: { $gt: new Date() } },
        ],
      });

      return {
        success: true,
        data: {
          notificaciones,
          cantidadNoLeidas,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async marcarComoLeida(notificacionId, usuarioId) {
    try {
      const notificacion = await Notificacion.findOne({
        _id: notificacionId,
        usuario: usuarioId,
      });

      if (!notificacion) {
        throw new ErrorResponse('Notificación no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      await notificacion.marcarComoLeida();

      return {
        success: true,
        message: 'Notificación marcada como leída',
        data: { notificacion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  static async marcarTodasComoLeidas(usuarioId) {
    try {
      const resultado = await Notificacion.updateMany(
        {
          usuario: usuarioId,
          leida: false,
        },
        {
          $set: {
            leida: true,
            fechaLectura: new Date(),
          },
        }
      );

      return {
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
        data: { actualizadas: resultado.modifiedCount },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar notificación
   */
  static async eliminarNotificacion(notificacionId, usuarioId) {
    try {
      const notificacion = await Notificacion.findOneAndDelete({
        _id: notificacionId,
        usuario: usuarioId,
      });

      if (!notificacion) {
        throw new ErrorResponse('Notificación no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      return {
        success: true,
        message: 'Notificación eliminada exitosamente',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generar notificaciones automáticas para sesiones próximas
   */
  static async generarNotificacionesSesionesProximas() {
    try {
      const ahora = new Date();
      const mañana = new Date(ahora);
      mañana.setDate(mañana.getDate() + 1);
      mañana.setHours(23, 59, 59, 999);

      // Buscar sesiones programadas para mañana
      const sesionesProximas = await Sesion.find({
        fecha: { $gte: ahora, $lte: mañana },
        estado: 'programada',
      })
        .populate('paciente', 'nombre apellido')
        .populate('profesional', 'nombre apellido')
        .lean();

      const notificaciones = [];

      for (const sesion of sesionesProximas) {
        // Notificación para el profesional
        notificaciones.push({
          usuario: sesion.profesional._id,
          tipo: 'sesion_proxima',
          titulo: 'Sesión programada para mañana',
          mensaje: `Tienes una sesión con ${sesion.paciente.nombre} ${sesion.paciente.apellido} mañana a las ${sesion.horaEntrada || 'horario pendiente'}`,
          datos: {
            pacienteId: sesion.paciente._id,
            sesionId: sesion._id,
            fecha: sesion.fecha,
            url: `/sesiones/${sesion._id}`,
          },
          prioridad: 'alta',
          fechaExpiracion: new Date(sesion.fecha.getTime() + 24 * 60 * 60 * 1000), // Expira 24h después de la sesión
        });
      }

      if (notificaciones.length > 0) {
        await Notificacion.crearNotificacionesMultiples(notificaciones);
      }

      return {
        success: true,
        message: `${notificaciones.length} notificaciones generadas`,
        data: { cantidad: notificaciones.length },
      };
    } catch (error) {
      console.error('Error al generar notificaciones de sesiones próximas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generar notificaciones para pagos pendientes
   */
  static async generarNotificacionesPagosPendientes() {
    try {
      const sesionesConPagoPendiente = await Sesion.find({
        'pago.pagado': false,
        estado: 'realizada',
        fecha: { $lte: new Date() }, // Solo sesiones pasadas
      })
        .populate('paciente', 'nombre apellido')
        .populate('profesional', 'nombre apellido')
        .lean();

      const notificaciones = [];

      for (const sesion of sesionesConPagoPendiente) {
        // Notificar a todos los usuarios con rol admin o empleado
        // Por simplicidad, notificamos al profesional
        notificaciones.push({
          usuario: sesion.profesional._id,
          tipo: 'pago_pendiente',
          titulo: 'Pago pendiente',
          mensaje: `El paciente ${sesion.paciente.nombre} ${sesion.paciente.apellido} tiene un pago pendiente de $${sesion.pago.monto}`,
          datos: {
            pacienteId: sesion.paciente._id,
            sesionId: sesion._id,
            monto: sesion.pago.monto,
            fecha: sesion.fecha,
            url: `/sesiones/${sesion._id}`,
          },
          prioridad: 'media',
        });
      }

      if (notificaciones.length > 0) {
        await Notificacion.crearNotificacionesMultiples(notificaciones);
      }

      return {
        success: true,
        message: `${notificaciones.length} notificaciones de pagos pendientes generadas`,
        data: { cantidad: notificaciones.length },
      };
    } catch (error) {
      console.error('Error al generar notificaciones de pagos pendientes:', error);
      return { success: false, error: error.message };
    }
  }
}

export default NotificacionService;
