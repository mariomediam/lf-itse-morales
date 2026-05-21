import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import DashboardHeader from '../components/DashboardHeader'
import ResumenCard from '../components/ResumenCard'
import ExpedienteItem from '../components/ExpedienteItem'
import ItsePorRenovarItem from '../components/ItsePorRenovarItem'
import { dashboardApi } from '@api/dashboardApi'
import { itseApi } from '@api/itseApi'

// Suma un mes a una fecha ISO (YYYY-MM-DD)
const sumarUnMes = (fechaIso) => {
  const d = new Date(fechaIso + 'T00:00:00')
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menus,       setMenus]       = useState([])
  const [expedientes, setExpedientes] = useState([])
  const [itseRenovar, setItseRenovar] = useState([])
  const [loading,     setLoading]     = useState(true)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const fechaRes = await dashboardApi.getFechaServidor()
      const hoy      = fechaRes.data.fecha
      const hasta    = sumarUnMes(hoy)

      const [menusRes, expedientesRes, porRenovarRes] = await Promise.all([
        dashboardApi.getMenusUsuario(),
        dashboardApi.getExpedientesPendientes(),
        itseApi.porRenovar(hoy, hasta),
      ])
      setMenus(menusRes.data)
      setExpedientes(expedientesRes.data)
      setItseRenovar(porRenovarRes.data)
    } catch {
      toast.error('Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // ── Cálculos de resumen ────────────────────────────────────────────────────
  const totalLicencias      = expedientes.filter((e) => e.licencia_pendiente).length
  const totalItse           = expedientes.filter((e) => e.itse_pendiente).length
  const totalLicenciasAlerta = expedientes.filter((e) => e.licencia_pendiente && e.mostrar_alerta).length
  const totalItseAlerta      = expedientes.filter((e) => e.itse_pendiente && e.mostrar_alerta).length

  const alertas = expedientes.filter((e) => e.mostrar_alerta)
  const bandeja = expedientes.filter((e) => !e.mostrar_alerta)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <DashboardHeader
            titulo="Dashboard de Gestión"
            subtitulo="Resumen general de expedientes y alertas prioritarias"
            onActualizar={cargarDatos}
          />

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* ── Cards de resumen ────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <ResumenCard
                  titulo="Licencias pendientes"
                  total={totalLicencias}
                  esAlerta={false}
                  tipo="licencia"
                />
                <ResumenCard
                  titulo="ITSE pendientes"
                  total={totalItse}
                  esAlerta={false}
                  tipo="itse"
                />
                <ResumenCard
                  titulo="Licencias por vencer plazo de atención"
                  total={totalLicenciasAlerta}
                  esAlerta={true}
                  tipo="licencia"
                />
                <ResumenCard
                  titulo="ITSE por vencer plazo de atención"
                  total={totalItseAlerta}
                  esAlerta={true}
                  tipo="itse"
                />
              </div>

              {/* ── Alertas prioritarias ────────────────────────────────── */}
              {alertas.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd" />
                    </svg>
                    <h2 className="text-base font-semibold text-danger">Alertas prioritarias</h2>
                  </div>
                  <div className="space-y-3">
                    {alertas.map((exp) => (
                      <ExpedienteItem key={exp.id} expediente={exp} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Bandeja de expedientes pendientes ───────────────────── */}
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h2 className="text-base font-semibold text-gray-700">Bandeja de expedientes pendientes</h2>
                </div>

                {bandeja.length > 0 ? (
                  <div className="space-y-3">
                    {bandeja.map((exp) => (
                      <ExpedienteItem key={exp.id} expediente={exp} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    No hay expedientes pendientes en la bandeja
                  </p>
                )}
              </section>

              {/* ── ITSE por renovar en el próximo mes ──────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-base font-semibold text-gray-700">
                    ITSE por renovar en los próximos 30 días
                  </h2>
                  {itseRenovar.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      {itseRenovar.length}
                    </span>
                  )}
                </div>

                {itseRenovar.length > 0 ? (
                  <div className="space-y-3">
                    {itseRenovar.map((itse) => (
                      <ItsePorRenovarItem key={itse.id} itse={itse} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-6 text-center bg-white rounded-lg border border-gray-200">
                    No hay ITSE que deban renovarse en los próximos 30 días
                  </p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
