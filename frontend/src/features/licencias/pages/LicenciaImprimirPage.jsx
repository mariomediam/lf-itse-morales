import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCode } from 'react-qr-code'
import { licenciasApi } from '@api/licenciasApi'
import { personasApi } from '@api/personasApi'
import { configPublicaApi } from '@api/configPublicaApi'

// ── Constantes ────────────────────────────────────────────────────────────────

const CODIGO_DNI = '01'

const TEXTO_ORDENANZA =
  'Ordenanza Nº 003-MDM-2011: Art Segundo- Establecer  de Jueves a Sabado y Vìsperas a un feriado ' +
  'como horario tope  de funcionamiento hasta las  5:00 am, y Domingo a  Miercoles como horario tope ' +
  'hasta la 1:00 am, para los locales  comerciales  como peñas,discotecas, salones de baile , karaokes, ' +
  'video pubs, night clubs y cualquier otro lugar similar  que expendan bebidas alcohólicas para su consumo.'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFechaCorta = (fechaStr) => {
  if (!fechaStr) return '-'
  const [y, m, d] = String(fechaStr).slice(0, 10).split('-')
  return `${parseInt(d)}/${parseInt(m)}/${y}`
}

const getAnio2Digitos = (fechaStr) => {
  if (!fechaStr) return '--'
  return String(new Date(fechaStr).getUTCFullYear()).slice(-2)
}

const mayus = (str) => (str ? String(str).toUpperCase() : '-')

// ── Fila etiqueta : valor (etiqueta alineada a la derecha) ───────────────────

