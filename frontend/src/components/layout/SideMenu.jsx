import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// ── Iconos por id de menú ──────────────────────────────────────────────────────
const ICONS = {
  dashboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  expedientes: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  'licencias-funcionamiento': (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'certificados-itse': (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  reportes: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  catalogos: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  usuarios: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

// ── Icono genérico cuando no hay uno específico ────────────────────────────────
const DefaultIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
  </svg>
)

// ── Fila de submenú de nivel 2 (con soporte para nivel 3) ────────────────────
function SubMenuItemRow({ sub }) {
  const navigate = useNavigate()
  const location = useLocation()

  const hasChildren = sub.submenues?.length > 0

  const isChildActive = hasChildren
    ? sub.submenues.some((c) => location.pathname.startsWith(c.url))
    : false

  const [expanded, setExpanded] = useState(isChildActive)

  const isActive = !hasChildren && location.pathname === sub.url

  const handleClick = () => {
    if (hasChildren) {
      setExpanded((v) => !v)
    } else {
      navigate(sub.url)
    }
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className={[
          'w-[calc(100%-0.5rem)] flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
          isActive || isChildActive
            ? 'text-primary font-medium bg-primary/5'
            : 'text-gray-600 hover:text-primary hover:bg-gray-50',
        ].join(' ')}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
        <span className="flex-1 text-left leading-tight">{sub.label}</span>
        {hasChildren && (
          <svg
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Nivel 3 */}
      {hasChildren && expanded && (
        <ul className="mt-0.5 ml-4 space-y-0.5">
          {sub.submenues.map((child) => {
            const isChildItemActive = location.pathname === child.url
            return (
              <li key={child.id}>
                <button
                  onClick={() => navigate(child.url)}
                  className={[
                    'w-[calc(100%-0.5rem)] flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors',
                    isChildItemActive
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-gray-500 hover:text-primary hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                  {child.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

// ── Fila de menú nivel 1 ──────────────────────────────────────────────────────
function MenuItemRow({ item }) {
  const navigate = useNavigate()
  const location = useLocation()

  const hasSubmenu = item.submenues?.length > 0

  const isSubActive = hasSubmenu
    ? item.submenues.some((s) =>
        location.pathname.startsWith(s.url) ||
        s.submenues?.some((c) => location.pathname.startsWith(c.url))
      )
    : false

  const [expanded, setExpanded] = useState(isSubActive)

  const isActive = !hasSubmenu && location.pathname === item.url

  const handleClick = () => {
    if (hasSubmenu) {
      setExpanded((v) => !v)
    } else {
      navigate(item.url)
    }
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className={[
          'w-[calc(100%-1rem)] mx-2 flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
          isActive || isSubActive
            ? 'bg-primary/10 text-primary'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        ].join(' ')}
      >
        {ICONS[item.id] ?? <DefaultIcon />}
        <span className="flex-1 text-left leading-tight">{item.label}</span>
        {hasSubmenu && (
          <svg
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {hasSubmenu && expanded && (
        <ul className="mt-0.5 ml-4 space-y-0.5">
          {item.submenues.map((sub) => (
            <SubMenuItemRow key={sub.id} sub={sub} />
          ))}
        </ul>
      )}
    </li>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function SideMenu({ menus, isOpen }) {
  return (
    <aside
      className={[
        'bg-white border-r border-gray-200 overflow-y-auto overflow-x-hidden',
        'transition-all duration-300 ease-in-out shrink-0',
        isOpen ? 'w-64' : 'w-0',
      ].join(' ')}
    >
      {/* Ancho fijo interno para que el contenido no colapse al animar */}
      <nav className="w-64 py-4">
        <ul className="space-y-0.5">
          {menus.map((item) => (
            <MenuItemRow key={item.id} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  )
}
