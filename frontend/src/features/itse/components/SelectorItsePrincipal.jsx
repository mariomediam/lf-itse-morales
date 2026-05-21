import { useRef, useCallback } from 'react'
import AsyncSelect from 'react-select/async'
import { itseApi } from '@api/itseApi'

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#003366' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(0,51,102,0.2)' : 'none',
    fontSize: '0.875rem',
    minHeight: '38px',
    cursor: 'text',
    '&:hover': { borderColor: '#003366' },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.8125rem',
    backgroundColor: state.isSelected ? '#003366' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    cursor: 'pointer',
    padding: '8px 12px',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
  singleValue: (base) => ({ ...base, fontSize: '0.875rem', color: '#374151' }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    zIndex: 50,
  }),
  noOptionsMessage: (base) => ({ ...base, fontSize: '0.8125rem', color: '#6b7280' }),
  loadingMessage:   (base) => ({ ...base, fontSize: '0.8125rem', color: '#6b7280' }),
  clearIndicator:   (base) => ({ ...base, cursor: 'pointer' }),
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SelectorItsePrincipal({ value, onChange, required = true }) {
  const debounceRef = useRef(null)

  const loadOptions = useCallback((inputValue, callback) => {
    clearTimeout(debounceRef.current)

    const texto = inputValue?.trim() ?? ''
    if (texto.length < 1) {
      callback([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const filtro = /^\d+$/.test(texto) ? 'NUMERO' : 'NOMBRE_COMERCIAL'
      try {
        const res = await itseApi.buscar(filtro, texto)
        callback(
          (res.data || []).map((item) => ({
            value: item.id,
            label: `N° ${item.numero_itse}  |  ${formatFecha(item.fecha_expedicion)}  |  ${item.nombre_comercial}`,
            data: item,
          }))
        )
      } catch {
        callback([])
      }
    }, 400)
  }, [])

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        ITSE a renovar {required && <span className="text-danger">*</span>}
      </label>
      <AsyncSelect
        loadOptions={loadOptions}
        value={value}
        onChange={onChange}
        isClearable
        placeholder="Ingrese el número o nombre comercial de la ITSE..."
        noOptionsMessage={({ inputValue }) =>
          !inputValue || inputValue.trim().length < 1
            ? 'Escriba para buscar...'
            : 'Sin resultados'
        }
        loadingMessage={() => 'Buscando...'}
        styles={selectStyles}
      />
      <p className="mt-1 text-xs text-gray-400">
        Si ingresa solo números busca por N° de ITSE, de lo contrario busca por nombre comercial.
      </p>
    </div>
  )
}
