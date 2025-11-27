import Auditoria from '../models/Auditoria.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de auditoría para registrar y consultar acciones de usuarios
 */
class AuditoriaService {
  /**
   * Registrar una acción en el log de auditoría
   * @param {Object} datos - Datos de la acción
   * @returns {Promise<Object|null>}
   */
  static async registrarAccion(datos) {
    try {
      const auditoria = await Auditoria.registrar({
        usuarioId: datos.usuarioId,
        accion: datos.accion,
        recurso: datos.recurso || {},
        descripcion: datos.descripcion,
        datosAnteriores: datos.datosAnteriores,
        datosNuevos: datos.datosNuevos,
        ipAddress: datos.ipAddress,
        userAgent: datos.userAgent,
        metodo: datos.metodo,
        ruta: datos.ruta,
        estado: datos.estado || 'exitoso',
        error: datos.error,
        metadata: datos.metadata || {},
      });

      return auditoria;
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      // No lanzar error para no interrumpir el flujo principal
      return null;
    }
  }

  /**
   * Obtener todas las acciones de auditoría con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerAuditoria(filtros = {}, opciones = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = '-createdAt',
        usuarioId,
        accion,
        recursoTipo,
        recursoId,
        fechaInicio,
        fechaFin,
        estado,
      } = opciones;

      // Construir query
      const query = { ...filtros };

      if (usuarioId) {
        query.usuario = usuarioId;
      }

      if (accion) {
        query.accion = accion;
      }

      if (recursoTipo) {
        query['recurso.tipo'] = recursoTipo;
      }

      if (recursoId) {
        query['recurso.id'] = recursoId;
      }

      if (fechaInicio || fechaFin) {
        query.createdAt = {};
        if (fechaInicio) {
          query.createdAt.$gte = new Date(fechaInicio);
        }
        if (fechaFin) {
          query.createdAt.$lte = new Date(fechaFin);
        }
      }

      if (estado) {
        query.estado = estado;
      }

      // Calcular skip
      const skip = (page - 1) * limit;

      // Ejecutar query
      const [registros, total] = await Promise.all([
        Auditoria.find(query)
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .populate('usuario', 'nombre apellido email rol')
          .lean(),
        Auditoria.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          registros,
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
   * Obtener acciones de un usuario específico
   * @param {String} usuarioId - ID del usuario
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerAccionesUsuario(usuarioId, opciones = {}) {
    try {
      return await this.obtenerAuditoria({ usuario: usuarioId }, opciones);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener acciones relacionadas con un recurso específico
   * @param {String} recursoTipo - Tipo de recurso
   * @param {String} recursoId - ID del recurso
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerAccionesRecurso(recursoTipo, recursoId, opciones = {}) {
    try {
      return await this.obtenerAuditoria(
        {
          'recurso.tipo': recursoTipo,
          'recurso.id': recursoId,
        },
        opciones
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de auditoría
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Object>}
   */
  static async obtenerEstadisticas(filtros = {}) {
    try {
      const query = filtros;

      // Estadísticas generales
      const generales = await Auditoria.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAcciones: { $sum: 1 },
            exitosas: {
              $sum: { $cond: [{ $eq: ['$estado', 'exitoso'] }, 1, 0] },
            },
            fallidas: {
              $sum: { $cond: [{ $eq: ['$estado', 'fallido'] }, 1, 0] },
            },
          },
        },
      ]);

      // Acciones por tipo
      const porAccion = await Auditoria.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$accion',
            cantidad: { $sum: 1 },
          },
        },
        { $sort: { cantidad: -1 } },
        { $limit: 10 },
      ]);

      // Acciones por recurso
      const porRecurso = await Auditoria.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$recurso.tipo',
            cantidad: { $sum: 1 },
          },
        },
        { $sort: { cantidad: -1 } },
      ]);

      // Acciones por usuario (top 10)
      const porUsuario = await Auditoria.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$usuario',
            cantidad: { $sum: 1 },
          },
        },
        { $sort: { cantidad: -1 } },
        { $limit: 10 },
      ]);

      // Poblar información de usuarios
      const User = (await import('../models/User.js')).default;
      const usuariosIds = porUsuario.map((u) => u._id);
      const usuarios = await User.find({ _id: { $in: usuariosIds } })
        .select('nombre apellido email rol')
        .lean();

      const usuariosMap = {};
      usuarios.forEach((u) => {
        usuariosMap[u._id.toString()] = u;
      });

      const porUsuarioCompleto = porUsuario.map((item) => ({
        usuario: usuariosMap[item._id.toString()] || { _id: item._id },
        cantidad: item.cantidad,
      }));

      return {
        success: true,
        data: {
          generales: generales[0] || {
            totalAcciones: 0,
            exitosas: 0,
            fallidas: 0,
          },
          porAccion,
          porRecurso,
          porUsuario: porUsuarioCompleto,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

export default AuditoriaService;


