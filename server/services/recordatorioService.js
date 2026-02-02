import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import EmailService from './emailService.js';
import NotificacionService from './notificacionService.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de recordatorios automáticos
 */
class RecordatorioService {
  /**
   * Enviar recordatorios de sesiones próximas (24 horas antes)
   */
  static async enviarRecordatorios24Horas() {
    try {
      const ahora = new Date();
      const mañana = new Date(ahora);
      mañana.setDate(mañana.getDate() + 1);
      mañana.setHours(23, 59, 59, 999);

      // Buscar sesiones programadas para mañana
      const sesiones = await Sesion.find({
        fecha: { $gte: ahora, $lte: mañana },
        estado: 'programada',
        recordatorioEnviado: false,
      })
        .populate('paciente', 'nombre apellido email telefono')
        .populate('profesional', 'nombre apellido email')
        .lean();

      let enviados = 0;
      let errores = 0;

      for (const sesion of sesiones) {
        try {
          // Enviar email al paciente si tiene email
          if (sesion.paciente.email) {
            await EmailService.enviarRecordatorioSesion({
              to: sesion.paciente.email,
              pacienteNombre: `${sesion.paciente.nombre} ${sesion.paciente.apellido}`,
              fecha: sesion.fecha,
              horaEntrada: sesion.horaEntrada,
              profesionalNombre: `${sesion.profesional.nombre} ${sesion.profesional.apellido}`,
            });
          }

          // Crear notificación para el profesional
          await NotificacionService.crearNotificacion({
            usuarioId: sesion.profesional._id,
            tipo: 'sesion_proxima',
            titulo: 'Sesión programada para mañana',
            mensaje: `Tienes una sesión con ${sesion.paciente.nombre} ${sesion.paciente.apellido} mañana a las ${sesion.horaEntrada || 'horario pendiente'}`,
            datos: {
              pacienteId: sesion.paciente._id,
              sesionId: sesion._id,
              fecha: sesion.fecha,
            },
            prioridad: 'alta',
          });

          // Marcar recordatorio como enviado
          await Sesion.findByIdAndUpdate(sesion._id, {
            recordatorioEnviado: true,
          });

          enviados++;
        } catch (error) {
          console.error(`Error al enviar recordatorio para sesión ${sesion._id}:`, error);
          errores++;
        }
      }

      return {
        success: true,
        message: `Recordatorios enviados: ${enviados}, Errores: ${errores}`,
        data: { enviados, errores, total: sesiones.length },
      };
    } catch (error) {
      console.error('Error al enviar recordatorios:', error);
      throw error;
    }
  }

  /**
   * Enviar recordatorios del día (mañana)
   */
  static async enviarRecordatoriosDelDia() {
    try {
      const ahora = new Date();
      const finDia = new Date(ahora);
      finDia.setHours(23, 59, 59, 999);

      // Buscar sesiones programadas para hoy que aún no tienen recordatorio del día
      const sesiones = await Sesion.find({
        fecha: { $gte: ahora, $lte: finDia },
        estado: 'programada',
      })
        .populate('paciente', 'nombre apellido email telefono')
        .populate('profesional', 'nombre apellido email')
        .lean();

      let enviados = 0;

      for (const sesion of sesiones) {
        try {
          // Enviar email al paciente si tiene email
          if (sesion.paciente.email) {
            await EmailService.enviarRecordatorioSesionHoy({
              to: sesion.paciente.email,
              pacienteNombre: `${sesion.paciente.nombre} ${sesion.paciente.apellido}`,
              fecha: sesion.fecha,
              horaEntrada: sesion.horaEntrada,
              profesionalNombre: `${sesion.profesional.nombre} ${sesion.profesional.apellido}`,
            });
          }

          enviados++;
        } catch (error) {
          console.error(`Error al enviar recordatorio del día para sesión ${sesion._id}:`, error);
        }
      }

      return {
        success: true,
        message: `Recordatorios del día enviados: ${enviados}`,
        data: { enviados, total: sesiones.length },
      };
    } catch (error) {
      console.error('Error al enviar recordatorios del día:', error);
      throw error;
    }
  }
}

export default RecordatorioService;
