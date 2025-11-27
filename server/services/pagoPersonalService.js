import PagoPersonal from '../models/PagoPersonal.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

const ESTADOS_VALIDOS = ['pendiente', 'procesado', 'pagado', 'cancelado'];
const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

/**
 * Servicio para gestionar la planilla de pagos del personal
 */
class PagoPersonalService {
  /**
   * Crear o actualizar un registro de pago (upsert por fecha/semana)
   */
  static async crearOActualizarPago(datos, usuarioId) {
    const { registro, esNuevo } = await this._upsertRegistro(datos, usuarioId);

    return {
      success: true,
      message: esNuevo
        ? 'Registro de pago creado exitosamente'
        : 'Registro de pago actualizado exitosamente',
      data: {
        registro: this._formatearRegistro(registro),
        creado: esNuevo,
      },
    };
  }

  /**
   * Crear múltiples registros de pago (importar planilla)
   */
  static async crearMultiplesPagos(registros = [], usuarioId) {
    const resultado = {
      creados: 0,
      actualizados: 0,
      registros: [],
    };

    for (const registro of registros) {
      const { registro: entidad, esNuevo } = await this._upsertRegistro(
        registro,
        usuarioId
      );

      if (esNuevo) resultado.creados += 1;
      else resultado.actualizados += 1;

      resultado.registros.push(this._formatearRegistro(entidad));
    }

    return {
      success: true,
      message: 'Planilla procesada exitosamente',
      data: {
        ...resultado,
        total: resultado.registros.length,
      },
    };
  }

  /**
   * Obtener planilla completa de un mes
   */
  static async obtenerPlanillaMes(año, mes) {
    const planilla = await PagoPersonal.obtenerPlanillaMes(año, mes);

    return {
      success: true,
      data: planilla,
    };
  }

  /**
   * Obtener toda la planilla (todos los meses disponibles)
   */
  static async obtenerPlanillaCompleta() {
    const periodos = await PagoPersonal.aggregate([
      {
        $group: {
          _id: { año: '$año', mes: '$mes' },
        },
      },
      {
        $sort: {
          '_id.año': 1,
          '_id.mes': 1,
        },
      },
    ]);

    if (!periodos.length) {
      return {
        success: true,
        data: {
          planillas: [],
        },
      };
    }

    const planillas = await Promise.all(
      periodos.map(async (periodo) => {
        const { año, mes } = periodo._id;
        return PagoPersonal.obtenerPlanillaMes(año, mes);
      })
    );

    return {
      success: true,
      data: {
        planillas,
      },
    };
  }

  /**
   * Obtener registros con paginación y filtros
   */
  static async obtenerRegistros(filtros = {}, opciones = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = '-fecha',
      año,
      mes,
      semana,
      estado,
      fechaInicio,
      fechaFin,
    } = opciones;

    const query = { ...filtros };

    if (año) query.año = año;
    if (mes) query.mes = mes;
    if (semana) query.semana = semana;

