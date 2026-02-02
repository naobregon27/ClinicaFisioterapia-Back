import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio para obtener datos de evolución del paciente para visualización
 */
class EvolucionService {
  /**
   * Obtener datos de evolución de un paciente
   */
  static async obtenerDatosEvolucion(pacienteId, opciones = {}) {
    try {
      const { fechaInicio = null, fechaFin = null } = opciones;

      // Verificar que el paciente existe
      const paciente = await Paciente.findById(pacienteId);
      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Construir query
      const query = { paciente: pacienteId, estado: 'realizada' };
      
      if (fechaInicio || fechaFin) {
        query.fecha = {};
        if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
        if (fechaFin) query.fecha.$lte = new Date(fechaFin);
      }

      // Obtener sesiones realizadas ordenadas por fecha
      const sesiones = await Sesion.find(query)
        .select('fecha numeroSesion evolucion detallesTratamiento')
        .sort('fecha')
        .lean();

      // Preparar datos para gráficos
      const datosEvolucion = {
        paciente: {
          id: paciente._id,
          nombre: `${paciente.nombre} ${paciente.apellido}`,
          dni: paciente.dni,
        },
        sesiones: sesiones.map(s => ({
          fecha: s.fecha,
          numeroSesion: s.numeroSesion,
          dolor: s.evolucion?.dolor ?? null,
          movilidad: s.evolucion?.movilidad ?? null,
          estadoGeneral: s.evolucion?.estadoGeneral ?? null,
          observaciones: s.evolucion?.observaciones ?? null,
          tecnicas: s.detallesTratamiento?.tecnicas ?? [],
        })),
        graficos: {
          dolor: this._prepararDatosGraficoDolor(sesiones),
          movilidad: this._prepararDatosGraficoMovilidad(sesiones),
          estadoGeneral: this._prepararDatosGraficoEstadoGeneral(sesiones),
        },
        estadisticas: this._calcularEstadisticas(sesiones),
      };

      return {
        success: true,
        data: datosEvolucion,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Preparar datos para gráfico de dolor (escala 0-10)
   */
  static _prepararDatosGraficoDolor(sesiones) {
    return sesiones
      .filter(s => s.evolucion?.dolor !== null && s.evolucion?.dolor !== undefined)
      .map(s => ({
        fecha: s.fecha,
        numeroSesion: s.numeroSesion,
        valor: s.evolucion.dolor,
        label: `Sesión ${s.numeroSesion || 'N/A'}`,
      }));
  }

  /**
   * Preparar datos para gráfico de movilidad
   */
  static _prepararDatosGraficoMovilidad(sesiones) {
    const valoresMovilidad = { limitada: 1, parcial: 2, completa: 3 };
    
    return sesiones
      .filter(s => s.evolucion?.movilidad)
      .map(s => ({
        fecha: s.fecha,
        numeroSesion: s.numeroSesion,
        valor: valoresMovilidad[s.evolucion.movilidad] || 0,
        label: s.evolucion.movilidad,
        labelCompleto: this._formatearMovilidad(s.evolucion.movilidad),
      }));
  }

  /**
   * Preparar datos para gráfico de estado general
   */
  static _prepararDatosGraficoEstadoGeneral(sesiones) {
    const valoresEstado = { empeorado: 1, estable: 2, mejorado: 3 };
    
    return sesiones
      .filter(s => s.evolucion?.estadoGeneral)
      .map(s => ({
        fecha: s.fecha,
        numeroSesion: s.numeroSesion,
        valor: valoresEstado[s.evolucion.estadoGeneral] || 0,
        label: s.evolucion.estadoGeneral,
        labelCompleto: this._formatearEstadoGeneral(s.evolucion.estadoGeneral),
      }));
  }

  /**
   * Calcular estadísticas de evolución
   */
  static _calcularEstadisticas(sesiones) {
    const sesionesConDolor = sesiones.filter(s => s.evolucion?.dolor !== null && s.evolucion?.dolor !== undefined);
    const sesionesConMovilidad = sesiones.filter(s => s.evolucion?.movilidad);
    const sesionesConEstado = sesiones.filter(s => s.evolucion?.estadoGeneral);

    let dolorPromedio = 0;
    let dolorInicial = null;
    let dolorFinal = null;
    let mejoraDolor = null;

    if (sesionesConDolor.length > 0) {
      dolorPromedio = sesionesConDolor.reduce((sum, s) => sum + s.evolucion.dolor, 0) / sesionesConDolor.length;
      dolorInicial = sesionesConDolor[0].evolucion.dolor;
      dolorFinal = sesionesConDolor[sesionesConDolor.length - 1].evolucion.dolor;
      mejoraDolor = dolorInicial - dolorFinal;
    }

    const movilidadInicial = sesionesConMovilidad.length > 0 ? sesionesConMovilidad[0].evolucion.movilidad : null;
    const movilidadFinal = sesionesConMovilidad.length > 0 ? sesionesConMovilidad[sesionesConMovilidad.length - 1].evolucion.movilidad : null;

    const estadoInicial = sesionesConEstado.length > 0 ? sesionesConEstado[0].evolucion.estadoGeneral : null;
    const estadoFinal = sesionesConEstado.length > 0 ? sesionesConEstado[sesionesConEstado.length - 1].evolucion.estadoGeneral : null;

    return {
      totalSesiones: sesiones.length,
      sesionesConDatos: {
        dolor: sesionesConDolor.length,
        movilidad: sesionesConMovilidad.length,
        estadoGeneral: sesionesConEstado.length,
      },
      dolor: {
        promedio: Math.round(dolorPromedio * 10) / 10,
        inicial: dolorInicial,
        final: dolorFinal,
        mejora: mejoraDolor,
        mejoraPorcentual: dolorInicial && dolorFinal ? Math.round(((dolorInicial - dolorFinal) / dolorInicial) * 100) : null,
      },
      movilidad: {
        inicial: movilidadInicial,
        final: movilidadFinal,
        mejora: movilidadInicial !== movilidadFinal,
      },
      estadoGeneral: {
        inicial: estadoInicial,
        final: estadoFinal,
        mejora: estadoInicial !== estadoFinal,
      },
    };
  }

  /**
   * Formatear movilidad para mostrar
   */
  static _formatearMovilidad(movilidad) {
    const formatos = {
      limitada: 'Limitada',
      parcial: 'Parcial',
      completa: 'Completa',
    };
    return formatos[movilidad] || movilidad;
  }

  /**
   * Formatear estado general para mostrar
   */
  static _formatearEstadoGeneral(estado) {
    const formatos = {
      empeorado: 'Empeorado',
      estable: 'Estable',
      mejorado: 'Mejorado',
    };
    return formatos[estado] || estado;
  }
}

export default EvolucionService;
