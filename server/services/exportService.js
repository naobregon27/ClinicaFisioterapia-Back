import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de exportación a PDF
 * Nota: Requiere instalar pdfkit o similar
 * npm install pdfkit
 */
class ExportService {
  /**
   * Generar PDF de planilla diaria
   */
  static async generarPDFPlanillaDiaria(fecha, opciones = {}) {
    try {
      // Normalizar fecha
      const fechaDate = new Date(fecha);
      const inicioDia = new Date(fechaDate);
      inicioDia.setHours(0, 0, 0, 0);
      
      const finDia = new Date(fechaDate);
      finDia.setHours(23, 59, 59, 999);

      // Obtener sesiones del día
      const sesiones = await Sesion.find({
        fecha: { $gte: inicioDia, $lte: finDia },
      })
        .populate('paciente', 'nombre apellido dni obraSocial')
        .populate('profesional', 'nombre apellido')
        .sort('numeroOrden')
        .lean();

      // Calcular totales
      const totales = {
        sesiones: sesiones.length,
        ingresos: sesiones
          .filter(s => s.pago?.pagado)
          .reduce((sum, s) => sum + (s.pago?.monto || 0), 0),
        pendientes: sesiones
          .filter(s => !s.pago?.pagado)
          .reduce((sum, s) => sum + (s.pago?.monto || 0), 0),
      };

      // Preparar datos para PDF
      const datosPDF = {
        fecha: fechaDate.toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        sesiones: sesiones.map(s => ({
          orden: s.numeroOrden || '-',
          paciente: `${s.paciente.nombre} ${s.paciente.apellido}`,
          dni: s.paciente.dni,
          obraSocial: s.paciente.obraSocial?.nombre || 'Particular',
          horaEntrada: s.horaEntrada || '-',
          horaSalida: s.horaSalida || '-',
          duracion: s.duracion ? `${s.duracion} min` : '-',
          monto: s.pago?.monto || 0,
          pagado: s.pago?.pagado ? 'Sí' : 'No',
          metodoPago: s.pago?.metodoPago || '-',
          estado: s.estado,
        })),
        totales,
      };

      return {
        success: true,
        data: datosPDF,
        message: 'Datos preparados para PDF. Nota: Requiere implementar generación de PDF con pdfkit',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generar PDF de ficha de paciente
   */
  static async generarPDFFichaPaciente(pacienteId) {
    try {
      const paciente = await Paciente.findById(pacienteId)
        .populate('creadoPor', 'nombre apellido')
        .lean();

      if (!paciente) {
        throw new ErrorResponse('Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
      }

      // Obtener sesiones del paciente
      const sesiones = await Sesion.find({ paciente: pacienteId })
        .populate('profesional', 'nombre apellido')
        .sort('-fecha')
        .limit(50) // Últimas 50 sesiones
        .lean();

      // Preparar datos para PDF
      const datosPDF = {
        paciente: {
          nombreCompleto: `${paciente.nombre} ${paciente.apellido}`,
          dni: paciente.dni,
          fechaNacimiento: paciente.fechaNacimiento
            ? new Date(paciente.fechaNacimiento).toLocaleDateString('es-AR')
            : '-',
          edad: paciente.edad || paciente.edadCalculada || '-',
          genero: paciente.genero || '-',
          telefono: paciente.telefono,
          email: paciente.email || '-',
          direccion: paciente.direccion
            ? `${paciente.direccion.calle || ''} ${paciente.direccion.numero || ''}, ${paciente.direccion.ciudad || ''}`
            : '-',
          obraSocial: paciente.obraSocial?.nombre || 'Particular',
          diagnostico: paciente.diagnostico?.principal || '-',
          estado: paciente.estado,
          fechaAlta: new Date(paciente.fechaAlta).toLocaleDateString('es-AR'),
          estadisticas: paciente.estadisticas,
        },
        sesiones: sesiones.map(s => ({
          fecha: new Date(s.fecha).toLocaleDateString('es-AR'),
          numeroSesion: s.numeroSesion || '-',
          profesional: `${s.profesional.nombre} ${s.profesional.apellido}`,
          estado: s.estado,
          monto: s.pago?.monto || 0,
          pagado: s.pago?.pagado ? 'Sí' : 'No',
        })),
        totalSesiones: sesiones.length,
      };

      return {
        success: true,
        data: datosPDF,
        message: 'Datos preparados para PDF. Nota: Requiere implementar generación de PDF con pdfkit',
      };
    } catch (error) {
      throw error;
    }
  }
}

export default ExportService;