    if (estado) {
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new ErrorResponse('Estado de registro no válido', HTTP_STATUS.BAD_REQUEST);
      }
      query.estado = estado;
    }

    if (fechaInicio || fechaFin) {
      query.fecha = {};
      if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) query.fecha.$lte = new Date(fechaFin);
    }

    const skip = (page - 1) * limit;

    const [registros, total] = await Promise.all([
      PagoPersonal.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .populate('creadoPor', 'nombre apellido')
        .populate('modificadoPor', 'nombre apellido')
        .lean(),
      PagoPersonal.countDocuments(query),
    ]);

    return {
      success: true,
      data: {
        registros,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
    };
  }

  /**
   * Obtener registro individual por ID
   */
  static async obtenerRegistroPorId(id) {
    const registro = await PagoPersonal.findById(id)
      .populate('creadoPor', 'nombre apellido')
      .populate('modificadoPor', 'nombre apellido')
      .lean();

    if (!registro) {
      throw new ErrorResponse('Registro no encontrado', HTTP_STATUS.NOT_FOUND);
    }

    return {
      success: true,
      data: registro,
    };
  }

  /**
   * Actualizar un registro existente
   */
  static async actualizarRegistro(id, datosActualizar = {}, usuarioId) {
    const registro = await PagoPersonal.findById(id);

    if (!registro) {
      throw new ErrorResponse('Registro no encontrado', HTTP_STATUS.NOT_FOUND);
    }

    this._aplicarActualizacion(registro, datosActualizar);
    registro.modificadoPor = usuarioId;

    await registro.save();

    return {
      success: true,
      message: 'Registro actualizado exitosamente',
      data: {
        registro: this._formatearRegistro(registro),
      },
    };
  }

  /**
   * Eliminar registro
   */
  static async eliminarRegistro(id) {
    const registro = await PagoPersonal.findByIdAndDelete(id);

    if (!registro) {
      throw new ErrorResponse('Registro no encontrado', HTTP_STATUS.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Registro eliminado exitosamente',
    };
  }

  /**
   * Obtener estadísticas generales de pagos
   */
  static async obtenerEstadisticas(filtros = {}) {
    const match = this._construirMatch(filtros);

    const [resumen] = await PagoPersonal.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRegistros: { $sum: 1 },
          montoTotal: { $sum: '$monto' },
          farfan: { $sum: '$distribucion.farfan' },
          mica: { $sum: '$distribucion.mica' },
          ffma: { $sum: '$distribucion.ffma' },
        },
      },
    ]);

    const porEstado = await PagoPersonal.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 },
          monto: { $sum: '$monto' },
        },
      },
      { $project: { estado: '$_id', total: 1, monto: 1, _id: 0 } },
    ]);

    return {
      success: true,
      data: {
        resumen: resumen
          ? {
              totalRegistros: resumen.totalRegistros,
              montoTotal: Math.round(resumen.montoTotal * 100) / 100,
              distribucion: {
                farfan: Math.round(resumen.farfan * 100) / 100,
                mica: Math.round(resumen.mica * 100) / 100,
                ffma: Math.round(resumen.ffma * 100) / 100,
              },
            }
          : {
              totalRegistros: 0,
              montoTotal: 0,
              distribucion: { farfan: 0, mica: 0, ffma: 0 },
            },
        porEstado,
      },
    };
  }

  // ============================================================
  // Helpers privados
  // ============================================================

  static async _upsertRegistro(datos, usuarioId) {
    const normalizados = this._normalizarDatos(datos);

    const query = {
      año: normalizados.año,
      mes: normalizados.mes,
      semana: normalizados.semana,
      fecha: normalizados.fecha,
    };

    let registro = await PagoPersonal.findOne(query);
    let esNuevo = false;

    if (registro) {
      registro.set({
        ...normalizados,
        modificadoPor: usuarioId,
      });
    } else {
      registro = new PagoPersonal({
        ...normalizados,
        creadoPor: usuarioId,
      });
      esNuevo = true;
    }

    await registro.save();

    return { registro, esNuevo };
  }

  static _normalizarDatos(datos = {}) {
    const fecha = datos.fecha ? new Date(datos.fecha) : null;
    if (!fecha || Number.isNaN(fecha.getTime())) {
      throw new ErrorResponse('Debe proporcionar una fecha válida', HTTP_STATUS.BAD_REQUEST);
    }

    const monto = Number(datos.monto ?? 0);
    if (Number.isNaN(monto) || monto < 0) {
      throw new ErrorResponse('El monto debe ser un número positivo', HTTP_STATUS.BAD_REQUEST);
    }

    const año = Number(datos.año ?? fecha.getUTCFullYear());
    const mes = Number(datos.mes ?? fecha.getUTCMonth() + 1);
    const semana = Number(datos.semana ?? this._obtenerSemanaDelMes(fecha));
    const diaSemana = datos.diaSemana ?? this._obtenerDiaSemana(fecha);

    if (!DIAS_SEMANA.includes(diaSemana)) {
      throw new ErrorResponse('Día de la semana no válido', HTTP_STATUS.BAD_REQUEST);
    }

    const estado = datos.estado ?? 'pendiente';
    if (!ESTADOS_VALIDOS.includes(estado)) {
      throw new ErrorResponse('Estado de registro no válido', HTTP_STATUS.BAD_REQUEST);
    }

    return {
      año,
      mes,
      semana,
      diaSemana,
      fecha,
      monto,
      distribucion: this._calcularDistribucion(monto, datos.distribucion),
      observaciones: datos.observaciones?.trim() || undefined,
      estado,
    };
  }

  static _aplicarActualizacion(registro, datos = {}) {
    if (datos.fecha) {
      const nuevaFecha = new Date(datos.fecha);
      if (Number.isNaN(nuevaFecha.getTime())) {
        throw new ErrorResponse('Fecha inválida', HTTP_STATUS.BAD_REQUEST);
      }
      registro.fecha = nuevaFecha;
      if (!datos.año) registro.año = nuevaFecha.getUTCFullYear();
      if (!datos.mes) registro.mes = nuevaFecha.getUTCMonth() + 1;
      if (!datos.semana) registro.semana = this._obtenerSemanaDelMes(nuevaFecha);
      if (!datos.diaSemana) registro.diaSemana = this._obtenerDiaSemana(nuevaFecha);
    }

    if (datos.año !== undefined) registro.año = Number(datos.año);
    if (datos.mes !== undefined) registro.mes = Number(datos.mes);
    if (datos.semana !== undefined) registro.semana = Number(datos.semana);
    if (datos.diaSemana) {
      if (!DIAS_SEMANA.includes(datos.diaSemana)) {
        throw new ErrorResponse('Día de la semana no válido', HTTP_STATUS.BAD_REQUEST);
      }
      registro.diaSemana = datos.diaSemana;
    }

    if (datos.monto !== undefined) {
      const monto = Number(datos.monto);
      if (Number.isNaN(monto) || monto < 0) {
        throw new ErrorResponse('El monto debe ser un número positivo', HTTP_STATUS.BAD_REQUEST);
      }
      registro.monto = monto;
      registro.distribucion = this._calcularDistribucion(monto, datos.distribucion ?? registro.distribucion);
    } else if (datos.distribucion) {
      registro.distribucion = this._calcularDistribucion(
        registro.monto,
        datos.distribucion
      );
    }

    if (datos.observaciones !== undefined) {
      registro.observaciones = datos.observaciones?.trim() || undefined;
    }

    if (datos.estado) {
      if (!ESTADOS_VALIDOS.includes(datos.estado)) {
        throw new ErrorResponse('Estado de registro no válido', HTTP_STATUS.BAD_REQUEST);
      }
      registro.estado = datos.estado;
    }
  }

  static _calcularDistribucion(monto, distribucion = {}) {
    const resultado = {
      farfan: Number(distribucion.farfan ?? 0),
      mica: Number(distribucion.mica ?? 0),
      ffma: Number(distribucion.ffma ?? 0),
    };

    const totalDistribucion =
      resultado.farfan + resultado.mica + resultado.ffma;

    const necesitaRecalculo =
      monto > 0 &&
      (totalDistribucion === 0 ||
        Math.abs(totalDistribucion - monto) > 0.5);

    if (necesitaRecalculo) {
      resultado.farfan = this._redondear(monto * 0.3);
      resultado.mica = this._redondear(monto * 0.2);
      resultado.ffma = this._redondear(
        monto - resultado.farfan - resultado.mica
      );
    }

    return resultado;
  }

  static _obtenerSemanaDelMes(fecha) {
    const dia = fecha.getUTCDate();
    return Math.min(5, Math.ceil(dia / 7));
  }

  static _obtenerDiaSemana(fecha) {
    return DIAS_SEMANA[fecha.getUTCDay()];
  }

  static _redondear(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  static _formatearRegistro(registro) {
    const plain = registro.toObject ? registro.toObject() : registro;
    return {
      ...plain,
      id: plain._id,
    };
  }

  static _construirMatch(filtros = {}) {
    const match = {};

    if (filtros.año) match.año = Number(filtros.año);
    if (filtros.mes) match.mes = Number(filtros.mes);
    if (filtros.semana) match.semana = Number(filtros.semana);
    if (filtros.estado) match.estado = filtros.estado;

    if (filtros.fecha) {
      const rango = {};
      if (filtros.fecha.$gte) rango.$gte = new Date(filtros.fecha.$gte);
      if (filtros.fecha.$lte) rango.$lte = new Date(filtros.fecha.$lte);
      if (Object.keys(rango).length) match.fecha = rango;
    }

    return match;
  }
}

export default PagoPersonalService;


