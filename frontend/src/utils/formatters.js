const TIMEZONE = 'America/Lima'

export const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export const formatFechaHora = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(new Date(fechaStr).toLocaleString('en-US', { timeZone: TIMEZONE }))
  const dia  = String(d.getDate()).padStart(2, '0')
  const mes  = String(d.getMonth() + 1).padStart(2, '0')
  const hora = String(d.getHours()).padStart(2, '0')
  const min  = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()} ${hora}:${min}`
}

export const formatHora = (valor) => {
  if (valor == null || valor === '') return ''
  const texto = String(valor).trim()
  if (/^\d{1,2}$/.test(texto)) {
    const hora = Number(texto)
    if (hora >= 0 && hora <= 23) return `${String(hora).padStart(2, '0')}:00`
  }
  return texto.slice(0, 5)
}

export const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}
