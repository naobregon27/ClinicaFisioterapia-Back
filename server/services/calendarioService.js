import Sesion from '../models/Sesion.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de calendario para visualización de sesiones
 */
class CalendarioService {
  /**
   * Obtener sesiones por rango de fechas (para calendario)
   */
  static async obtenerSesionesPorRango(fechaInicio, fechaFin, opciones = {}) {
    try {
      const { profesionalId = null, pacienteId = null, estado = null } = opciones;

      const query = {
        fecha: {
          $gte: new Date(fechaInicio),
          $lte: new Date(fechaFin),
        },
      };

      if (profesionalId) {
        query.profesional = profesionalId;
      }

      if (pacienteId) {
        query.paciente = pacienteId;
      }

      if (estado) {
        query.estado = estado;
      }

      const sesiones = await Sesion.find(query)
        .populate('paciente', 'nombre apellido dni telefono')
        .populate('profesional', 'nombre apellido')
        .sort('fecha numeroOrden')
        .lean();

      // Formatear para calendario
      const sesionesFormateadas = sesiones.map(sesion => ({
        id: sesion._id,
        title: `${sesion.paciente.nombre} ${sesion.paciente.apellido}`,
        start: sesion.fecha,
        end: sesion.horaSalida 
          ? new Date(new Date(sesion.fecha).setHours(
              parseInt(sesion.horaSalida.split(':')[0]),
              parseInt(sesion.horaSalida.split(':')[1])
            ))
          : new Date(new Date(sesion.fecha).setHours(
              parseInt(sesion.horaEntrada?.split(':')[0] || 0) + 1,
              parseInt(sesion.horaEntrada?.split(':')[1] || 0)
            )),
        allDay: false,
        extendedProps: {
          paciente: {
            id: sesion.paciente._id,
            nombre: sesion.paciente.nombre,
            apellido: sesion.paciente.apellido,
            dni: sesion.paciente.dni,
            telefono: sesion.paciente.telefono,
          },
          profesional: {
            id: sesion.profesional._id,
            nombre: sesion.profesional.nombre,
            apellido: sesion.profesional.apellido,
          },
          horaEntrada: sesion.horaEntrada,
          horaSalida: sesion.horaSalida,
          duracion: sesion.duracion,
          estado: sesion.estado,
          tipoSesion: sesion.tipoSesion,
          numeroOrden: sesion.numeroOrden,
          numeroSesion: sesion.numeroSesion,
          pago: {
            monto: sesion.pago?.monto || 0,
            pagado: sesion.pago?.pagado || false,
            metodoPago: sesion.pago?.metodoPago || 'pendiente',
          },
          url: `/sesiones/${sesion._id}`,
        },
        color: this._obtenerColorPorEstado(sesion.estado),
        textColor: '#ffffff',
      }));

      return {
        success: true,
        data: {
          sesiones: sesionesFormateadas,
          total: sesionesFormateadas.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener sesiones agrupadas por día (para vista semanal/mensual)
   */
  static async obtenerSesionesAgrupadasPorDia(fechaInicio, fechaFin, opciones = {}) {
    try {
      const resultado = await this.obtenerSesionesPorRango(fechaInicio, fechaFin, opciones);
      
      // Agrupar por día
      const agrupadas = {};
      
      resultado.data.sesiones.forEach(sesion => {
        const fecha = new Date(sesion.start).toISOString().split('T')[0];
        
        if (!agrupadas[fecha]) {
          agrupadas[fecha] = {
            fecha,
            sesiones: [],
            total: 0,
            realizadas: 0,
            programadas: 0,
            canceladas: 0,
          };
        }
        
        agrupadas[fecha].sesiones.push(sesion);
        agrupadas[fecha].total++;
        
        if (sesion.extendedProps.estado === 'realizada') {
          agrupadas[fecha].realizadas++;
        } else if (sesion.extendedProps.estado === 'programada') {
          agrupadas[fecha].programadas++;
        } else if (sesion.extendedProps.estado === 'cancelada') {
          agrupadas[fecha].canceladas++;
        }
      });

      return {
        success: true,
        data: {
          sesionesPorDia: Object.values(agrupadas),
          total: resultado.data.total,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener color según el estado de la sesión
   */
  static _obtenerColorPorEstado(estado) {
    const colores = {
      programada: '#3498db',    // Azul
      realizada: '#27ae60',      // Verde
      cancelada: '#e74c3c',      // Rojo
      ausente: '#95a5a6',        // Gris
      reprogramada: '#f39c12',  // Naranja
    };
    
    return colores[estado] || '#95a5a6';
  }
}

export default CalendarioService;
