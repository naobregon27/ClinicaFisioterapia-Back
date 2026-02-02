import Sesion from '../models/Sesion.js';
import Paciente from '../models/Paciente.js';
import User from '../models/User.js';
import Notificacion from '../models/Notificacion.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de dashboard con métricas consolidadas
 */
class DashboardService {
  /**
   * Obtener métricas del dashboard para el usuario actual
   */
  static async obtenerMetricasDashboard(usuarioId, opciones = {}) {
    try {
      const { fecha = new Date() } = opciones;
      const fechaActual = new Date(fecha);
      
      // Normalizar fecha (inicio y fin del día)
      const inicioDia = new Date(fechaActual);
      inicioDia.setHours(0, 0, 0, 0);
      
      const finDia = new Date(fechaActual);
      finDia.setHours(23, 59, 59, 999);
      
      // Inicio y fin del mes actual
      const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      const finMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Inicio y fin de la semana actual
      const inicioSemana = new Date(fechaActual);
      inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      finSemana.setHours(23, 59, 59, 999);

      // Obtener todas las métricas en paralelo
      const [
        sesionesHoy,
        pacientesActivosHoy,
        ingresosHoy,
        ingresosMes,
        ingresosSemana,
        pagosPendientes,
        proximasSesiones,
        pacientesNuevosMes,
        notificacionesNoLeidas,
        sesionesRealizadasMes,
        sesionesCanceladasMes,
      ] = await Promise.all([
        // Sesiones programadas para hoy
        Sesion.countDocuments({
          fecha: { $gte: inicioDia, $lte: finDia },
          estado: { $in: ['programada', 'realizada'] },
        }),
        
        // Pacientes activos (con sesiones hoy)
        Sesion.distinct('paciente', {
          fecha: { $gte: inicioDia, $lte: finDia },
          estado: { $in: ['programada', 'realizada'] },
        }),
        
        // Ingresos del día
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
        
        // Ingresos del mes
        Sesion.aggregate([
          {
            $match: {
              fecha: { $gte: inicioMes, $lte: finMes },
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
        
        // Ingresos de la semana
        Sesion.aggregate([
          {
            $match: {
              fecha: { $gte: inicioSemana, $lte: finSemana },
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
        
        // Pagos pendientes
        Sesion.countDocuments({
          'pago.pagado': false,
          estado: 'realizada',
          fecha: { $lte: new Date() },
        }),
        
        // Próximas sesiones (próximas 3 horas)
        Sesion.find({
          fecha: { $gte: new Date(), $lte: new Date(Date.now() + 3 * 60 * 60 * 1000) },
          estado: 'programada',
        })
          .populate('paciente', 'nombre apellido telefono')
          .sort('fecha')
          .limit(5)
          .lean(),
        
        // Pacientes nuevos este mes
        Paciente.countDocuments({
          fechaAlta: { $gte: inicioMes, $lte: finMes },
        }),
        
        // Notificaciones no leídas
        Notificacion.countDocuments({
          usuario: usuarioId,
          leida: false,
          $or: [
            { fechaExpiracion: null },
            { fechaExpiracion: { $gt: new Date() } },
          ],
        }),
        
        // Sesiones realizadas este mes
        Sesion.countDocuments({
          fecha: { $gte: inicioMes, $lte: finMes },
          estado: 'realizada',
        }),
        
        // Sesiones canceladas este mes
        Sesion.countDocuments({
          fecha: { $gte: inicioMes, $lte: finMes },
          estado: 'cancelada',
        }),
      ]);

      // Obtener ingresos de los últimos 7 días para gráfico
      const ingresosUltimos7Dias = await this._obtenerIngresosUltimos7Dias(fechaActual);

      return {
        success: true,
        data: {
          metricas: {
            // Métricas del día
            sesionesHoy,
            pacientesActivosHoy: pacientesActivosHoy.length,
            ingresosHoy: ingresosHoy[0]?.total || 0,
            
            // Métricas del mes
            ingresosMes: ingresosMes[0]?.total || 0,
            pacientesNuevosMes,
            sesionesRealizadasMes,
            sesionesCanceladasMes,
            
            // Métricas de la semana
            ingresosSemana: ingresosSemana[0]?.total || 0,
            
            // Pendientes
            pagosPendientes,
            notificacionesNoLeidas,
          },
          
          // Próximas sesiones
          proximasSesiones: proximasSesiones.map(sesion => ({
            id: sesion._id,
            paciente: {
              nombre: sesion.paciente.nombre,
              apellido: sesion.paciente.apellido,
              telefono: sesion.paciente.telefono,
            },
            fecha: sesion.fecha,
            horaEntrada: sesion.horaEntrada,
            horaSalida: sesion.horaSalida,
          })),
          
          // Gráfico de ingresos últimos 7 días
          ingresosUltimos7Dias,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener ingresos de los últimos 7 días
   */
  static async _obtenerIngresosUltimos7Dias(fechaActual) {
    const dias = [];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(fechaActual);
      fecha.setDate(fecha.getDate() - i);
      
      const inicioDia = new Date(fecha);
      inicioDia.setHours(0, 0, 0, 0);
      
      const finDia = new Date(fecha);
      finDia.setHours(23, 59, 59, 999);
      
      const resultado = await Sesion.aggregate([
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
      ]);
      
      dias.push({
        fecha: fecha.toISOString().split('T')[0],
        dia: fecha.toLocaleDateString('es-AR', { weekday: 'short' }),
        ingresos: resultado[0]?.total || 0,
      });
    }
    
    return dias;
  }
}

export default DashboardService;
