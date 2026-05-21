import { useNavigate } from 'react-router-dom'
import { formatFecha } from '@utils/formatters'

/**
 * Tarjeta de una ITSE que debe ser renovada próximamente.
 *
 * Props
 * -----
 * itse : object — fila del endpoint /api/lf-itse/itse/por-renovar/
 */
export default function ItsePorRenovarItem({ itse }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

      {/* Información de la ITSE */}
      <div className="flex-1 min-w-0">

        {/* Cabecera: N° ITSE + badge caducidad */}
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-800">
            ITSE N° {itse.numero_itse}
          </span>
          <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
            Caduca: {formatFecha(itse.fecha_caducidad)}
          </span>
        </div>

        {/* Nombre comercial */}
        <p className="text-sm text-gray-700 font-medium mb-1 line-clamp-1" title={itse.nombre_comercial}>
          {itse.nombre_comercial}
        </p>

        {/* Dirección */}
        <p className="text-xs text-gray-500 mb-1 line-clamp-1" title={itse.direccion}>
          {itse.direccion}
        </p>

        {/* Fechas */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-0.5 text-xs text-gray-500">
          <span>
            Fecha expedición:{' '}
            <strong className="text-gray-700">{formatFecha(itse.fecha_expedicion)}</strong>
          </span>
          <span>
            Solicitud de renovación:{' '}
            <strong className="text-gray-700">{formatFecha(itse.fecha_solicitud_renovacion)}</strong>
          </span>
        </div>
      </div>

      {/* Botón de acción */}
      <button
        type="button"
        onClick={() => navigate(`/expedientes/${itse.expediente_id}`)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors sm:shrink-0 w-full sm:w-auto"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver expediente
      </button>
    </div>
  )
}
