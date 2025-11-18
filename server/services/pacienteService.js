import Paciente from '../models/Paciente.js';
import Sesion from '../models/Sesion.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de gestión de pacientes
 */
class PacienteService {
  /**
   * Crear un nuevo paciente
   * @param {Object} datosP

aciente - Datos del paciente
   * @param {String} userId - ID del usuario que crea el registro
   * @returns {Promise<Object>}
   */
  static async crearPaciente(datosPaciente, userId) {
    try {
      // Verificar si ya existe un paciente con ese DNI
      const pacienteExistente = await Paciente.findOne({ dni: datosPaciente.dni });
      
      if (pacienteExistente) {
        throw new ErrorResponse(
          `Ya existe un paciente registrado con el DNI ${datosPaciente.dni}`,
          HTTP_STATUS.CONFLICT
        );
      }

      // Crear paciente
      const paciente = await Paciente.create({
        ...datosPaciente,
        creadoPor: userId,
      });

      return {
        success: true,
        message: 'Paciente creado exitosamente',
        data: { paciente: paciente.obtenerFichaCompleta() },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los pacientes con filtros y paginación
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerPacientes(filtros = {}, opciones = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sortBy = '-createdAt',
        estado,
        obraSocial,
        busqueda,
      } = opciones;

      // Construir query
      const query = {};

      // Filtro por estado
      if (estado) {
        query.estado = estado;
      }

      // Filtro por obra social
      if (obraSocial) {
        query['obraSocial.nombre'] = new RegExp(obraSocial, 'i');
      }

      // Búsqueda por nombre, apellido o DNI
      if (busqueda) {
        query.$or = [
          { nombre: new RegExp(busqueda, 'i') },
          { apellido: new RegExp(busqueda, 'i') },
          { dni: new RegExp(busqueda, 'i') },
        ];
      }

      // Agregar filtros adicionales
      Object.assign(query, filtros);

      // Calcular skip
      const skip = (page - 1) * limit;

      // Ejecutar query con paginación
      const [pacientes, total] = await Promise.all([
        Paciente.find(query)
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .populate('creadoPor', 'nombre apellido email')
          .lean(),
        Paciente.countDocuments(query),
      ]);

      // Obtener resumen de sesiones y pagos por paciente
      const pacienteIds = pacientes.map((paciente) => paciente._id);
      let sesionesPorPaciente = {};

      if (pacienteIds.length > 0) {
        const resumenSesiones = await Sesion.aggregate([
          { $match: { paciente: { $in: pacienteIds } } },
          {
            $group: {
              _id: '$paciente',
              sesionesTotales: { $sum: 1 },
              sesionesRealizadas: {
                $sum: { $cond: [{ $eq: ['$estado', 'realizada'] }, 1, 0] },
              },
              sesionesPagadas: {
                $sum: { $cond: [{ $eq: ['$pago.pagado', true] }, 1, 0] },
              },
              sesionesPendientesPago: {
                $sum: { $cond: [{ $eq: ['$pago.pagado', false] }, 1, 0] },
              },
              montoPagado: {
                $sum: { $cond: [{ $eq: ['$pago.pagado', true] }, '$pago.monto', 0] },
              },
              montoAdeudado: {
                $sum: { $cond: [{ $eq: ['$pago.pagado', false] }, '$pago.monto', 0] },
              },
            },
          },
        ]);

        sesionesPorPaciente = resumenSesiones.reduce((acc, item) => {
          acc[item._id.toString()] = {
            sesionesTotales: item.sesionesTotales,
            sesionesRealizadas: item.sesionesRealizadas,
            sesionesPagadas: item.sesionesPagadas,
            sesionesPendientesPago: item.sesionesPendientesPago,
            montoPagado: item.montoPagado,
            montoAdeudado: item.montoAdeudado,
            tienePagosPendientes: item.sesionesPendientesPago > 0 || item.montoAdeudado > 0,
          };
          return acc;
        }, {});
      }

      const pacientesConResumen = pacientes.map((paciente) => {
        const resumen =
          sesionesPorPaciente[paciente._id.toString()] || {
            sesionesTotales: 0,
            sesionesRealizadas: 0,
            sesionesPagadas: 0,
            sesionesPendientesPago: 0,
            montoPagado: 0,
            montoAdeudado: 0,
            tienePagosPendientes: false,
          };

        return {
          ...paciente,
          resumenSesiones: resumen,
        };
      });

      // Calcular total de páginas
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          pacientes: pacientesConResumen,
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
   * Obtener un paciente por ID
   * @param {String} pacienteId - ID del paciente
   * @returns {Promise<Object>}
   */
  static async obtenerPacientePorId(pacienteId) {
    try {
      const paciente = await Paciente.findById(pacienteId)
        .populate('creadoPor', 'nombre apellido email')
        .populate('modificadoPor', 'nombre apellido email');

      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Obtener últimas 10 sesiones
      const sesiones = await Sesion.find({ paciente: pacienteId })
        .sort('-fecha')
        .limit(10)
        .populate('profesional', 'nombre apellido')
        .lean();

      return {
        success: true,
        data: {
          paciente: paciente.obtenerFichaCompleta(),
          ultimasSesiones: sesiones,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar un paciente
   * @param {String} pacienteId - ID del paciente
   * @param {Object} datosActualizar - Datos a actualizar
   * @param {String} userId - ID del usuario que modifica
   * @returns {Promise<Object>}
   */
  static async actualizarPaciente(pacienteId, datosActualizar, userId) {
    try {
      const paciente = await Paciente.findById(pacienteId);

      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // No permitir cambiar el DNI si ya existe otro paciente con ese DNI
      if (datosActualizar.dni && datosActualizar.dni !== paciente.dni) {
        const existeDNI = await Paciente.findOne({ 
          dni: datosActualizar.dni,
          _id: { $ne: pacienteId }
        });

        if (existeDNI) {
          throw new ErrorResponse(
            `Ya existe otro paciente con el DNI ${datosActualizar.dni}`,
            HTTP_STATUS.CONFLICT
          );
        }
      }

      // Actualizar
      Object.assign(paciente, datosActualizar);
      paciente.modificadoPor = userId;
      await paciente.save();

      return {
        success: true,
        message: 'Paciente actualizado exitosamente',
        data: { paciente: paciente.obtenerFichaCompleta() },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar el estado de un paciente (activar/desactivar)
   * @param {String} pacienteId - ID del paciente
   * @param {String} nuevoEstado - Estado destino (activo/inactivo)
   * @param {String} motivo - Motivo opcional del cambio
   * @returns {Promise<Object>}
   */
  static async actualizarEstadoPaciente(pacienteId, nuevoEstado, motivo = '') {
    try {
      const estadosPermitidos = ['activo', 'inactivo'];

      if (!nuevoEstado || !estadosPermitidos.includes(nuevoEstado)) {
        throw new ErrorResponse(
          'Debe proporcionar un estado válido (activo o inactivo)',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const paciente = await Paciente.findById(pacienteId);

      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      if (paciente.estado === nuevoEstado) {
        const mensaje =
          nuevoEstado === 'activo'
            ? 'El paciente ya se encuentra activo'
            : 'El paciente ya se encuentra inactivo';

        return {
          success: true,
          message: mensaje,
          data: { paciente: paciente.obtenerDatosPublicos() },
        };
      }

      paciente.estado = nuevoEstado;

      if (motivo) {
        const separador = paciente.observaciones ? '\n\n' : '';
        paciente.observaciones = `${
          paciente.observaciones || ''
        }${separador}CAMBIO DE ESTADO (${new Date().toLocaleDateString()}): ${motivo}`;
      }

      await paciente.save();

      return {
        success: true,
        message:
          nuevoEstado === 'activo'
            ? 'Paciente activado exitosamente'
            : 'Paciente desactivado exitosamente',
        data: { paciente: paciente.obtenerDatosPublicos() },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dar de alta médica a un paciente
   * @param {String} pacienteId - ID del paciente
   * @param {Object} datosAlta - Datos del alta médica
   * @returns {Promise<Object>}
   */
  static async darAltaMedica(pacienteId, datosAlta = {}) {
    try {
      const paciente = await Paciente.findById(pacienteId);

      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      paciente.estado = 'alta';
      paciente.fechaAltaMedica = datosAlta.fecha || new Date();
      
      if (datosAlta.observaciones) {
        paciente.observaciones = 
          `${paciente.observaciones || ''}\n\nALTA MÉDICA (${new Date().toLocaleDateString()}): ${datosAlta.observaciones}`;
      }

      await paciente.save();

      return {
        success: true,
        message: 'Alta médica registrada exitosamente',
        data: { paciente: paciente.obtenerDatosPublicos() },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de pacientes
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Object>}
   */
  static async obtenerEstadisticas(filtros = {}) {
    try {
      const query = filtros;

      const estadisticas = await Paciente.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalPacientes: { $sum: 1 },
            activos: {
              $sum: { $cond: [{ $eq: ['$estado', 'activo'] }, 1, 0] }
            },
            altas: {
              $sum: { $cond: [{ $eq: ['$estado', 'alta'] }, 1, 0] }
            },
            inactivos: {
              $sum: { $cond: [{ $eq: ['$estado', 'inactivo'] }, 1, 0] }
            },
          }
        }
      ]);

      // Estadísticas por obra social
      const porObraSocial = await Paciente.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$obraSocial.nombre',
            cantidad: { $sum: 1 }
          }
        },
        { $sort: { cantidad: -1 } },
        { $limit: 10 }
      ]);

      return {
        success: true,
        data: {
          resumen: estadisticas[0] || {
            totalPacientes: 0,
            activos: 0,
            altas: 0,
            inactivos: 0,
          },
          porObraSocial,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar pacientes (búsqueda rápida)
   * @param {String} termino - Término de búsqueda
   * @param {Number} limit - Límite de resultados
   * @returns {Promise<Object>}
   */
  static async buscarPacientes(termino, limit = 10) {
    try {
      const pacientes = await Paciente.find({
        $or: [
          { nombre: new RegExp(termino, 'i') },
          { apellido: new RegExp(termino, 'i') },
          { dni: new RegExp(termino, 'i') },
        ],
        estado: { $ne: 'inactivo' }
      })
      .select('nombre apellido dni telefono obraSocial estado')
      .limit(limit)
      .lean();

      return {
        success: true,
        data: { pacientes },
      };
    } catch (error) {
      throw error;
    }
  }
}

export default PacienteService;


