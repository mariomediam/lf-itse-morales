import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { tiposProcedimientoTupaApi } from '@api/tiposProcedimientoTupaApi'

// ── Estilos comunes ───────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

function SeccionTitulo({ children }) {
  return (
    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-1.5 border-b border-gray-100">
      {children}
    </p>
  )
}

// ── Estado inicial ────────────────────────────────────────────────────────────

const estadoInicial = {
  codigo:                  '',
  nombre:                  '',
  monto:                   '0.00',
  plazo_atencion_dias:     0,
  dias_alerta_vencimiento: 0,
  esta_activo:             true,
  unidad_organica:         '',
  requiere_lf:             true,
  requiere_itse:           true,
}

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoGuardar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
)

const IconoCancelar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Modal para agregar o modificar un tipo de procedimiento TUPA.
 *
 * Props
 * -----
 * isOpen            : bool
 * onClose           : () => void
 * onSuccess         : () => void
 * tipo              : object | null       — si se pasa, modo edición
 * unidadesOrganicas : array               — lista de { id, nombre, sigla }
 */
export default function TipoProcedimientoTupaFormModal({
  isOpen,
  onClose,
  onSuccess,
  tipo = null,
  unidadesOrganicas = [],
}) {
  const esEdicion = !!tipo

  const [formData,     setFormData]     = useState(estadoInicial)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Poblar formulario al abrir
  useEffect(() => {
    if (!isOpen) return
    if (tipo) {
      setFormData({
        codigo:                  tipo.codigo                  ?? '',
        nombre:                  tipo.nombre                  ?? '',
        monto:                   tipo.monto                   != null ? String(tipo.monto) : '0.00',
        plazo_atencion_dias:     tipo.plazo_atencion_dias     ?? 0,
        dias_alerta_vencimiento: tipo.dias_alerta_vencimiento ?? 0,
        esta_activo:             tipo.esta_activo             ?? true,
        unidad_organica:         tipo.unidad_organica         != null ? String(tipo.unidad_organica) : '',
        requiere_lf:             tipo.requiere_lf             ?? true,
        requiere_itse:           tipo.requiere_itse           ?? true,
      })
    } else {
      setFormData({
        ...estadoInicial,
        unidad_organica: unidadesOrganicas.length > 0 ? String(unidadesOrganicas[0].id) : '',
      })
    }
  }, [isOpen, tipo, unidadesOrganicas])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleClose = () => {
    setFormData(estadoInicial)
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.codigo.trim()) {
      toast.error('El código es obligatorio')
      return
    }
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!formData.unidad_organica) {
      toast.error('Seleccione una unidad orgánica')
      return
    }

    const montoNum = parseFloat(formData.monto)
    if (isNaN(montoNum) || montoNum < 0) {
      toast.error('El monto debe ser un valor numérico mayor o igual a 0')
      return
    }

    const body = {
      codigo:                  formData.codigo.trim(),
      nombre:                  formData.nombre.trim(),
      monto:                   montoNum.toFixed(2),
      plazo_atencion_dias:     Number(formData.plazo_atencion_dias) || 0,
      dias_alerta_vencimiento: Number(formData.dias_alerta_vencimiento) || 0,
      esta_activo:             formData.esta_activo,
      unidad_organica:         Number(formData.unidad_organica),
      requiere_lf:             formData.requiere_lf,
      requiere_itse:           formData.requiere_itse,
    }

    setIsSubmitting(true)
    try {
      if (esEdicion) {
        await tiposProcedimientoTupaApi.actualizar(tipo.id, body)
      } else {
        await tiposProcedimientoTupaApi.crear(body)
      }
      toast.success(esEdicion ? 'Tipo de procedimiento actualizado correctamente' : 'Tipo de procedimiento creado correctamente')
      onSuccess?.()
      handleClose()
    } catch (err) {
      const data = err.response?.data
      const detail =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        (typeof data === 'string' ? data : null) ||
        'Error al guardar el tipo de procedimiento'
      toast.error(detail)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} size="lg" onClose={handleClose}>

      {/* ── Cabecera ── */}
      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            {esEdicion ? 'Modificar tipo de procedimiento TUPA' : 'Agregar tipo de procedimiento TUPA'}
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white overflow-y-auto max-h-[70vh] px-6 py-5 space-y-6">

        {/* Identificación */}
        <div>
          <SeccionTitulo>Identificación</SeccionTitulo>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Código <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Ej: PT-001"
                className={inputClass}
                maxLength={50}
              />
            </div>
            <div>
              <label className={labelClass}>
                Unidad orgánica <span className="text-danger">*</span>
              </label>
              <select
                name="unidad_organica"
                value={formData.unidad_organica}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                {unidadesOrganicas.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.sigla ? `${u.sigla} - ${u.nombre}` : u.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Descripción del procedimiento"
                className={inputClass}
                maxLength={250}
              />
            </div>
          </div>
        </div>

        {/* Plazos */}
        <div>
          <SeccionTitulo>Plazos</SeccionTitulo>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className={labelClass}>Plazo de atención (días hábiles)</label>
              <input
                type="number"
                name="plazo_atencion_dias"
                value={formData.plazo_atencion_dias}
                onChange={handleChange}
                min={0}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Días de alerta antes del vencimiento</label>
              <input
                type="number"
                name="dias_alerta_vencimiento"
                value={formData.dias_alerta_vencimiento}
                onChange={handleChange}
                min={0}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Monto */}
        <div>
          <SeccionTitulo>Pago por derecho de tramitación </SeccionTitulo>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Monto (S/)</label>
              <input
                type="number"
                name="monto"
                value={formData.monto}
                onChange={handleChange}
                min={0}
                step="0.01"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Opciones */}
        <div>
          <SeccionTitulo>Opciones</SeccionTitulo>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="requiere_lf"
                checked={formData.requiere_lf}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-gray-700">Requiere Licencia de Funcionamiento</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="requiere_itse"
                checked={formData.requiere_itse}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-gray-700">Requiere certificado ITSE</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="esta_activo"
                checked={formData.esta_activo}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-gray-700">Procedimiento activo</span>
            </label>
          </div>
        </div>

      </ModalBody>

      {/* ── Pie ── */}
      <ModalFooter className="border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600
            rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconoCancelar />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <IconoGuardar />
          )}
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
