import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import User from '../models/User.js';
import EmailService from './emailService.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio para generar y enviar resumen diario por email
 */
class ResumenDiarioService {
  /**
   * Generar y enviar resumen diario a administradores
   */
  static async enviarResumenDiario() {
    try {
      const hoy = new Date();
      const inicioDia = new Date(hoy);
      inicioDia.setHours(0, 0, 0, 0);
      
      const finDia = new Date(hoy);
      finDia.setHours(23, 59, 59, 999);

      // Obtener estadísticas del día
      const [
        sesionesRealizadas,
        sesionesProgramadas,
        ingresosDia,
        pacientesNuevos,
        pagosPendientes,
        administradores,
      ] = await Promise.all([
        Sesion.countDocuments({
          fecha: { $gte: inicioDia, $lte: finDia },
          estado: 'realizada',
        }),
        
        Sesion.countDocuments({
          fecha: { $gte: inicioDia, $lte: finDia },
          estado: 'programada',
        }),
        
        Sesion.aggregate([
          {
            $match: {
              fecha: { $gte: inicioDia, $lte: finDia },
              'pago.pagado': true,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$pago.monto' },
            },
          },
        ]),
        
        Paciente.countDocuments({
          fechaAlta: { $gte: inicioDia, $lte: finDia },
        }),
        
        Sesion.countDocuments({
          'pago.pagado': false,
          estado: 'realizada',
          fecha: { $lte: new Date() },
        }),
        
        User.find({ rol: 'administrador', emailVerificado: true })
          .select('email nombre apellido')
          .lean(),
      ]);

      const resumen = {
        fecha: hoy.toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        sesionesRealizadas,
        sesionesProgramadas,
        ingresosDia: ingresosDia[0]?.total || 0,
        pacientesNuevos,
        pagosPendientes,
      };

      // Enviar email a cada administrador
      let enviados = 0;
      let errores = 0;

      for (const admin of administradores) {
        try {
          await EmailService.enviarResumenDiario({
            to: admin.email,
            nombre: `${admin.nombre} ${admin.apellido}`,
            resumen,
          });
          enviados++;
        } catch (error) {
          console.error(`Error al enviar resumen a ${admin.email}:`, error);
          errores++;
        }
      }

      return {
        success: true,
        message: `Resumen diario enviado: ${enviados} exitosos, ${errores} errores`,
        data: { enviados, errores, resumen },
      };
    } catch (error) {
      console.error('Error al generar resumen diario:', error);
      throw error;
    }
  }
}

export default ResumenDiarioService;
