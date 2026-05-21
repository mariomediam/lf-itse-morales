import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import SelectorPersona from '@features/expedientes/components/SelectorPersona'
import AgregarGiroModal from '@features/licencias/components/AgregarGiroModal'
import SelectorItsePrincipal from '@features/itse/components/SelectorItsePrincipal'
import { dashboardApi } from '@api/dashboardApi'
import { inspectoresApi } from '@api/inspectoresApi'
import { itseApi } from '@api/itseApi'
import { personasApi } from '@api/personasApi'
import useItseStore from '@store/itseStore'

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_ITSE = [
  { id: 1, nombre: 'Estándar' },
  { id: 2, nombre: 'Renovación' },
]

// ── Clases reutilizables ───────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

const selectClass = inputClass

// ── Helpers ───────────────────────────────────────────────────────────────────

const isoAFecha = (iso) => (iso ? iso.split('T')[0] : '')

const buildPersonaOption = (persona) => ({
  value: persona.id,
  label: persona.persona_nombre,
  data:  persona,
})

// ── Sección card ──────────────────────────────────────────────────────────────

function SeccionCard({ icono, titulo, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary">{icono}</span>
        <h2 className="text-sm font-semibold text-gray-800">{titulo}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoDocumento = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const IconoPersonas = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IconoEstablecimiento = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const IconoGiros = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const IconoTexto = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
  </svg>
)

// ── Página ────────────────────────────────────────────────────────────────────

export default function ModificarItsePage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { setBusqueda } = useItseStore()

  // Layout
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menus,       setMenus]       = useState([])

  // Catálogos
  const [nivelesRiesgo,    setNivelesRiesgo]    = useState([])
  const [inspectores,      setInspectores]      = useState([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)

  // Inspector asignado
  const [inspectorId, setInspectorId] = useState('')

  // Estado de carga
  const [loadingItse, setLoadingItse] = useState(true)

  // Datos de contexto (solo lectura, para el subtítulo)
  const [numeroExpediente, setNumeroExpediente] = useState('')
  const [anioExpediente,   setAnioExpediente]   = useState('')
  const [expedienteId,     setExpedienteId]     = useState(null)

  // Datos principales
  const [numeroItse,               setNumeroItse]               = useState('')
  const [fechaExpedicion,          setFechaExpedicion]          = useState('')
  const [fechaSolicitudRenovacion, setFechaSolicitudRenovacion] = useState('')
  const [fechaCaducidad,           setFechaCaducidad]           = useState('')
  const [tipoItseId,               setTipoItseId]               = useState('')
  const [resolucionNumero,         setResolucionNumero]         = useState('')
  const [nivelRiesgoId,            setNivelRiesgoId]            = useState('')
  const [numeroReciboPago,         setNumeroReciboPago]         = useState('')

  // Titular y representante legal
  const [titular,       setTitular]       = useState(null)
  const [representante, setRepresentante] = useState(null)

  // Establecimiento
  const [nombreComercial, setNombreComercial] = useState('')
  const [direccion,       setDireccion]       = useState('')
  const [capacidadAforo,  setCapacidadAforo]  = useState('')
  const [area,            setArea]            = useState('')

  // Giros
  const [giros,            setGiros]            = useState([])
  const [modalGiroAbierto, setModalGiroAbierto] = useState(false)

  // Observaciones
  const [observaciones, setObservaciones] = useState('')

  // ITSE principal (solo cuando tipo = renovación)
  const [itsePrincipalOption,   setItsePrincipalOption]   = useState(null)
  const [confirmarAutocomplete, setConfirmarAutocomplete] = useState(false)
  const [autocompletando,       setAutocompletando]       = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)

  // ── Carga inicial ────────────────────────────────────────────────────────────

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  useEffect(() => {
    setLoadingCatalogos(true)
    Promise.all([
      itseApi.getNivelesRiesgo(),
      inspectoresApi.listar(),
    ])
      .then(([resNiveles, resInspectores]) => {
        setNivelesRiesgo(resNiveles.data)
        setInspectores(resInspectores.data)
      })
      .catch(() => toast.error('Error al cargar los catálogos'))
      .finally(() => setLoadingCatalogos(false))
  }, [])

  // ── Carga del ITSE y sus relaciones ──────────────────────────────────────────

  useEffect(() => {
    if (!id) return

    const cargar = async () => {
      setLoadingItse(true)
      try {
        const [resItse, resGiros, resInspectoresItse] = await Promise.all([
          itseApi.buscar('ID', id),
          itseApi.getGiros(id),
          itseApi.getInspectores(id),
        ])

        const itse = resItse.data[0]
        if (!itse) {
          toast.error('No se encontró el certificado ITSE')
          navigate('/certificados-itse')
          return
        }

        // Contexto del expediente
        setExpedienteId(itse.expediente_id)
        setNumeroExpediente(itse.numero_expediente)
        setAnioExpediente(new Date(itse.fecha_recepcion).getFullYear())

        // Datos principales
        setNumeroItse(String(itse.numero_itse))
        setFechaExpedicion(isoAFecha(itse.fecha_expedicion))
        setFechaSolicitudRenovacion(isoAFecha(itse.fecha_solicitud_renovacion))
        setFechaCaducidad(isoAFecha(itse.fecha_caducidad))
        setTipoItseId(String(itse.tipo_itse_id))
        setResolucionNumero(itse.resolucion_numero ?? '')
        setNivelRiesgoId(String(itse.nivel_riesgo_id))
        setNumeroReciboPago(itse.numero_recibo_pago ?? '')

        // Establecimiento
        setNombreComercial(itse.nombre_comercial ?? '')
        setDireccion(itse.direccion ?? '')
        setCapacidadAforo(String(itse.capacidad_aforo))
        setArea(String(itse.area))

        // Observaciones
        setObservaciones(itse.observaciones ?? '')

        // Giros
        const girosFormateados = resGiros.data.map((g) => ({
          id:      g.giro_id,
          ciiu_id: g.ciiu_id,
          nombre:  g.nombre,
        }))
        setGiros(girosFormateados)

        // Inspector asignado (tomamos el primero si existe)
        if (resInspectoresItse.data.length > 0) {
          setInspectorId(String(resInspectoresItse.data[0].inspector_id))
        }

        // ITSE principal (renovación)
        if (itse.itse_principal_id) {
          try {
            const resPrincipal = await itseApi.buscar('ID', itse.itse_principal_id)
            const principal = resPrincipal.data[0]
            if (principal) {
              const formatFecha = (f) => {
                if (!f) return '-'
                const d = new Date(f)
                return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
              }
              setItsePrincipalOption({
                value: principal.id,
                label: `N° ${principal.numero_itse}  |  ${formatFecha(principal.fecha_expedicion)}  |  ${principal.nombre_comercial}`,
                data: principal,
              })
            }
          } catch { /* ignorar si no se puede cargar */ }
        }

        // Titular
        const resTitular = await personasApi.buscar('ID', itse.titular_id)
        if (resTitular.data[0]) setTitular(buildPersonaOption(resTitular.data[0]))

        // Representante legal (conductor)
        if (itse.conductor_id) {
          const resRep = await personasApi.buscar('ID', itse.conductor_id)
          if (resRep.data[0]) setRepresentante(buildPersonaOption(resRep.data[0]))
        }
      } catch {
        toast.error('Error al cargar los datos del certificado ITSE')
      } finally {
        setLoadingItse(false)
      }
    }

    cargar()
  }, [id, navigate])

  // ── Giros ────────────────────────────────────────────────────────────────────

  const handleAgregarGiro = (giro) => {
    if (giros.find((g) => g.id === giro.id)) return
    setGiros((prev) => [...prev, giro])
  }

  const handleEliminarGiro = (giroId) => {
    setGiros((prev) => prev.filter((g) => g.id !== giroId))
  }

  // ── ITSE principal: cambio y autocompletado ──────────────────────────────────

  const handleItsePrincipalChange = (option) => {
    setItsePrincipalOption(option)
    setConfirmarAutocomplete(!!option)
  }

  const handleAceptarAutocomplete = async () => {
    setConfirmarAutocomplete(false)
    setAutocompletando(true)
    const d = itsePrincipalOption.data
    try {
      const resGiros = await itseApi.getGiros(d.id)
      setNivelRiesgoId(String(d.nivel_riesgo_id))
      setNombreComercial(d.nombre_comercial ?? '')
      setDireccion(d.direccion ?? '')
      setCapacidadAforo(d.capacidad_aforo != null ? String(d.capacidad_aforo) : '')
      setArea(d.area != null ? String(d.area) : '')
      setTitular({
        value: d.titular_id,
        label: d.titular_nombre,
        data:  { id: d.titular_id, persona_nombre: d.titular_nombre },
      })
      setRepresentante({
        value: d.conductor_id,
        label: d.conductor_nombre,
        data:  { id: d.conductor_id, persona_nombre: d.conductor_nombre },
      })
      setGiros(resGiros.data.map((g) => ({
        id:      g.giro_id,
        ciiu_id: g.ciiu_id,
        nombre:  g.nombre,
      })))
      toast.success('Formulario autocompletado con los datos de la ITSE anterior')
    } catch {
      toast.error('No se pudieron cargar los datos de la ITSE anterior')
    } finally {
      setAutocompletando(false)
    }
  }

  const handleRechazarAutocomplete = () => {
    setConfirmarAutocomplete(false)
  }

  // ── Envío del formulario ─────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!numeroItse)               { toast.error('Ingrese el número de ITSE');                   return }
    if (!fechaExpedicion)          { toast.error('Ingrese la fecha de expedición');              return }
    if (!fechaSolicitudRenovacion) { toast.error('Ingrese la fecha de solicitud de renovación'); return }
    if (!fechaCaducidad)           { toast.error('Ingrese la fecha de caducidad');               return }
    if (!tipoItseId)               { toast.error('Seleccione el tipo de ITSE');                  return }
    if (!resolucionNumero)         { toast.error('Ingrese el número de resolución');             return }
    if (!nivelRiesgoId)            { toast.error('Seleccione el nivel de riesgo');               return }
    if (!titular)                  { toast.error('Seleccione el titular de la ITSE');            return }
    if (!representante)            { toast.error('Seleccione el representante legal');           return }
    if (!nombreComercial)          { toast.error('Ingrese el nombre comercial');                 return }
    if (!direccion)                { toast.error('Ingrese la dirección del local');              return }
    if (!capacidadAforo)           { toast.error('Ingrese la capacidad de aforo');               return }
    if (!area)                     { toast.error('Ingrese el área del establecimiento');         return }
    if (giros.length === 0)        { toast.error('Agregue al menos un giro autorizado');         return }
    const payload = {
      expediente_id:              expedienteId,
      tipo_itse_id:               Number(tipoItseId),
      numero_itse:                Number(numeroItse),
      fecha_expedicion:           fechaExpedicion,
      fecha_solicitud_renovacion: fechaSolicitudRenovacion,
      fecha_caducidad:            fechaCaducidad,
      titular_id:                 titular.data.id,
      conductor_id:               representante.data.id,
      itse_principal_id:          Number(tipoItseId) === 2 ? (itsePrincipalOption?.value ?? null) : null,
      nombre_comercial:           nombreComercial.trim(),
      nivel_riesgo_id:            Number(nivelRiesgoId),
      direccion:                  direccion.trim(),
      resolucion_numero:          resolucionNumero.trim(),
      area:                       area,
      numero_recibo_pago:         numeroReciboPago.trim(),
      observaciones:              observaciones.trim() || null,
      se_puede_publicar:          false,
      capacidad_aforo:            Number(capacidadAforo),
      giros:                      giros.map((g) => ({ giro_id: g.id })),
    }

    setSubmitting(true)
    try {
      await itseApi.modificar(id, payload)

      // Paso 1: eliminar todos los inspectores actuales
      // Paso 2: asignar el nuevo inspector si se seleccionó uno
      try {
        await itseApi.eliminarInspectores(id)
        if (inspectorId) {
          await itseApi.crearInspector(id, Number(inspectorId))
        }
      } catch {
        toast.error('El certificado ITSE fue modificado, pero no se pudo actualizar el inspector')
      }

      setBusqueda('ID', String(id))
      toast.success('Certificado ITSE modificado correctamente')
      navigate('/certificados-itse')
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al modificar el certificado ITSE'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loadingItse) {
    return (
      <div className="flex flex-col h-screen bg-neutral">
        <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="flex flex-1 overflow-hidden">
          <SideMenu menus={menus} isOpen={sidebarOpen} />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Cargando datos del certificado ITSE...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Enlace de regreso */}
          <button
            type="button"
            onClick={() => navigate('/certificados-itse')}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al listado
          </button>

          {/* Título */}
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Modificar ITSE
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Expediente {String(numeroExpediente).padStart(4, '0')}-{anioExpediente} — Continúa el proceso de modificación de certificado ITSE
            completando los datos requeridos
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* ── Datos principales ──────────────────────────────────────── */}
            <SeccionCard icono={IconoDocumento} titulo="Datos principales">
              <div className="space-y-4">

                {/* Fila 1: Número ITSE, Fecha expedición, Solicitud renovación, Caducidad */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Número de ITSE <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={numeroItse}
                      onChange={(e) => setNumeroItse(e.target.value)}
                      placeholder="Ej. 8273"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Fecha de expedición <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaExpedicion}
                      onChange={(e) => setFechaExpedicion(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Fecha de solicitud de renovación <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaSolicitudRenovacion}
                      onChange={(e) => setFechaSolicitudRenovacion(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Fecha de caducidad <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaCaducidad}
                      onChange={(e) => setFechaCaducidad(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Fila 2: Tipo, Resolución */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Tipo <span className="text-danger">*</span>
                    </label>
                    <select
                      value={tipoItseId}
                      onChange={(e) => {
                        setTipoItseId(e.target.value)
                        setItsePrincipalOption(null)
                      }}
                      className={selectClass}
                    >
                      <option value="">Seleccione un tipo</option>
                      {TIPOS_ITSE.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Resolución <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={resolucionNumero}
                      onChange={(e) => setResolucionNumero(e.target.value)}
                      placeholder="Ej. 023-2026-RG/MDV"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* ITSE a renovar (solo visible cuando tipo = Renovación) */}
                {Number(tipoItseId) === 2 && (
                  <div className="space-y-2">
                    <SelectorItsePrincipal
                      value={itsePrincipalOption}
                      onChange={handleItsePrincipalChange}
                      required={false}
                    />
                    {confirmarAutocomplete && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1 text-blue-800">
                          ¿Desea autocompletar el formulario con los datos de la ITSE seleccionada?
                        </span>
                        <button
                          type="button"
                          onClick={handleAceptarAutocomplete}
                          disabled={autocompletando}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                          {autocompletando ? 'Cargando...' : 'Sí, autocompletar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRechazarAutocomplete}
                          className="px-3 py-1 bg-white border border-gray-300 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Fila 3: Nivel de riesgo, Recibo de pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Nivel de riesgo <span className="text-danger">*</span>
                    </label>
                    <select
                      value={nivelRiesgoId}
                      onChange={(e) => setNivelRiesgoId(e.target.value)}
                      disabled={loadingCatalogos}
                      className={selectClass}
                    >
                      <option value="">
                        {loadingCatalogos ? 'Cargando...' : 'Seleccione un nivel'}
                      </option>
                      {nivelesRiesgo.map((n) => (
                        <option key={n.id} value={n.id}>{n.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      N° de recibo de pago
                    </label>
                    <input
                      type="text"
                      value={numeroReciboPago}
                      onChange={(e) => setNumeroReciboPago(e.target.value)}
                      placeholder="Ej. 00647587 (opcional)"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Fila 4: Inspector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Inspector
                    </label>
                    <select
                      value={inspectorId}
                      onChange={(e) => setInspectorId(e.target.value)}
                      disabled={loadingCatalogos || loadingItse}
                      className={selectClass}
                    >
                      <option value="">
                        {loadingCatalogos || loadingItse ? 'Cargando...' : '— Sin asignar —'}
                      </option>
                      {inspectores.map((insp) => (
                        <option key={insp.id} value={insp.id}>
                          {insp.apellido_paterno} {insp.apellido_materno}, {insp.nombres}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
            </SeccionCard>

            {/* ── Titular y representante legal ────────────────────────── */}
            <SeccionCard icono={IconoPersonas} titulo="Datos del titular y representante legal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectorPersona
                  label="Titular de la ITSE"
                  required
                  value={titular}
                  onChange={setTitular}
                />
                <SelectorPersona
                  label="Representante legal"
                  required
                  value={representante}
                  onChange={setRepresentante}
                />
              </div>
            </SeccionCard>

            {/* ── Información del establecimiento ──────────────────────── */}
            <SeccionCard icono={IconoEstablecimiento} titulo="Información del establecimiento">
              <div className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Nombre comercial <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombreComercial}
                    onChange={(e) => setNombreComercial(e.target.value)}
                    placeholder="Ej. CAFETERIA EL ARTESANO"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Dirección del local <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej. Av. Las Camelias 782 - Oficina 402 - San Isidro - Lima"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Capacidad de aforo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={capacidadAforo}
                      onChange={(e) => setCapacidadAforo(e.target.value)}
                      placeholder="Ej. 150"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Área (M²) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                </div>

              </div>
            </SeccionCard>

            {/* ── Giros autorizados ─────────────────────────────────────── */}
            <SeccionCard icono={IconoGiros} titulo="Giros autorizados">
              <div className="space-y-3">

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalGiroAbierto(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white
                               text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir giro
                  </button>
                </div>

                {giros.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {giros.map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10
                                   text-primary text-xs font-medium rounded-full border border-primary/20"
                      >
                        {g.ciiu_id ? `${g.ciiu_id} - ` : ''}{g.nombre}
                        <button
                          type="button"
                          onClick={() => handleEliminarGiro(g.id)}
                          className="hover:text-danger transition-colors"
                          aria-label={`Quitar ${g.nombre}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    No se han agregado giros. Haga clic en "Añadir giro" para agregar.
                  </p>
                )}

              </div>
            </SeccionCard>

            {/* ── Observaciones ────────────────────────────────────────── */}
            <SeccionCard icono={IconoTexto} titulo="Observaciones">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                placeholder="Ingrese observaciones (opcional)..."
                className={`${inputClass} resize-y`}
              />
            </SeccionCard>

            {/* ── Botones ──────────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pb-4">
              <button
                type="button"
                onClick={() => navigate('/certificados-itse')}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg
                           text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg
                           text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {submitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>

          </form>

        </main>
      </div>

      {/* Modal para agregar giro */}
      <AgregarGiroModal
        isOpen={modalGiroAbierto}
        onClose={() => setModalGiroAbierto(false)}
        girosYaAgregados={giros.map((g) => g.id)}
        onAgregarGiro={handleAgregarGiro}
      />

    </div>
  )
}
