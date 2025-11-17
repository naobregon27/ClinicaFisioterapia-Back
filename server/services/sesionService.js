import mongoose from 'mongoose';
import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de gestión de sesiones
 */
class SesionService {
  /**
   * Registrar una nueva sesión
   * @param {Object} datosSesion - Datos de la sesión
   * @param {String} profesionalId - ID del profesional
   * @returns {Promise<Object>}
   */
  static async registrarSesion(datosSesion, profesionalId) {
    try {
      // Verificar que el paciente existe
      const paciente = await Paciente.findById(datosSesion.paciente);
      
      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Obtener número de orden del día si no se proporciona
      if (!datosSesion.numeroOrden) {
        const fecha = datosSesion.fecha || new Date();
        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);

        const ultimaSesion = await Sesion.findOne({
          fecha: { $gte: inicioDia, $lte: finDia }
        }).sort('-numeroOrden').select('numeroOrden');

        datosSesion.numeroOrden = ultimaSesion ? ultimaSesion.numeroOrden + 1 : 1;
      }

      // Crear sesión
      const sesion = await Sesion.create({
        ...datosSesion,
        profesional: profesionalId,
      });

      // Poblar datos del paciente
      await sesion.populate('paciente', 'nombre apellido dni obraSocial');
      await sesion.populate('profesional', 'nombre apellido');

      return {
        success: true,
        message: 'Sesión registrada exitosamente',
        data: { sesion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener sesiones con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerSesiones(filtros = {}, opciones = {}) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        sortBy = '-fecha -numeroOrden',
        pacienteId,
        fecha,
        estado,
        pagado,
      } = opciones;

      // Construir query
      const query = { ...filtros };

      if (pacienteId) {
        query.paciente = pacienteId;
      }

      if (fecha) {
        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);
        query.fecha = { $gte: inicioDia, $lte: finDia };
      }

      if (estado) {
        query.estado = estado;
      }

      if (pagado !== undefined) {
        query['pago.pagado'] = pagado === 'true' || pagado === true;
      }

      // Calcular skip
      const skip = (page - 1) * limit;

      // Ejecutar query
      const [sesiones, total] = await Promise.all([
        Sesion.find(query)
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .populate('paciente', 'nombre apellido dni telefono obraSocial')
          .populate('profesional', 'nombre apellido')
          .lean(),
        Sesion.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          sesiones,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener planilla diaria de movimientos
   * @param {Date} fecha - Fecha de la planilla
   * @returns {Promise<Object>}
   */
  static async obtenerPlanillaDiaria(fecha = new Date()) {
    try {
      const inicioDia = new Date(fecha);
      inicioDia.setHours(0, 0, 0, 0);
      const finDia = new Date(fecha);
      finDia.setHours(23, 59, 59, 999);

      const sesiones = await Sesion.find({
        fecha: { $gte: inicioDia, $lte: finDia }
      })
      .sort('numeroOrden horaEntrada')
      .populate('paciente', 'nombre apellido dni obraSocial')
      .populate('profesional', 'nombre apellido')
      .lean();

      // Calcular totales del día
      const totales = sesiones.reduce((acc, sesion) => {
        if (sesion.estado === 'realizada') {
          acc.totalSesiones++;
          acc.totalRecaudado += sesion.pago.pagado ? sesion.pago.monto : 0;
          acc.totalPendiente += !sesion.pago.pagado ? sesion.pago.monto : 0;
        }
        if (sesion.estado === 'cancelada') acc.canceladas++;
        if (sesion.estado === 'ausente') acc.ausentes++;
        return acc;
      }, {
        totalSesiones: 0,
        totalRecaudado: 0,
        totalPendiente: 0,
        canceladas: 0,
        ausentes: 0,
      });

      return {
        success: true,
        data: {
          fecha: fecha,
          sesiones,
          totales,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener historial de sesiones de un paciente
   * @param {String} pacienteId - ID del paciente
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerHistorialPaciente(pacienteId, opciones = {}) {
    try {
      const { page = 1, limit = 20 } = opciones;

      // Verificar que el paciente existe
      const paciente = await Paciente.findById(pacienteId);
      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      const skip = (page - 1) * limit;

      const [sesiones, total] = await Promise.all([
        Sesion.find({ paciente: pacienteId })
          .sort('-fecha')
          .skip(skip)
          .limit(limit)
          .populate('profesional', 'nombre apellido')
          .lean(),
        Sesion.countDocuments({ paciente: pacienteId }),
      ]);

      // Estadísticas del paciente
      const estadisticas = await Sesion.aggregate([
        { $match: { paciente: new mongoose.Types.ObjectId(pacienteId) } },
        {
          $group: {
            _id: null,
            totalSesiones: { $sum: 1 },
            sesionesRealizadas: {
              $sum: { $cond: [{ $eq: ['$estado', 'realizada'] }, 1, 0] }
            },
            sesionesAusentes: {
              $sum: { $cond: [{ $eq: ['$estado', 'ausente'] }, 1, 0] }
            },
            totalPagado: {
              $sum: { $cond: ['$pago.pagado', '$pago.monto', 0] }
            },
            totalPendiente: {
              $sum: { $cond: [{ $not: '$pago.pagado' }, '$pago.monto', 0] }
            },
          }
        }
      ]);

      return {
        success: true,
        data: {
          paciente: paciente.obtenerDatosPublicos(),
          sesiones,
          estadisticas: estadisticas[0] || {},
          pagination: {
            page: Number(page),
            limit: Number(limit),
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
   * Actualizar una sesión
   * @param {String} sesionId - ID de la sesión
   * @param {Object} datosActualizar - Datos a actualizar
   * @param {String} userId - ID del usuario que modifica
   * @returns {Promise<Object>}
   */
  static async actualizarSesion(sesionId, datosActualizar, userId) {
    try {
      const sesion = await Sesion.findById(sesionId);

      if (!sesion) {
        throw new ErrorResponse('Sesión no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      Object.assign(sesion, datosActualizar);
      sesion.modificadoPor = userId;
      await sesion.save();

      await sesion.populate('paciente', 'nombre apellido dni obraSocial');
      await sesion.populate('profesional', 'nombre apellido');

      return {
        success: true,
        message: 'Sesión actualizada exitosamente',
        data: { sesion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marcar pago de una sesión
   * @param {String} sesionId - ID de la sesión
   * @param {Object} datosPago - Datos del pago
   * @returns {Promise<Object>}
   */
  static async registrarPago(sesionId, datosPago) {
    try {
      const sesion = await Sesion.findById(sesionId);

      if (!sesion) {
        throw new ErrorResponse('Sesión no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      sesion.pago = {
        ...sesion.pago,
        ...datosPago,
        pagado: true,
        fechaPago: new Date(),
      };

      await sesion.save();

      return {
        success: true,
        message: 'Pago registrado exitosamente',
        data: { sesion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancelar una sesión
   * @param {String} sesionId - ID de la sesión
   * @param {String} motivo - Motivo de cancelación
   * @returns {Promise<Object>}
   */
  static async cancelarSesion(sesionId, motivo) {
    try {
      const sesion = await Sesion.findById(sesionId);

      if (!sesion) {
        throw new ErrorResponse('Sesión no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      sesion.estado = 'cancelada';
      sesion.motivoCancelacion = motivo;
      await sesion.save();

      return {
        success: true,
        message: 'Sesión cancelada exitosamente',
        data: { sesion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de sesiones
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Object>}
   */
  static async obtenerEstadisticas(filtros = {}) {
    try {
      const query = filtros;

      // Estadísticas generales
      const generales = await Sesion.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSesiones: { $sum: 1 },
            realizadas: {
              $sum: { $cond: [{ $eq: ['$estado', 'realizada'] }, 1, 0] }
            },
            canceladas: {
              $sum: { $cond: [{ $eq: ['$estado', 'cancelada'] }, 1, 0] }
            },
            ausentes: {
              $sum: { $cond: [{ $eq: ['$estado', 'ausente'] }, 1, 0] }
            },
            totalRecaudado: {
              $sum: { $cond: ['$pago.pagado', '$pago.monto', 0] }
            },
            totalPendiente: {
              $sum: { $cond: [{ $not: '$pago.pagado' }, '$pago.monto', 0] }
            },
          }
        }
      ]);

      // Sesiones por día de la semana
      const porDia = await Sesion.aggregate([
        { $match: { ...query, estado: 'realizada' } },
        {
          $group: {
            _id: { $dayOfWeek: '$fecha' },
            cantidad: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        success: true,
        data: {
          generales: generales[0] || {},
          porDia,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener sesiones pendientes de pago
   * @param {Object} opciones - Opciones de búsqueda
   * @returns {Promise<Object>}
   */
  static async obtenerPagosPendientes(opciones = {}) {
    try {
      const { limit = 50, pacienteId } = opciones;

      const query = {
        'pago.pagado': false,
        estado: 'realizada',
      };

      if (pacienteId) {
        query.paciente = pacienteId;
      }

      const sesiones = await Sesion.find(query)
        .sort('-fecha')
        .limit(limit)
        .populate('paciente', 'nombre apellido dni telefono')
        .populate('profesional', 'nombre apellido')
        .lean();

      const totalPendiente = sesiones.reduce((sum, s) => sum + s.pago.monto, 0);

      return {
        success: true,
        data: {
          sesiones,
          totalPendiente,
          cantidad: sesiones.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

export default SesionService;

