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
        
        // Normalizar la fecha para evitar problemas de zona horaria
        let year, month, day;
        if (fecha instanceof Date) {
          year = fecha.getUTCFullYear();
          month = fecha.getUTCMonth();
          day = fecha.getUTCDate();
        } else {
          const fechaDate = new Date(fecha);
          year = fechaDate.getUTCFullYear();
          month = fechaDate.getUTCMonth();
          day = fechaDate.getUTCDate();
        }
        
        // Crear inicio y fin del día en UTC
        const inicioDia = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const finDia = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        const ultimaSesion = await Sesion.findOne({
          fecha: { $gte: inicioDia, $lte: finDia }
        }).sort('-numeroOrden').select('numeroOrden');

        datosSesion.numeroOrden = ultimaSesion ? ultimaSesion.numeroOrden + 1 : 1;
      }

      // Calcular número de sesión automáticamente solo si no se proporciona
      if (!datosSesion.numeroSesion) {
        // Contar todas las sesiones del paciente (realizadas, programadas, canceladas)
        const totalSesionesPaciente = await Sesion.countDocuments({
          paciente: datosSesion.paciente,
        });
        
        // El número de sesión será el total + 1
        datosSesion.numeroSesion = totalSesionesPaciente + 1;
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
        // Normalizar la fecha para evitar problemas de zona horaria
        let year, month, day;
        
        if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Si es formato YYYY-MM-DD, extraer componentes directamente
          [year, month, day] = fecha.split('-').map(Number);
        } else {
          // Si es un Date, obtener componentes UTC
          const fechaDate = fecha instanceof Date ? fecha : new Date(fecha);
          year = fechaDate.getUTCFullYear();
          month = fechaDate.getUTCMonth();
          day = fechaDate.getUTCDate();
        }
        
        // Crear inicio y fin del día en UTC
        const inicioDia = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const finDia = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
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
   * Obtener detalles de una sesión por ID
   * @param {String} sesionId - ID de la sesión
   * @returns {Promise<Object>}
   */
  static async obtenerSesionPorId(sesionId) {
    try {
      const sesion = await Sesion.findById(sesionId)
        .populate('paciente', 'nombre apellido dni telefono email obraSocial')
        .populate('profesional', 'nombre apellido email')
        .populate('modificadoPor', 'nombre apellido')
        .lean();

      if (!sesion) {
        throw new ErrorResponse('Sesión no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      return {
        success: true,
        data: { sesion },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener planilla diaria de movimientos
   * @param {Date|String} fecha - Fecha de la planilla
   * @returns {Promise<Object>}
   */
  static async obtenerPlanillaDiaria(fecha = new Date()) {
    try {
      // Normalizar la fecha para evitar problemas de zona horaria
      let year, month, day;
      
      if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Si es formato YYYY-MM-DD, extraer componentes directamente
        [year, month, day] = fecha.split('-').map(Number);
      } else {
        // Si es un Date, obtener componentes UTC
        const fechaDate = fecha instanceof Date ? fecha : new Date(fecha);
        year = fechaDate.getUTCFullYear();
        month = fechaDate.getUTCMonth();
        day = fechaDate.getUTCDate();
      }
      
      // Crear inicio y fin del día en UTC
      const inicioDia = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const finDia = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      const sesiones = await Sesion.find({
        fecha: { $gte: inicioDia, $lte: finDia }
      })
      .sort('numeroOrden horaEntrada')
      .populate('paciente', 'nombre apellido dni obraSocial')
      .populate('profesional', 'nombre apellido')
      .lean();

      // Obtener información de tratamiento de cada paciente
      const pacientesIds = [...new Set(sesiones.map(s => s.paciente._id.toString()))];
      const pacientes = await Paciente.find({ _id: { $in: pacientesIds } })
        .select('_id tratamiento')
        .lean();

      const pacientesMap = {};
      pacientes.forEach(p => {
        pacientesMap[p._id.toString()] = p;
      });

      // Formatear datos para la planilla
      const sesionesFormateadas = sesiones.map(sesion => {
        const pacienteData = pacientesMap[sesion.paciente._id.toString()];
        const cantidadTotal = pacienteData?.tratamiento?.cantidadTotalSesiones || null;
        
        return {
          id: sesion._id,
          numeroOrden: sesion.numeroOrden,
          paciente: {
            id: sesion.paciente._id,
            nombreCompleto: `${sesion.paciente.apellido}, ${sesion.paciente.nombre}`,
            nombre: sesion.paciente.nombre,
            apellido: sesion.paciente.apellido,
            dni: sesion.paciente.dni,
            obraSocial: sesion.paciente.obraSocial?.nombre || 'Particular',
          },
          horaEntrada: sesion.horaEntrada,
          horaSalida: sesion.horaSalida,
          monto: sesion.pago.monto,
          pagado: sesion.pago.pagado,
          metodoPago: sesion.pago.metodoPago,
          observaciones: sesion.observaciones,
          estado: sesion.estado,
          numeroSesion: sesion.numeroSesion,
          cantidadTotalSesiones: cantidadTotal,
          sesionInfo: cantidadTotal && sesion.numeroSesion 
            ? `Sesión ${sesion.numeroSesion} de ${cantidadTotal}`
            : sesion.numeroSesion 
              ? `Sesión ${sesion.numeroSesion}`
              : null,
        };
      });

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
          fecha: inicioDia, // Retornar la fecha normalizada del inicio del día
          sesiones: sesionesFormateadas,
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

      // Estadísticas del paciente - calcular de TODAS las sesiones
      const estadisticasCalculadas = await Sesion.aggregate([
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
            ultimaSesion: { $max: '$fecha' },
          }
        }
      ]);

      const stats = estadisticasCalculadas[0] || {
        totalSesiones: 0,
        sesionesRealizadas: 0,
        sesionesAusentes: 0,
        totalPagado: 0,
        totalPendiente: 0,
        ultimaSesion: null,
      };

      // Actualizar estadísticas en el modelo Paciente
      paciente.estadisticas = {
        totalSesiones: stats.totalSesiones,
        totalAbonado: stats.totalPagado,
        saldoPendiente: stats.totalPendiente,
        ultimaSesion: stats.ultimaSesion,
      };
      await paciente.save();

      // Formatear estadísticas para la respuesta (mantener formato original)
      const estadisticas = {
        _id: null,
        totalSesiones: stats.totalSesiones,
        sesionesRealizadas: stats.sesionesRealizadas,
        sesionesAusentes: stats.sesionesAusentes,
        totalPagado: stats.totalPagado,
        totalPendiente: stats.totalPendiente,
      };

      return {
        success: true,
        data: {
          paciente: paciente.obtenerDatosPublicos(),
          sesiones,
          estadisticas,
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
   * Cancelar una sesión (con opción de reprogramar)
   * @param {String} sesionId - ID de la sesión
   * @param {String} motivo - Motivo de cancelación
   * @param {Date} nuevaFecha - Nueva fecha si se reprograma (opcional)
   * @param {String} profesionalId - ID del profesional que cancela
   * @returns {Promise<Object>}
   */
  static async cancelarSesion(sesionId, motivo, nuevaFecha = null, profesionalId = null) {
    try {
      const sesion = await Sesion.findById(sesionId).populate('paciente');

      if (!sesion) {
        throw new ErrorResponse('Sesión no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      sesion.estado = 'cancelada';
      sesion.motivoCancelacion = motivo;

      let sesionReprogramada = null;

      // Si se proporciona nueva fecha, crear sesión reprogramada
      if (nuevaFecha) {
        // Obtener número de orden del día para la nueva fecha
        // Normalizar la fecha para evitar problemas de zona horaria
        let year, month, day;
        if (nuevaFecha instanceof Date) {
          year = nuevaFecha.getUTCFullYear();
          month = nuevaFecha.getUTCMonth();
          day = nuevaFecha.getUTCDate();
        } else {
          const fechaDate = new Date(nuevaFecha);
          year = fechaDate.getUTCFullYear();
          month = fechaDate.getUTCMonth();
          day = fechaDate.getUTCDate();
        }
        
        // Crear inicio y fin del día en UTC
        const inicioDia = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const finDia = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        const ultimaSesion = await Sesion.findOne({
          fecha: { $gte: inicioDia, $lte: finDia }
        }).sort('-numeroOrden').select('numeroOrden');

        const numeroOrden = ultimaSesion ? ultimaSesion.numeroOrden + 1 : 1;

        const nuevaSesion = await Sesion.create({
          paciente: sesion.paciente._id,
          fecha: nuevaFecha,
          horaEntrada: sesion.horaEntrada,
          horaSalida: sesion.horaSalida,
          pago: {
            monto: sesion.pago.monto,
            metodoPago: sesion.pago.metodoPago,
            pagado: false,
          },
          tipoSesion: sesion.tipoSesion,
          estado: 'reprogramada',
          profesional: profesionalId || sesion.profesional,
          numeroSesion: sesion.numeroSesion, // Mantiene el mismo número de sesión
          numeroOrden: numeroOrden,
          observaciones: `Reprogramada desde sesión del ${sesion.fecha.toLocaleDateString('es-AR')}. Motivo: ${motivo}`,
        });

        sesion.sesionReprogramada = {
          fecha: nuevaFecha,
          sesionId: nuevaSesion._id,
        };

        sesionReprogramada = nuevaSesion;
      }

      await sesion.save();

      return {
        success: true,
        message: nuevaFecha 
          ? 'Sesión cancelada y reprogramada exitosamente'
          : 'Sesión cancelada exitosamente',
        data: { 
          sesion,
          sesionReprogramada,
        },
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
   * Obtener sesiones pendientes de pago (control general)
   * Incluye todas las sesiones con pago pendiente, independientemente del estado
   * @param {Object} opciones - Opciones de búsqueda
   * @returns {Promise<Object>}
   */
  static async obtenerPagosPendientes(opciones = {}) {
    try {
      const { limit = 50, pacienteId } = opciones;

      // Buscar todas las sesiones con pago pendiente (no solo realizadas)
      // Esto incluye: programadas, realizadas, ausentes, etc.
      const query = {
        'pago.pagado': false,
      };

      // Filtrar por paciente si se proporciona
      if (pacienteId) {
        query.paciente = pacienteId;
      }

      // Obtener sesiones con información completa
      const sesiones = await Sesion.find(query)
        .sort('-fecha')
        .limit(limit)
        .populate('paciente', 'nombre apellido dni telefono obraSocial')
        .populate('profesional', 'nombre apellido')
        .lean();

      // Calcular totales y estadísticas
      const totalPendiente = sesiones.reduce((sum, s) => sum + s.pago.monto, 0);
      
      // Agrupar por estado
      const porEstado = sesiones.reduce((acc, s) => {
        acc[s.estado] = (acc[s.estado] || 0) + 1;
        return acc;
      }, {});

      // Agrupar por método de pago
      const porMetodoPago = sesiones.reduce((acc, s) => {
        const metodo = s.pago.metodoPago || 'pendiente';
        acc[metodo] = (acc[metodo] || 0) + 1;
        return acc;
      }, {});

      // Formatear sesiones con información adicional
      const sesionesFormateadas = sesiones.map(sesion => ({
        id: sesion._id,
        fecha: sesion.fecha,
        fechaFormateada: new Date(sesion.fecha).toLocaleDateString('es-AR'),
        horaEntrada: sesion.horaEntrada,
        horaSalida: sesion.horaSalida,
        estado: sesion.estado,
        numeroSesion: sesion.numeroSesion,
        paciente: {
          id: sesion.paciente._id,
          nombreCompleto: `${sesion.paciente.apellido}, ${sesion.paciente.nombre}`,
          nombre: sesion.paciente.nombre,
          apellido: sesion.paciente.apellido,
          dni: sesion.paciente.dni,
          telefono: sesion.paciente.telefono,
          obraSocial: sesion.paciente.obraSocial?.nombre || 'Particular',
        },
        profesional: {
          id: sesion.profesional._id,
          nombreCompleto: `${sesion.profesional.nombre} ${sesion.profesional.apellido}`,
        },
        pago: {
          monto: sesion.pago.monto,
          metodoPago: sesion.pago.metodoPago,
          pagado: sesion.pago.pagado,
          fechaPago: sesion.pago.fechaPago,
        },
        observaciones: sesion.observaciones,
        diasDesdeSesion: Math.floor((new Date() - new Date(sesion.fecha)) / (1000 * 60 * 60 * 24)),
        esFutura: new Date(sesion.fecha) > new Date(),
      }));

      return {
        success: true,
        data: {
          sesiones: sesionesFormateadas,
          totalPendiente,
          cantidad: sesiones.length,
          resumen: {
            porEstado,
            porMetodoPago,
            montoPromedio: sesiones.length > 0 ? totalPendiente / sesiones.length : 0,
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar sesión desde la planilla diaria (pago y observaciones)
   * @param {String} sesionId - ID de la sesión
   * @param {Object} datosActualizar - Datos a actualizar (pago, observaciones)
   * @param {String} userId - ID del usuario que modifica
   * @returns {Promise<Object>}
   */
  static async actualizarDesdePlanilla(sesionId, datosActualizar, userId) {
    try {
      const sesion = await Sesion.findById(sesionId);

      if (!sesion) {
        throw new ErrorResponse('Sesión no encontrada', HTTP_STATUS.NOT_FOUND);
      }

      // Actualizar solo campos permitidos desde la planilla
      if (datosActualizar.pago !== undefined) {
        sesion.pago = {
          ...sesion.pago,
          ...datosActualizar.pago,
        };
        // Si se marca como pagado, actualizar fecha
        if (datosActualizar.pago.pagado && !sesion.pago.fechaPago) {
          sesion.pago.fechaPago = new Date();
        }
        // Si se desmarca como pagado, limpiar fecha
        if (datosActualizar.pago.pagado === false) {
          sesion.pago.fechaPago = null;
        }
      }

      if (datosActualizar.observaciones !== undefined) {
        sesion.observaciones = datosActualizar.observaciones;
      }

      if (datosActualizar.horaEntrada !== undefined) {
        sesion.horaEntrada = datosActualizar.horaEntrada;
      }

      if (datosActualizar.horaSalida !== undefined) {
        sesion.horaSalida = datosActualizar.horaSalida;
      }

      sesion.modificadoPor = userId;
      await sesion.save();

      await sesion.populate('paciente', 'nombre apellido dni obraSocial');
      await sesion.populate('profesional', 'nombre apellido');

      return {
        success: true,
        message: 'Sesión actualizada desde planilla exitosamente',
        data: { sesion },
      };
    } catch (error) {
      throw error;
    }
  }
}

export default SesionService;

