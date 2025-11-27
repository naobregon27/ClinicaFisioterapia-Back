import User from '../models/User.js';
import Paciente from '../models/Paciente.js';
import Sesion from '../models/Sesion.js';
import Auditoria from '../models/Auditoria.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS, ROLES, USER_STATUS } from '../conf/constants.js';
import bcrypt from 'bcryptjs';

/**
 * Servicio de administración con funcionalidades exclusivas para administradores
 */
class AdminService {
  /**
   * Obtener todos los usuarios del sistema
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>}
   */
  static async obtenerUsuarios(filtros = {}, opciones = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = '-createdAt',
        rol,
        estado,
        emailVerificado,
        busqueda,
      } = opciones;

      // Construir query
      const query = { ...filtros };

      if (rol) {
        query.rol = rol;
      }

      if (estado) {
        query.estado = estado;
      }

      if (emailVerificado !== undefined) {
        query.emailVerificado = emailVerificado === 'true';
      }

      if (busqueda) {
        query.$or = [
          { nombre: new RegExp(busqueda, 'i') },
          { apellido: new RegExp(busqueda, 'i') },
          { email: new RegExp(busqueda, 'i') },
        ];
      }

      // Calcular skip
      const skip = (page - 1) * limit;

      // Ejecutar query
      const [usuarios, total] = await Promise.all([
        User.find(query)
          .select('+ultimoAcceso +metadata')
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      // Formatear usuarios con información adicional
      const usuariosFormateados = usuarios.map((usuario) => ({
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        rol: usuario.rol,
        estado: usuario.estado,
        estadoCuenta: usuario.estadoCuenta,
        emailVerificado: usuario.emailVerificado,
        ultimoAcceso: usuario.ultimoAcceso,
        avatar: usuario.avatar,
        metadata: {
          intentosFallidos: usuario.metadata?.intentosFallidos || 0,
          bloqueadoHasta: usuario.metadata?.bloqueadoHasta || null,
          ipRegistro: usuario.metadata?.ipRegistro || null,
          ultimaIp: usuario.metadata?.ultimaIp || null,
        },
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          usuarios: usuariosFormateados,
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
   * Obtener un usuario por ID con toda su información
   * @param {String} usuarioId - ID del usuario
   * @returns {Promise<Object>}
   */
  static async obtenerUsuarioPorId(usuarioId) {
    try {
      const usuario = await User.findById(usuarioId)
        .select('+ultimoAcceso +metadata')
        .lean();

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Obtener estadísticas del usuario
      const [totalPacientesCreados, totalSesionesAtendidas] = await Promise.all([
        Paciente.countDocuments({ creadoPor: usuarioId }),
        Sesion.countDocuments({ profesional: usuarioId }),
      ]);

      // Obtener últimas acciones del usuario
      const ultimasAcciones = await Auditoria.find({ usuario: usuarioId })
        .sort('-createdAt')
        .limit(10)
        .select('accion recurso descripcion createdAt')
        .lean();

      return {
        success: true,
        data: {
          usuario: {
            id: usuario._id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
            email: usuario.email,
            telefono: usuario.telefono,
            direccion: usuario.direccion,
            rol: usuario.rol,
            estado: usuario.estado,
            estadoCuenta: usuario.estadoCuenta,
            emailVerificado: usuario.emailVerificado,
            ultimoAcceso: usuario.ultimoAcceso,
            avatar: usuario.avatar,
            metadata: {
              intentosFallidos: usuario.metadata?.intentosFallidos || 0,
              bloqueadoHasta: usuario.metadata?.bloqueadoHasta || null,
              ipRegistro: usuario.metadata?.ipRegistro || null,
              ultimaIp: usuario.metadata?.ultimaIp || null,
            },
            estadisticas: {
              totalPacientesCreados,
              totalSesionesAtendidas,
            },
            ultimasAcciones,
            createdAt: usuario.createdAt,
            updatedAt: usuario.updatedAt,
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Crear un nuevo usuario (solo administradores)
   * @param {Object} datosUsuario - Datos del usuario
   * @returns {Promise<Object>}
   */
  static async crearUsuario(datosUsuario) {
    try {
      const { email, password, nombre, apellido, telefono, direccion, rol } =
        datosUsuario;

      // Verificar si el email ya existe
      const usuarioExistente = await User.findOne({ email });
      if (usuarioExistente) {
        throw new ErrorResponse(
          'El email ya está registrado',
          HTTP_STATUS.CONFLICT
        );
      }

      // Crear usuario
      const usuario = await User.create({
        nombre,
        apellido,
        email,
        password,
        telefono,
        direccion,
        rol: rol || ROLES.USUARIO,
        estado: USER_STATUS.ACTIVE,
        emailVerificado: true, // Los administradores crean usuarios ya verificados
      });

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          usuario: usuario.obtenerDatosPublicos(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar información de un usuario
   * @param {String} usuarioId - ID del usuario
   * @param {Object} datosActualizar - Datos a actualizar
   * @returns {Promise<Object>}
   */
  static async actualizarUsuario(usuarioId, datosActualizar) {
    try {
      const usuario = await User.findById(usuarioId);

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // No permitir cambiar email si ya existe otro usuario con ese email
      if (datosActualizar.email && datosActualizar.email !== usuario.email) {
        const existeEmail = await User.findOne({
          email: datosActualizar.email,
          _id: { $ne: usuarioId },
        });

        if (existeEmail) {
          throw new ErrorResponse(
            'El email ya está registrado',
            HTTP_STATUS.CONFLICT
          );
        }
      }

      // Actualizar campos permitidos
      const camposPermitidos = [
        'nombre',
        'apellido',
        'email',
        'telefono',
        'direccion',
        'avatar',
        'rol',
        'estado',
        'estadoCuenta',
        'emailVerificado',
      ];

      camposPermitidos.forEach((campo) => {
        if (datosActualizar[campo] !== undefined) {
          usuario[campo] = datosActualizar[campo];
        }
      });

      await usuario.save();

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: {
          usuario: usuario.obtenerDatosPublicos(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cambiar contraseña de un usuario
   * @param {String} usuarioId - ID del usuario
   * @param {String} nuevaPassword - Nueva contraseña
   * @returns {Promise<Object>}
   */
  static async cambiarPasswordUsuario(usuarioId, nuevaPassword) {
    try {
      const usuario = await User.findById(usuarioId).select('+password');

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Actualizar password (el middleware pre-save lo hasheará automáticamente)
      usuario.password = nuevaPassword;
      await usuario.save();

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cambiar rol de un usuario
   * @param {String} usuarioId - ID del usuario
   * @param {String} nuevoRol - Nuevo rol
   * @returns {Promise<Object>}
   */
  static async cambiarRolUsuario(usuarioId, nuevoRol) {
    try {
      const rolesValidos = Object.values(ROLES);
      if (!rolesValidos.includes(nuevoRol)) {
        throw new ErrorResponse('Rol no válido', HTTP_STATUS.BAD_REQUEST);
      }

      const usuario = await User.findById(usuarioId);

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      const rolAnterior = usuario.rol;
      usuario.rol = nuevoRol;
      await usuario.save();

      return {
        success: true,
        message: `Rol cambiado de '${rolAnterior}' a '${nuevoRol}' exitosamente`,
        data: {
          usuario: usuario.obtenerDatosPublicos(),
          rolAnterior,
          nuevoRol,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cambiar estado de un usuario
   * @param {String} usuarioId - ID del usuario
   * @param {String} nuevoEstado - Nuevo estado
   * @returns {Promise<Object>}
   */
  static async cambiarEstadoUsuario(usuarioId, nuevoEstado) {
    try {
      const estadosValidos = Object.values(USER_STATUS);
      if (!estadosValidos.includes(nuevoEstado)) {
        throw new ErrorResponse('Estado no válido', HTTP_STATUS.BAD_REQUEST);
      }

      const usuario = await User.findById(usuarioId);

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      const estadoAnterior = usuario.estado;
      usuario.estado = nuevoEstado;
      await usuario.save();

      return {
        success: true,
        message: `Estado cambiado de '${estadoAnterior}' a '${nuevoEstado}' exitosamente`,
        data: {
          usuario: usuario.obtenerDatosPublicos(),
          estadoAnterior,
          nuevoEstado,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Desbloquear cuenta de usuario (resetear intentos fallidos)
   * @param {String} usuarioId - ID del usuario
   * @returns {Promise<Object>}
   */
  static async desbloquearUsuario(usuarioId) {
    try {
      const usuario = await User.findById(usuarioId);

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      usuario.metadata.intentosFallidos = 0;
      usuario.metadata.bloqueadoHasta = null;
      await usuario.save({ validateBeforeSave: false });

      return {
        success: true,
        message: 'Cuenta desbloqueada exitosamente',
        data: {
          usuario: usuario.obtenerDatosPublicos(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar usuario (soft delete marcándolo como inactivo)
   * @param {String} usuarioId - ID del usuario
   * @returns {Promise<Object>}
   */
  static async eliminarUsuario(usuarioId) {
    try {
      const usuario = await User.findById(usuarioId);

      if (!usuario) {
        throw new ErrorResponse('Usuario no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Soft delete: cambiar estado a inactivo en lugar de eliminar
      usuario.estado = USER_STATUS.INACTIVE;
      usuario.estadoCuenta = 'inactivo';
      await usuario.save();

      return {
        success: true,
        message: 'Usuario desactivado exitosamente',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas generales del sistema
   * @returns {Promise<Object>}
   */
  static async obtenerEstadisticasSistema() {
    try {
      const [
        totalUsuarios,
        usuariosPorRol,
        usuariosPorEstado,
        totalPacientes,
        pacientesPorEstado,
        totalSesiones,
        sesionesPorEstado,
        ultimasRegistros,
      ] = await Promise.all([
        User.countDocuments(),
        User.aggregate([
          {
            $group: {
              _id: '$rol',
              cantidad: { $sum: 1 },
            },
          },
        ]),
        User.aggregate([
          {
            $group: {
              _id: '$estado',
              cantidad: { $sum: 1 },
            },
          },
        ]),
        Paciente.countDocuments(),
        Paciente.aggregate([
          {
            $group: {
              _id: '$estado',
              cantidad: { $sum: 1 },
            },
          },
        ]),
        Sesion.countDocuments(),
        Sesion.aggregate([
          {
            $group: {
              _id: '$estado',
              cantidad: { $sum: 1 },
            },
          },
        ]),
        Auditoria.find()
          .sort('-createdAt')
          .limit(10)
          .populate('usuario', 'nombre apellido email rol')
          .select('accion recurso descripcion usuario createdAt')
          .lean(),
      ]);

      // Calcular usuarios activos en últimos 30 días
      const fecha30DiasAtras = new Date();
      fecha30DiasAtras.setDate(fecha30DiasAtras.getDate() - 30);

      const usuariosActivos30Dias = await User.countDocuments({
        ultimoAcceso: { $gte: fecha30DiasAtras },
      });

      // Calcular ingresos totales (sesiones pagadas)
      const ingresosTotales = await Sesion.aggregate([
        {
          $match: {
            'pago.pagado': true,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pago.monto' },
          },
        },
      ]);

      return {
        success: true,
        data: {
          usuarios: {
            total: totalUsuarios,
            porRol: usuariosPorRol,
            porEstado: usuariosPorEstado,
            activosUltimos30Dias: usuariosActivos30Dias,
          },
          pacientes: {
            total: totalPacientes,
            porEstado: pacientesPorEstado,
          },
          sesiones: {
            total: totalSesiones,
            porEstado: sesionesPorEstado,
          },
          ingresos: {
            total: ingresosTotales[0]?.total || 0,
          },
          ultimasAcciones: ultimasRegistros,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

export default AdminService;



