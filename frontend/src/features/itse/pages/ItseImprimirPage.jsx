import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCode } from 'react-qr-code'
import { itseApi } from '@api/itseApi'
import { configPublicaApi } from '@api/configPublicaApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
]
const DECENAS  = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

const numeroALetras = (n) => {
  if (n === null || n === undefined) return '-'
  const num = parseInt(n, 10)
  if (isNaN(num) || num < 0) return '-'
  if (num === 0) return 'CERO'
  if (num < 20) return UNIDADES[num]
  if (num < 30) return num === 20 ? 'VEINTE' : 'VEINTI' + UNIDADES[num - 20]
  if (num < 100) {
    const d = Math.floor(num / 10), u = num % 10
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`
  }
  if (num === 100) return 'CIEN'
  const c = Math.floor(num / 100), r = num % 100
  return r === 0 ? CENTENAS[c] : `${CENTENAS[c]} ${numeroALetras(r)}`
}

const getAnio = (fechaStr) => {
  if (!fechaStr) return '-'
  return new Date(fechaStr).getUTCFullYear()
}

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`
}

const calcularVigencia = (fechaInicio, fechaFin) => {
  if (!fechaInicio || !fechaFin) return '-'
  const anios = Math.round((new Date(fechaFin) - new Date(fechaInicio)) / (365.25 * 24 * 60 * 60 * 1000))
  if (anios >= 1) return `${String(anios).padStart(2, '0')} ${anios === 1 ? 'AÑO' : 'AÑOS'}`
  const meses = Math.round((new Date(fechaFin) - new Date(fechaInicio)) / (30 * 24 * 60 * 60 * 1000))
  return `${String(meses).padStart(2, '0')} ${meses === 1 ? 'MES' : 'MESES'}`
}

// ── Página principal ──────────────────────────────────────────────────────────

const ItseImprimirPage = () => {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [itse,     setItse]     = useState(null)
  const [giros,    setGiros]    = useState([])
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState(null)
  const [qrUrl,    setQrUrl]    = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true)
        const [itseRes, girosRes, configRes] = await Promise.all([
          itseApi.buscar('ID', id),
          itseApi.getGiros(id),
          configPublicaApi.getConfig().catch(() => ({ data: {} })),
        ])
        const item = itseRes.data[0]
        if (!item) { setError('Certificado ITSE no encontrado.'); return }
        setItse(item)
        setGiros(girosRes.data)

        const cfg = configRes.data
        if (cfg.qr_verificacion_habilitado && cfg.qr_url_verificar_itse && item.uuid) {
          const base = cfg.qr_url_verificar_itse.replace(/\/+$/, '')
          setQrUrl(`${base}/${item.uuid}`)
        }
      } catch {
        setError('Error al cargar los datos del certificado ITSE.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Cargando certificado ITSE...</p>
        </div>
      </div>
    )
  }

  if (error || !itse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || 'Certificado ITSE no encontrado.'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
            Volver
          </button>
        </div>
      </div>
    )
  }

  // ── Datos calculados ────────────────────────────────────────────────────────
  const anioItse      = getAnio(itse.fecha_expedicion)
  const anioExpediente = getAnio(itse.fecha_recepcion)
  const girosTexto    = giros.map((g) => g.nombre).join(', ')
  const vigencia      = calcularVigencia(itse.fecha_expedicion, itse.fecha_caducidad)
  const aforo         = itse.capacidad_aforo
  const aforoLetras   = numeroALetras(aforo)
  const aforoPadded   = aforo != null ? String(aforo).padStart(2, '0') : '--'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-bg-wrapper {
            background: white !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-page {
            margin: 0 !important;
            height: 297mm !important;
            min-height: auto !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Barra de acciones */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
        <span className="text-sm text-gray-500 ml-2">
          Vista previa — ITSE N° {itse.numero_itse} - {anioItse}
        </span>
      </div>

      {/* Fondo gris para previsualización */}
      <div className="print-bg-wrapper" style={{ backgroundColor: '#d1d5db', minHeight: '100vh', paddingTop: '32px', paddingBottom: '32px' }}>

        {/* Hoja A4 */}
        <div className="print-page" style={{
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          padding: '12mm 23mm 10mm 23mm',
          boxSizing: 'border-box',
          fontFamily: 'Times New Roman, Times, serif',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>

          {/* ── MARCA DE AGUA ESCUDO ── */}
          <img
            src="/images/escudo-muni.png"
            alt=""
            style={{
              position: 'absolute',
              top: '55%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '160mm',
              height: 'auto',
              opacity: 0.12,
              zIndex: 0,
              pointerEvents: 'none',
            }}
            onError={(e) => { e.target.style.display = 'none' }}
          />

          {/* ── TRIÁNGULO CELESTE ── */}
          <svg
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '5%',
              zIndex: 0,
              display: 'block',
              padding: '0 15mm 15px 15mm',
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon points="0,0 0,100 100,100" fill="#D6EEFB" />
          </svg>

          {/* Contenido sobre la marca de agua */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>

            {/* ── ESCUDO ── */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <img
                src="/images/escudo-muni.png"
                alt="Escudo Municipal"
                style={{ height: '110px', width: 'auto' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>

            {/* ── TÍTULO ── */}
            <p style={{
              fontWeight: 'bold',
              fontSize: '18px',
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: '0 0 8px 0',
              lineHeight: '1.2',
            }}>
              CERTIFICADO DE INSPECCIÓN TÉCNICA DE SEGURIDAD EN EDIFICACIONES PARA
              ESTABLECIMIENTOS OBJETO DE INSPECCIÓN CLASIFICADOS CON NIVEL DE{' '}
              {itse.nivel_riesgo_nombre || 'RIESGO MEDIO'}{' '}
              SEGÚN LA MATRIZ DE RIESGOS.
            </p>

            {/* ── N° ITSE ── */}
            <p style={{
              fontWeight: 'bold',
              fontSize: '15px',
              textAlign: 'center',
              margin: '0 0 10px 0',
              letterSpacing: '1px',
            }}>
              N° {itse.numero_itse} - {anioItse}
            </p>

            {/* ── PÁRRAFO INTRODUCTORIO ── */}
            <p style={{ fontSize: '14px', textAlign: 'justify', margin: '0 0 1px 0', lineHeight: '1.2' }}>
              El órgano ejecutante de la Municipalidad Distrital de Morales, en cumplimiento de lo
              establecido en el D.S. N° 002-2018-PCM, ha realizado la Inspección Técnica de Seguridad en
              Edificaciones, al Establecimiento Objeto de Inspección:
            </p>

            {/* ── NOMBRE COMERCIAL ── */}
            <p style={{
              fontWeight: 'bold',              
              fontSize: '38px',
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: '0 0 6px 0',
              lineHeight: '1.3',
            }}>
              &ldquo;{itse.nombre_comercial || '-'}&rdquo;
            </p>

            {/* ── UBICADO EN ── */}
            <p style={{ fontSize: '14px', margin: '0 0 2px 0', lineHeight: '1.5' }}>
              Ubicado en:<strong> {itse.direccion || '-'}</strong>
            </p>
            <p style={{ fontSize: '14px', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              Distrito: Morales, Provincia: San Martín,{' '}
              Departamento: San Martín
            </p>

            {/* ── SOLICITADO POR ── */}
            <p style={{ fontSize: '14px', margin: '6px 0 2px 0', lineHeight: '1.5' }}>
              Solicitado por:<strong> {itse.conductor_nombre || '-'}</strong>
            </p>

            {/* ── CERTIFICA ── */}
            <p style={{ fontSize: '14px', textAlign: 'justify', margin: '8px 0 8px 0', lineHeight: '1.2' }}>
              El que suscribe <strong><em>CERTIFICA</em></strong> que el objeto de la Inspección antes
              señalado <strong><em>CUMPLE</em></strong> con la normativa en materia de seguridad en
              edificaciones vigente.
            </p>

            {/* ── CAPACIDAD ── */}
            <p style={{ fontSize: '14px', margin: '8px 0 4px 0', lineHeight: '1.5' }}>
              Capacidad Máxima de la Edificación:<strong> {' '}
              {aforoLetras.charAt(0) + aforoLetras.slice(1).toLowerCase()} ({aforoPadded}) personas.</strong>
            </p>

            {/* ── GIRO ── */}
            <p style={{ fontSize: '14px', margin: '8px 0 4px 0', lineHeight: '1.5' }}>
              Giro o Función de la Edificación:<strong> {' '}
              {girosTexto || '-'} 
              </strong>
            </p>

            {/* ── ÁREA ── */}
            <p style={{ fontSize: '14px', margin: '8px 0 8px 0', lineHeight: '1.5' }}>
              Área Ocupada de la Edificación:<strong> {' '}
              {itse.area != null ? `${parseFloat(itse.area).toFixed(2)} m2` : '-'}
              </strong>
            </p>

            {/* ── EXPEDIENTE + RESOLUCIÓN ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '14px', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                Expediente N°:<strong> {' '}
                {itse.numero_expediente ? `${itse.numero_expediente}-${anioExpediente}` : '-'}
                </strong>
              </p>
              <p style={{ fontSize: '14px', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                Resolución N°:<strong> {' '}
                {itse.resolucion_numero || '-'}
                </strong>
              </p>
            </div>

            {/* ── VIGENCIA + LUGAR ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '14px', margin: '12px 0 0 0', textTransform: 'uppercase' }}>
                VIGENCIA: {vigencia}*
              </p>
              <div style={{ textAlign: 'Left' }}>
                <p style={{ fontSize: '14px', margin: '12px 0 3px 0' }}>
                  LUGAR:<strong> Morales</strong>
                </p>
                <p style={{ fontSize: '14px', margin: '12px 0 3px 0' }}>
                  FECHA DE EXPEDICIÓN:<strong> {formatFecha(itse.fecha_expedicion)}</strong>
                </p>
                <p style={{ fontSize: '14px', margin: '12px 0 3px 0' }}>
                  FECHA DE SOLICITUD DE RENOVACIÓN:<strong> {formatFecha(itse.fecha_solicitud_renovacion)}</strong>
                </p>
                <p style={{ fontSize: '14px', margin: '12px 0 0 0' }}>
                  FECHA DE CADUCIDAD:<strong> {formatFecha(itse.fecha_caducidad)}</strong>
                </p>
              </div>
            </div>

            {/* Espaciador */}
            <div style={{ flex: 1 }} />

            {/* ── NOTA LEGAL ── */}
            <div style={{ marginTop: '12px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '9px', textAlign: 'justify', margin: '0 0 4px 0', lineHeight: '1.4', fontWeight: 'bold' }}>
                  &quot;*El presente Certificado de ITSE no constituye autorización alguna para el funcionamiento
                  del Establecimiento Objeto de Inspección o para el inicio de la actividad&quot;.
                </p>
                <p style={{ fontWeight: 'bold', fontSize: '8.5px', margin: '0 0 1px 0', lineHeight: '1.1' }}>NOTA:</p>
                {[
                  'DE ACUERDO A LO ESTABLECIDO EN EL REGLAMENTO DE INSPECCIONES TÉCNICAS DE SEGURIDAD EN EDIFICACIONES APROBADO POR DECRETO SUPREMO N° 002-2018 PCM, EL PRESENTE CERTIFICADO DEBERÁ SER FIRMADO POR EL RESPONSABLE DEL ÓRGANO EJECUTANTE.',
                  'ESTE CERTIFICADO DEBERÁ COLOCARSE EN UN LUGAR VISIBLE DENTRO DEL ESTABLECIMIENTO OBJETO DE INSPECCIÓN.',
                  'CUALQUIER TACHA O ENMENDADURA INVALIDA EL PRESENTE CERTIFICADO.',
                ].map((texto, i) => (
                  <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '0px' }}>
                    <span style={{ fontSize: '8.5px', flexShrink: 0 }}>-</span>
                    <p style={{ margin: 0, fontSize: '8.5px', lineHeight: '1.2' }}>{texto}</p>
                  </div>
                ))}
              </div>
              {qrUrl && (
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCode value={qrUrl} size={72} level="M" />
                  <p style={{ fontSize: '7px', margin: '3px 0 0 0', textAlign: 'center', color: '#555' }}>
                    Verificar documento
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default ItseImprimirPage
