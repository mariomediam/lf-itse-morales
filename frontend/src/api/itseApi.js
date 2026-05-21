import api from './axios'

export const itseApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/itse/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/itse/', data),

  modificar: (id, data) =>
    api.put(`/api/lf-itse/itse/${id}/`, data),

  registrarNotificacion: (id, data) =>
    api.patch(`/api/lf-itse/itse/${id}/notificacion/`, data),

  getGiros: (itseId) =>
    api.get(`/api/lf-itse/itse/${itseId}/giros/`),

  getInspectores: (itseId) =>
    api.get(`/api/lf-itse/itse/${itseId}/inspectores/`),

  crearInspector: (itseId, inspectorId) =>
    api.post(`/api/lf-itse/itse/${itseId}/inspectores/`, { inspector_id: inspectorId }),

  eliminarInspectores: (itseId) =>
    api.delete(`/api/lf-itse/itse/${itseId}/inspectores/`),

  verificarExpediente: (numero_expediente, anio) =>
    api.get('/api/lf-itse/itse/verificar-expediente/', {
      params: { numero_expediente, anio },
    }),

  getNivelesRiesgo: () =>
    api.get('/api/lf-itse/niveles-riesgo/', { params: { esta_activo: 'true' } }),

  buscarGiros: (busqueda) =>
    api.get('/api/lf-itse/giros/buscar/', { params: { busqueda, esta_activo: 'true' } }),

  listarEstados: (itseId) =>
    api.get(`/api/lf-itse/itse/${itseId}/estados/`),

  getEstadosInactivosItse: () =>
    api.get('/api/lf-itse/estados/inactivos-itse/'),

  inactivarItse: (data) =>
    api.post('/api/lf-itse/itse/inactivar/', data),

  listarArchivos: (itseId) =>
    api.get(`/api/lf-itse/itse/${itseId}/archivos/`),

  subirArchivo: (itseId, formData) =>
    api.post(`/api/lf-itse/itse/${itseId}/archivos/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  eliminar: (id) =>
    api.delete(`/api/lf-itse/itse/${id}/`),

  eliminarArchivo: (archivoId) =>
    api.delete(`/api/lf-itse/itse/archivos/${archivoId}/`),

  descargarArchivo: (uuid) =>
    api.get(`/api/lf-itse/itse/archivos/${uuid}/descargar/`, {
      responseType: 'blob',
    }),

  consultar: (params) =>
    api.get('/api/lf-itse/itse/consulta/', { params }),

  porRenovar: (fechaDesde, fechaHasta) =>
    api.get('/api/lf-itse/itse/por-renovar/', {
      params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
    }),
}