function Fila({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px' }}>
      <span style={{
        fontWeight: 'bold',
        fontSize: '17px',
        flexShrink: 0,
        width: '168px',
        textAlign: 'right',
        marginRight: '12px',
        whiteSpace: 'nowrap',
      }}>
        {label}:
      </span>
      <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}>{children}</span>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function LicenciaImprimirPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [licencia, setLicencia] = useState(null)
  const [giros, setGiros] = useState([])
  const [docDni, setDocDni] = useState(null)
  const [titularDireccion, setTitularDireccion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [licRes, girosRes, configRes] = await Promise.all([
          licenciasApi.buscar('ID', id),
          licenciasApi.getGiros(id),
          configPublicaApi.getConfig().catch(() => ({ data: {} })),
        ])

        const lic = licRes.data[0]
        if (!lic) { setError('Licencia no encontrada.'); return }

        setLicencia(lic)
        setGiros(girosRes.data)

        const cfg = configRes.data
        if (cfg.qr_verificacion_habilitado && cfg.qr_url_verificar_licencia && lic.uuid) {
          const base = cfg.qr_url_verificar_licencia.replace(/\/+$/, '')
          setQrUrl(`${base}/${lic.uuid}`)
        }

        await Promise.all([
          lic.titular_id
            ? personasApi.buscar('ID', lic.titular_id)
              .then((r) => setTitularDireccion(r.data[0]?.direccion ?? ''))
              .catch(() => { })
            : Promise.resolve(),
          lic.conductor_id
            ? personasApi.getDocumentos(lic.conductor_id)
              .then((r) => {
                setDocDni(
                  r.data.find((d) => d.tipos_documento_identidad_codigo === CODIGO_DNI) ?? null,
                )
              })
              .catch(() => { })
            : Promise.resolve(),
        ])
      } catch {
        setError('Error al cargar los datos de la licencia.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  // ── Carga ────────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Cargando licencia...</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (error || !licencia) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || 'Licencia no encontrada.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  // ── Datos calculados ──────────────────────────────────────────────────────────

  const sufijo = licencia.es_vigencia_indeterminada ? 'D' : 'P'
  const anio2 = getAnio2Digitos(licencia.fecha_emision)
  const numeroFormateado = `${licencia.numero_licencia}-${sufijo}-${anio2}`

  const giroTexto = giros.length > 0
    ? giros.map((g) => g.nombre.toUpperCase()).join(' Y ')
    : '-'

  const vigenciaTexto = licencia.es_vigencia_indeterminada
    ? 'INDETERMINADA'
    : `${formatFechaCorta(licencia.fecha_inicio_vigencia)} AL ${formatFechaCorta(licencia.fecha_fin_vigencia)}`

  // ── Colores ───────────────────────────────────────────────────────────────────

  const azulOscuro = '#002060'
  const azulBorde = '#003087'
  const verdeFooter = '#006600'

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
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
            height: 210mm !important;
            min-height: auto !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* ── Barra de acciones (solo pantalla) ── */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
        <span className="text-sm text-gray-500 ml-2">
          Vista previa — LIC. N° {numeroFormateado}
        </span>
      </div>

      {/* ── Fondo gris (pantalla) ── */}
      <div className="print-bg-wrapper" style={{ backgroundColor: '#d1d5db', minHeight: '100vh', paddingTop: '28px', paddingBottom: '28px' }}>

        {/* ── Hoja A4 landscape: 297mm × 210mm ── */}
        <div className="print-page" style={{
          width: '297mm',
          height: '210mm',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          color: '#000000',
          boxSizing: 'border-box',
          padding: '10mm',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* ── Borde exterior azul ── */}
          <div style={{
            border: `4px solid ${azulBorde}`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>

            {/* ── Borde interior azul ── */}
            <div style={{
              border: `4px solid ${azulBorde}`,
              margin: '3px',
              flex: 1,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>

              {/* ── Marca de agua ── */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/images/escudo-muni.png)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '55%',
                opacity: 0.07,
                pointerEvents: 'none',
                zIndex: 0,
              }} />

              {/* ── Contenido sobre la marca de agua ── */}
              <div style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '5px 12px 0 12px',
              }}>

                {/* ════════ ENCABEZADO ════════ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>

                  <img
                    src="/images/escudo-peru.jpg"
                    alt="Escudo del Perú"
                    style={{ height: '100px', width: 'auto', flexShrink: 0 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />

                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{
                      margin: '0 0 2px',
                      fontWeight: 'bold',
                      fontSize: '28px',
                      color: azulOscuro,
                      letterSpacing: '0.5px',
                      lineHeight: '1.15',
                    }}>
                      MUNICIPALIDAD DISTRITAL DE MORALES
                    </p>
                    <p style={{
                      margin: '0 0 2px',
                      fontWeight: 'bold',
                      fontSize: '17px',
                      color: azulOscuro,
                    }}>
                      GERENCIA DE DESARROLLO TERRITORIAL Y ECONÓMICO
                    </p>
                    <p style={{ margin: 0, fontSize: '12.7px' }}>
                      DECRETO LEY Nº 28976 ORDENANZA MUNICIPAL Nº 009-2014-MDM
                    </p>
                  </div>

                  <img
                    src="/images/escudo-muni.png"
                    alt="Escudo Municipal"
                    style={{ height: '100px', width: 'auto', flexShrink: 0 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>

                {/* Separador azul */}
                {/* <hr style={{ border: 'none', borderTop: `1px solid ${azulBorde}`, margin: '0 0 5px' }} /> */}

                {/* ════════ TÍTULO ════════ */}
                <p style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '29px',
                  color: azulOscuro,
                  margin: '0 0 2px',
                  letterSpacing: '0.4px',
                }}>
                  LICENCIA MUNICIPAL DE FUNCIONAMIENTO N° {numeroFormateado}
                </p>

                {/* Nombre Comercial */}
                <p style={{ textAlign: 'center', fontSize: '12px', margin: '6px 0 1px', letterSpacing: '1.5px' }}>
                  NOMBRE COMERCIAL
                </p>
                <p style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '30px',
                  margin: '8px 0 6px',
                  lineHeight: '1.2',
                }}>
                  &ldquo;{mayus(licencia.nombre_comercial)}&rdquo;
                </p>

                {/* ════════ DATOS ════════ */}

                <Fila label="RAZÓN SOCIAL">{mayus(licencia.titular_nombre)}</Fila>

                {/* RUC + Resolución (misma fila, extremos) */}
                {/* <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3.5px', fontSize: '12px' }}>
                  <span style={{ paddingLeft: '174px' }}>
                    <b>RUC:</b>&nbsp;{licencia.titular_ruc || '-'}
                  </span>
                  <span>{licencia.resolucion_numero || '-'}</span>
                </div> */}


                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '17px',
                    flexShrink: 0,
                    width: '168px',
                    textAlign: 'right',
                    marginRight: '12px',
                    whiteSpace: 'nowrap',
                  }}>
                    RUC:
                  </span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}>{licencia.titular_ruc || '-'}</span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}>{licencia.resolucion_numero || '-'}</span>
                </div>





                <Fila label="UBICACIÓN">{mayus(licencia.direccion)}</Fila>
                <Fila label="SOLICITADO POR">{mayus(licencia.conductor_nombre)}</Fila>
                <Fila label="DNI">{docDni?.numero_documento || '-'}</Fila>
                <Fila label="DOMICILIO FISCAL">{mayus(titularDireccion)}</Fila>
                <Fila label="ACTIVIDAD">{mayus(licencia.actividad)}</Fila>
                <Fila label="GIRO DEL NEGOCIO">{giroTexto}</Fila>

                {/* Área + Horario (misma fila) */}
                {/* <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px', fontSize: '12px' }}>
                  <span style={{ width: '168px', textAlign: 'right', marginRight: '6px', fontWeight: 'bold', flexShrink: 0 }}>
                    Área Autorizada:
                  </span>
                  <span style={{ flex: 1 }}>
                    *****{licencia.area != null ? Number(licencia.area).toFixed(2) : '-'} m²*****
                  </span>
                  <span style={{ marginLeft: '24px' }}>
                    <b>Horario:</b>&nbsp;
                    {licencia.hora_desde != null && licencia.hora_hasta != null
                      ? `${licencia.hora_desde} - ${licencia.hora_hasta} horas`
                      : '-'}
                  </span>
                </div> */}
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '17px',
                    flexShrink: 0,
                    width: '168px',
                    textAlign: 'right',
                    marginRight: '12px',
                    whiteSpace: 'nowrap',
                  }}>
                    Área Autorizada:
                  </span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}> *****{licencia.area != null ? Number(licencia.area).toFixed(2) : '-'} m²*****</span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}><b>Horario:</b>&nbsp;
                    {licencia.hora_desde != null && licencia.hora_hasta != null
                      ? `${licencia.hora_desde} - ${licencia.hora_hasta} horas`
                      : '-'}</span>
                </div>

                {/* <Fila label="TIPO ESTABLECIMIENTO">{mayus(licencia.tipo_establecimiento)}</Fila> */}

                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '17px',
                    flexShrink: 0,
                    width: '210px',
                    textAlign: 'right',
                    marginRight: '12px',
                    whiteSpace: 'nowrap',
                  }}>
                    TIPO ESTABLECIMIENTO:
                  </span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}> {mayus(licencia.tipo_establecimiento)}</span>

                </div>

                {/* Inscrita + Fecha (misma fila) */}
                {/* <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px', fontSize: '12px' }}>
                  <span style={{ width: '168px', textAlign: 'right', marginRight: '6px', fontWeight: 'bold', flexShrink: 0 }}>
                    Inscrita en la Base de Datos con Código:
                  </span>
                  <span style={{ flex: 1 }}>
                    <b>{licencia.codigo_inscripcion || '-'}</b>
                  </span>
                  <span style={{ marginLeft: '32px' }}>
                    <b>Fecha:</b>&nbsp;{formatFechaCorta(licencia.fecha_emision)}
                  </span>
                </div> */}


                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '17px',
                    flexShrink: 0,
                    width: '330px',
                    textAlign: 'right',
                    marginRight: '12px',
                    whiteSpace: 'nowrap',
                  }}>
                    Inscrita en la Base de Datos con Código:
                  </span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1 }}> {licencia.codigo_inscripcion || '-'}<b style={{ marginLeft: '195px' }}>Fecha:</b>&nbsp;{formatFechaCorta(licencia.fecha_emision)}</span>

                </div>

                {/* Vigencia */}
                {/* <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ width: '168px', textAlign: 'right', marginRight: '6px', fontWeight: 'bold', flexShrink: 0 }}>
                    VIGENCIA:
                  </span>
                  <span style={{ fontWeight: 'bold' }}>{vigenciaTexto}</span>
                </div> */}

                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5px' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '17px',
                    flexShrink: 0,
                    width: '168px',
                    textAlign: 'right',
                    marginRight: '12px',
                    whiteSpace: 'nowrap',
                  }}>
                    Vigencia:
                  </span>
                  <span style={{ fontSize: '17px', lineHeight: '1.45', flex: 1, fontWeight: 'bold' }}> {vigenciaTexto}</span>

                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {licencia.imprime_ordenanza_horario && (
                    <p style={{
                      width: '55%',
                      fontSize: '12px',
                      lineHeight: '1.45',
                      margin: '2px 0 4px 12px',
                      textAlign: 'justify',
                    }}>
                      {TEXTO_ORDENANZA}
                    </p>
                  )}
                  {qrUrl && (
                    <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <QRCode value={qrUrl} size={72} level="M" />
                      <p style={{ fontSize: '7px', margin: '3px 0 0 0', textAlign: 'center', color: '#555' }}>
                        Verificar documento
                      </p>
                    </div>
                  )}
                </div>



                {/* Espaciador */}
                <div style={{ flex: 1 }} />

                {/* ════════ PIE DE PÁGINA ════════ */}
                <div style={{

                  paddingTop: '4px',
                  paddingBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold', color: verdeFooter }}>
                    ESTE DOCUMENTO NO DEBE CONTENER BORRONES NI ENMENDADURAS PARA SU VALIDEZ
                  </span>
                  
                  <span style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold', color: verdeFooter, textAlign: 'right' }}>
                    ESTE DOCUMENTO SE DEBERA COLOCAR EN UN LUGAR VISIBLE
                  </span>
                </div>

              </div>{/* fin contenido */}
            </div>{/* fin borde interior */}
          </div>{/* fin borde exterior */}
        </div>{/* fin hoja A4 landscape */}
      </div>{/* fin fondo gris */}
    </>
  )
}
