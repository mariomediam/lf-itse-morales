import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import { dashboardApi } from '@api/dashboardApi'
import { itseApi } from '@api/itseApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function FiltrosForm({ filtros, onChange, onSubmit, onLimpiar, loading }) {
  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 no-print">
      <p className="text-sm font-semibold text-gray-700 mb-4">Filtros de búsqueda</p>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              Fecha desde <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              name="fecha_desde"
              value={filtros.fecha_desde}
              onChange={onChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Fecha hasta <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              name="fecha_hasta"
              value={filtros.fecha_hasta}
              onChange={onChange}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm
                       font-medium rounded-lg hover:bg-primary/90 transition-colors
                       disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar
          </button>
          <button
            type="button"
            onClick={onLimpiar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm
                       font-medium rounded-lg hover:bg-gray-200 transition-colors
                       disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        </div>
      </form>
    </div>
  )
}

function TablaResultados({ registros }) {
  const thClass = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap'
  const tdClass = 'px-3 py-2.5 text-sm text-gray-700 align-top'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass}>N.° ITSE</th>
              <th className={thClass}>Nombre comercial</th>
              <th className={thClass}>Dirección</th>
              <th className={thClass}>Fecha expedición</th>
              <th className={thClass}>Fecha solicitud renovación</th>
              <th className={thClass}>Fecha caducidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registros.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className={`${tdClass} font-medium text-primary whitespace-nowrap`}>
                  {item.numero_itse}
                </td>
                <td className={`${tdClass} max-w-[180px]`}>
                  {item.nombre_comercial || '-'}
                </td>
                <td className={`${tdClass} max-w-[180px]`}>
                  {item.direccion || '-'}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {formatFecha(item.fecha_expedicion)}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {formatFecha(item.fecha_solicitud_renovacion)}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    {formatFecha(item.fecha_caducidad)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function ReporteItsePorRenovarPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menus,       setMenus]       = useState([])
  const [filtros,     setFiltros]     = useState({ fecha_desde: '', fecha_hasta: '' })
  const [registros,   setRegistros]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [buscado,     setBuscado]     = useState(false)

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFiltros((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!filtros.fecha_desde) { toast.warning('Ingrese la fecha desde'); return }
    if (!filtros.fecha_hasta) { toast.warning('Ingrese la fecha hasta'); return }
    if (filtros.fecha_desde > filtros.fecha_hasta) {
      toast.warning('La fecha desde no puede ser posterior a la fecha hasta')
      return
    }

    setLoading(true)
    setBuscado(true)
    try {
      const res = await itseApi.porRenovar(filtros.fecha_desde, filtros.fecha_hasta)
      setRegistros(res.data)
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al consultar ITSE por renovar'
      toast.error(msg)
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFiltros({ fecha_desde: '', fecha_hasta: '' })
    setRegistros([])
    setBuscado(false)
  }

  const handleImprimir = () => window.print()

  const handleExportarExcel = () => {
    if (registros.length === 0) return

    const datos = registros.map((item) => ({
      'N.° ITSE':                    item.numero_itse,
      'Nombre comercial':            item.nombre_comercial      || '',
      'Dirección':                   item.direccion             || '',
      'Fecha expedición':            formatFecha(item.fecha_expedicion),
      'Fecha solicitud renovación':  formatFecha(item.fecha_solicitud_renovacion),
      'Fecha caducidad':             formatFecha(item.fecha_caducidad),
    }))

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ITSE por renovar')
    XLSX.writeFile(wb, 'reporte-itse-por-renovar.xlsx')
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          table { font-size: 9px; }
          th, td { padding: 3px 5px !important; }
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
                    Reporte — ITSE por renovar
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Lista las ITSE activas que no han sido renovadas y cuya fecha de caducidad cae dentro del periodo indicado
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

            {/* Formulario de filtros */}
            <FiltrosForm
              filtros={filtros}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onLimpiar={handleLimpiar}
              loading={loading}
            />

            {/* Spinner */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {/* Resultados */}
            {!loading && buscado && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-500 no-print" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {registros.length}{' '}
                    {registros.length === 1
                      ? 'ITSE por renovar encontrada'
                      : 'ITSE por renovar encontradas'}
                  </p>
                </div>

                {registros.length > 0 ? (
                  <TablaResultados registros={registros} />
                ) : (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No se encontraron ITSE por renovar en el periodo indicado.
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
