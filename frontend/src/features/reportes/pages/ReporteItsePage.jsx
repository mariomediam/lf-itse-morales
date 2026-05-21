import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import { dashboardApi } from '@api/dashboardApi'
import { itseApi } from '@api/itseApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFecha = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const FILTROS_AVANZADOS_VACIO = {
  numero_expediente:         '',
  anio_expediente:           '',
  emision_desde:             '',
  emision_hasta:             '',
  titular_nombre:            '',
  titular_numero_documento:  '',
  conductor_nombre:          '',
  conductor_numero_documento:'',
  nivel_riesgo_id:           '',
  direccion:                 '',
  numero_recibo_pago:        '',
  fecha_notificacion_desde:  '',
  fecha_notificacion_hasta:  '',
  esta_activo:               '',
  giro_nombre:               '',
}

// ── EstadoBadge ───────────────────────────────────────────────────────────────

function EstadoBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                     font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                     font-medium bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
      Inactivo
    </span>
  )
}

// ── Campo auxiliar ────────────────────────────────────────────────────────────

function Campo({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-1 text-xs">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  )
}

// ── Card de ITSE (layout horizontal) ─────────────────────────────────────────

function ItseCard({ item }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print-card">

      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5
                      bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-primary">N.° {item.numero_itse}</span>
          <EstadoBadge activo={item.esta_activo} />
          {item.nivel_riesgo_nombre && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs
                             font-medium bg-orange-50 text-orange-700 border border-orange-200">
              {item.nivel_riesgo_nombre}
            </span>
          )}
        </div>
        <div className="text-right shrink-0 text-xs text-gray-500">
          <span>Exp. {item.numero_expediente}</span>
          {item.fecha_recepcion && (
            <span className="ml-2 text-gray-400">{formatFecha(item.fecha_recepcion)}</span>
          )}
        </div>
      </div>

      {/* Cuerpo en 3 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">

        {/* Columna 1 — Establecimiento */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {item.nombre_comercial && (
            <p className="text-sm font-semibold text-gray-800 leading-tight">
              {item.nombre_comercial}
            </p>
          )}
          {item.direccion && (
            <p className="text-xs text-gray-500">{item.direccion}</p>
          )}
          {item.capacidad_aforo && (
            <p className="text-xs text-gray-500">Aforo: {item.capacidad_aforo}</p>
          )}
          {item.giro_concatenado && (
            <div className="mt-1">
              <p className="text-xs font-medium text-gray-500 mb-0.5">Giros</p>
              <p className="text-xs text-gray-700 leading-snug">{item.giro_concatenado}</p>
            </div>
          )}
        </div>

        {/* Columna 2 — Titular y conductor */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          <Campo label="Titular" value={item.titular_nombre} />
          <Campo label="Doc."    value={item.titular_documentos_concatenados} />
          {item.conductor_nombre?.trim() && (
            <>
              <div className="mt-1 pt-1 border-t border-gray-100" />
              <Campo label="Conductor" value={item.conductor_nombre} />
              <Campo label="Doc."      value={item.conductor_documentos_concatenados} />
            </>
          )}
        </div>

        {/* Columna 3 — Fechas y detalles */}
        <div className="px-4 py-3 flex flex-col gap-1">
          <Campo label="Expedición"   value={formatFecha(item.fecha_expedicion)} />
          <Campo label="Sol. renovación" value={formatFecha(item.fecha_solicitud_renovacion)} />
          <Campo label="Caducidad"    value={formatFecha(item.fecha_caducidad)} />
          {item.tipos_procedimiento_tupa_nombre && (
            <Campo label="TUPA"       value={item.tipos_procedimiento_tupa_nombre} />
          )}
          <Campo label="Área"         value={item.area} />
          <Campo label="Resolución"   value={item.resolucion_numero} />
          <Campo label="Recibo"       value={item.numero_recibo_pago} />
          {item.fecha_notificacion && (
            <Campo label="Notificación" value={formatFecha(item.fecha_notificacion)} />
          )}
        </div>

      </div>
    </div>
  )
}

// ── Filtros avanzados agrupados ───────────────────────────────────────────────

function FiltrosAvanzados({ filtros, onChange, nivelesRiesgo }) {
  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
  const lbl = 'block text-xs font-medium text-gray-600 mb-1'

  const grupos = [
    {
      titulo: 'Fechas del certificado',
      campos: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Expedición desde</label>
            <input type="date" name="emision_desde" value={filtros.emision_desde}
              onChange={onChange} className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Expedición hasta</label>
            <input type="date" name="emision_hasta" value={filtros.emision_hasta}
              onChange={onChange} className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Notificación desde</label>
            <input type="date" name="fecha_notificacion_desde" value={filtros.fecha_notificacion_desde}
              onChange={onChange} className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Notificación hasta</label>
            <input type="date" name="fecha_notificacion_hasta" value={filtros.fecha_notificacion_hasta}
              onChange={onChange} className={inputCls} />
          </div>
        </div>
      ),
    },
    {
      titulo: 'Características del certificado',
      campos: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Nivel de riesgo</label>
            <select name="nivel_riesgo_id" value={filtros.nivel_riesgo_id}
              onChange={onChange} className={inputCls}>
              <option value="">Todos</option>
              {nivelesRiesgo.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Dirección</label>
            <input type="text" name="direccion" value={filtros.direccion}
              onChange={onChange} placeholder="Jr., Av., calle..." className={inputCls} />
          </div>
          <div>
            <label className={lbl}>N.° Recibo de pago</label>
            <input type="text" name="numero_recibo_pago" value={filtros.numero_recibo_pago}
              onChange={onChange} placeholder="Número exacto..." className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Estado</label>
            <select name="esta_activo" value={filtros.esta_activo}
              onChange={onChange} className={inputCls}>
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Titular y conductor',
      campos: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Nombre del titular</label>
            <input type="text" name="titular_nombre" value={filtros.titular_nombre}
              onChange={onChange} placeholder="Apellidos o nombres..." className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Doc. del titular</label>
            <input type="text" name="titular_numero_documento" value={filtros.titular_numero_documento}
              onChange={onChange} placeholder="DNI, RUC u otro..." className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Nombre del conductor</label>
            <input type="text" name="conductor_nombre" value={filtros.conductor_nombre}
              onChange={onChange} placeholder="Apellidos o nombres..." className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Doc. del conductor</label>
            <input type="text" name="conductor_numero_documento" value={filtros.conductor_numero_documento}
              onChange={onChange} placeholder="DNI, RUC u otro..." className={inputCls} />
          </div>
        </div>
      ),
    },
    {
      titulo: 'Expediente y establecimiento',
      campos: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>N.° Expediente</label>
            <input type="number" name="numero_expediente" value={filtros.numero_expediente}
              onChange={onChange} placeholder="Ej. 47" min={1} className={inputCls} />
          </div>
          <div>
            <label className={lbl}>Año del expediente</label>
            <input type="number" name="anio_expediente" value={filtros.anio_expediente}
              onChange={onChange} placeholder="Ej. 2024" min={1900} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Giro</label>
            <input type="text" name="giro_nombre" value={filtros.giro_nombre}
              onChange={onChange} placeholder="Nombre del giro..." className={inputCls} />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 items-start">
      {grupos.map((g) => (
        <div key={g.titulo} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            {g.titulo}
          </p>
          {g.campos}
        </div>
      ))}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function ReporteItsePage() {
  const [sidebarOpen,      setSidebarOpen]      = useState(true)
  const [menus,            setMenus]            = useState([])
  const [busquedaRapida,   setBusquedaRapida]   = useState('')
  const [filtros,          setFiltros]          = useState(FILTROS_AVANZADOS_VACIO)
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false)
  const [registros,        setRegistros]        = useState([])
  const [loading,          setLoading]          = useState(false)
  const [buscado,          setBuscado]          = useState(false)
  const [nivelesRiesgo,    setNivelesRiesgo]    = useState([])

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))

    itseApi.getNivelesRiesgo()
      .then((res) => setNivelesRiesgo(res.data))
      .catch(() => {})
  }, [])

  const handleChangeFiltros = (e) => {
    const { name, value } = e.target
    setFiltros((prev) => ({ ...prev, [name]: value }))
  }

  const buildParams = () => {
    const params = {}

    const q = busquedaRapida.trim()
    if (q) {
      if (/^\d+$/.test(q)) {
        params.numero_itse = parseInt(q, 10)
      } else {
        params.nombre_comercial = q
      }
    }

    if (filtros.numero_expediente)          params.numero_expediente         = parseInt(filtros.numero_expediente, 10)
    if (filtros.anio_expediente)            params.anio_expediente           = parseInt(filtros.anio_expediente, 10)
    if (filtros.emision_desde)              params.emision_desde             = filtros.emision_desde
    if (filtros.emision_hasta)              params.emision_hasta             = filtros.emision_hasta
    if (filtros.titular_nombre.trim())      params.titular_nombre            = filtros.titular_nombre.trim()
    if (filtros.titular_numero_documento.trim())  params.titular_numero_documento  = filtros.titular_numero_documento.trim()
    if (filtros.conductor_nombre.trim())    params.conductor_nombre          = filtros.conductor_nombre.trim()
    if (filtros.conductor_numero_documento.trim()) params.conductor_numero_documento = filtros.conductor_numero_documento.trim()
    if (filtros.nivel_riesgo_id)            params.nivel_riesgo_id           = parseInt(filtros.nivel_riesgo_id, 10)
    if (filtros.direccion.trim())           params.direccion                 = filtros.direccion.trim()
    if (filtros.numero_recibo_pago.trim())  params.numero_recibo_pago        = filtros.numero_recibo_pago.trim()
    if (filtros.fecha_notificacion_desde)   params.fecha_notificacion_desde  = filtros.fecha_notificacion_desde
    if (filtros.fecha_notificacion_hasta)   params.fecha_notificacion_hasta  = filtros.fecha_notificacion_hasta
    if (filtros.esta_activo !== '')         params.esta_activo               = filtros.esta_activo
    if (filtros.giro_nombre.trim())         params.giro_nombre               = filtros.giro_nombre.trim()

    return params
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const params = buildParams()

    setLoading(true)
    setBuscado(true)
    try {
      const res = await itseApi.consultar(params)
      setRegistros(res.data)
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al consultar certificados ITSE'
      toast.error(msg)
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setBusquedaRapida('')
    setFiltros(FILTROS_AVANZADOS_VACIO)
    setRegistros([])
    setBuscado(false)
  }

  const handleImprimir = () => window.print()

  const handleExportarExcel = () => {
    if (registros.length === 0) return

    const datos = registros.map((item) => ({
      'N.° ITSE':                   item.numero_itse,
      'N.° Expediente':             item.numero_expediente,
      'Fecha expedición':           formatFecha(item.fecha_expedicion),
      'Fecha solicitud renovación': formatFecha(item.fecha_solicitud_renovacion),
      'Fecha caducidad':            formatFecha(item.fecha_caducidad),
      'TUPA':                       item.tipos_procedimiento_tupa_nombre || '',
      'Nombre Comercial':           item.nombre_comercial                || '',
      'Dirección':                  item.direccion                       || '',
      'Nivel de riesgo':            item.nivel_riesgo_nombre             || '',
      'Capacidad aforo':            item.capacidad_aforo                 || '',
      'Giros':                      item.giro_concatenado                || '',
      'Titular':                    item.titular_nombre                  || '',
      'Doc. Titular':               item.titular_documentos_concatenados || '',
      'Conductor':                  item.conductor_nombre                || '',
      'Doc. Conductor':             item.conductor_documentos_concatenados || '',
      'Área':                       item.area                            || '',
      'N.° Resolución':             item.resolucion_numero               || '',
      'N.° Recibo Pago':            item.numero_recibo_pago              || '',
      'Fecha Notificación':         formatFecha(item.fecha_notificacion),
      'Estado':                     item.esta_activo ? 'Activo' : 'Inactivo',
    }))

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Certificados ITSE')
    XLSX.writeFile(wb, 'reporte-certificados-itse.xlsx')
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-card { break-inside: avoid; font-size: 9px; }
          .print-card p, .print-card span, .print-card div { font-size: 9px !important; }
        }
      `}</style>

      <div className="flex flex-col h-screen bg-neutral">
        <div className="no-print">
          <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="no-print">
            <SideMenu menus={menus} isOpen={sidebarOpen} />
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Encabezado */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Reporte — Certificados ITSE
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Consulta y exporta certificados ITSE por distintos criterios
                  </p>
                </div>

                {buscado && !loading && registros.length > 0 && (
                  <div className="flex items-center gap-2 no-print shrink-0">
                    <button
                      onClick={handleImprimir}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm
                                 font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir
                    </button>
                    <button
                      onClick={handleExportarExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm
                                 font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar Excel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Panel de búsqueda */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 no-print">
              <form onSubmit={handleSubmit}>
                {/* Barra rápida */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={busquedaRapida}
                      onChange={(e) => setBusquedaRapida(e.target.value)}
                      placeholder="Buscar por número de ITSE o nombre comercial..."
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarAvanzados((v) => !v)}
                    className={[
                      'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg',
                      'border transition-colors shrink-0',
                      mostrarAvanzados
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 6a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm4 6a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1z" />
                    </svg>
                    Filtros avanzados
                    {mostrarAvanzados && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm
                               font-medium rounded-lg hover:bg-primary/90 transition-colors
                               disabled:opacity-50 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar
                  </button>

                  <button
                    type="button"
                    onClick={handleLimpiar}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm
                               font-medium rounded-lg hover:bg-gray-200 transition-colors
                               disabled:opacity-50 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar
                  </button>
                </div>

                {mostrarAvanzados && (
                  <FiltrosAvanzados
                    filtros={filtros}
                    onChange={handleChangeFiltros}
                    nivelesRiesgo={nivelesRiesgo}
                  />
                )}
              </form>
            </div>

            {/* Spinner */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {/* Resultados */}
            {!loading && buscado && (
              <>
                <div className="flex items-center gap-2 mb-4 no-print">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {registros.length}{' '}
                    {registros.length === 1
                      ? 'certificado ITSE encontrado'
                      : 'certificados ITSE encontrados'}
                  </p>
                </div>

                {registros.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {registros.map((item) => (
                      <ItseCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No se encontraron certificados ITSE con los criterios indicados.
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
