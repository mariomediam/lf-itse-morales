"""
Servicios de negocio para Usuarios.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from auditlog.context import set_actor
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import UsuarioPerfil

User = get_user_model()


class UsuarioTieneRegistrosError(Exception):
    pass


def obtener_opciones_usuario(usuario_id: int) -> dict:
    """
    Retorna las opciones del sistema a las que tiene acceso el usuario.

    Si el usuario no existe o no está activo (``is_active = False``),
    devuelve un diccionario con todas las opciones en ``False``, equivalente
    a no tener acceso a ninguna opción.

    Parámetros
    ----------
    usuario_id : int
        PK del usuario en la tabla auth_user.

    Retorna
    -------
    dict con las claves:
      - expedientes  (bool)
      - licencias    (bool)
      - itse         (bool)
      - admin        (bool)

    Ejemplos
    --------
    >>> obtener_opciones_usuario(5)
    {'expedientes': True, 'licencias': True, 'itse': False, 'admin': False}

    >>> obtener_opciones_usuario(99)   # usuario inactivo o sin perfil
    {'expedientes': False, 'licencias': False, 'itse': False, 'admin': False}
    """
    _sin_acceso = {
        'expedientes': False,
        'licencias': False,
        'itse': False,
        'admin': False,
    }

    try:
        usuario = User.objects.get(pk=usuario_id)
    except User.DoesNotExist:
        return _sin_acceso

    if not usuario.is_active:
        return _sin_acceso

    try:
        perfil = UsuarioPerfil.objects.get(user_id=usuario_id)
    except UsuarioPerfil.DoesNotExist:
        return _sin_acceso

    return {
        'expedientes': perfil.expedientes,
        'licencias': perfil.licencias,
        'itse': perfil.itse,
        'admin': perfil.admin,
    }


def construir_menu_usuario(usuario_id: int) -> list[dict]:
    """
    Construye la estructura de menús a los que tiene acceso el usuario.

    Reglas de visibilidad
    ---------------------
    - Dashboard y Reportes (con sus submenús): siempre visibles.
    - Expedientes:  requiere ``opciones['expedientes'] = True``.
    - Licencias de funcionamiento: requiere ``opciones['licencias'] = True``.
    - Certificados ITSE: requiere ``opciones['itse'] = True``.
    - Catálogos (con sus submenús): visible si el usuario tiene al menos uno de
      ``expedientes``, ``licencias``, ``itse`` o ``admin``.
    - Usuarios: requiere ``opciones['admin'] = True``.

    Parámetros
    ----------
    usuario_id : int
        PK del usuario en la tabla auth_user.

    Retorna
    -------
    list[dict]
        Lista de menús ordenados según el diseño del sistema.
        Cada elemento contiene:
          - id        (str)  identificador único del menú
          - label     (str)  texto a mostrar en la interfaz
          - url       (str)  ruta del frontend
          - submenues (list) lista de submenús con la misma estructura
    """
    opciones = obtener_opciones_usuario(usuario_id)

    tiene_catalogo = (
        opciones['expedientes']
        or opciones['licencias']
        or opciones['itse']
        or opciones['admin']
    )

    menus: list[dict] = []

    # --- Dashboard (siempre visible) ---
    menus.append({
        'id': 'dashboard',
        'label': 'Dashboard',
        'url': '/dashboard',
        'submenues': [],
    })

    # --- Expedientes ---
    if opciones['expedientes']:
        menus.append({
            'id': 'expedientes',
            'label': 'Expedientes',
            'url': '/expedientes',
            'submenues': [],
        })

    # --- Licencias de funcionamiento ---
    if opciones['licencias']:
        menus.append({
            'id': 'licencias-funcionamiento',
            'label': 'Licencias de funcionamiento',
            'url': '/licencias-funcionamiento',
            'submenues': [],
        })

    # --- Certificados ITSE ---
    if opciones['itse']:
        menus.append({
            'id': 'certificados-itse',
            'label': 'Certificados ITSE',
            'url': '/certificados-itse',
            'submenues': [],
        })

    # --- Reportes (siempre visible) ---
    menus.append({
        'id': 'reportes',
        'label': 'Reportes',
        'url': '/reportes',
        'submenues': [
            {
                'id': 'reportes-expedientes',
                'label': 'Expedientes',
                'url': '/reportes/expedientes',
                'submenues': [],
            },
            {
                'id': 'reportes-licencias-funcionamiento',
                'label': 'Licencias de funcionamiento',
                'url': '/reportes/licencias-funcionamiento',
                'submenues': [],
            },
            {
                'id': 'reportes-certificados-itse',
                'label': 'Certificados ITSE',
                'url': '/reportes/certificados-itse',
                'submenues': [
                    {
                        'id': 'reportes-certificados-itse-reporte',
                        'label': 'Reporte',
                        'url': '/reportes/certificados-itse',
                        'submenues': [],
                    },
                    {
                        'id': 'reportes-certificados-itse-por-renovar',
                        'label': 'Por renovar',
                        'url': '/reportes/certificados-itse/por-renovar',
                        'submenues': [],
                    },
                ],
            },
        ],
    })

    # --- Catálogos ---
    if tiene_catalogo:
        menus.append({
            'id': 'catalogos',
            'label': 'Catálogos',
            'url': '/catalogos',
            'submenues': [
                {
                    'id': 'catalogos-personas',
                    'label': 'Personas',
                    'url': '/catalogos/personas',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-giros',
                    'label': 'Giros',
                    'url': '/catalogos/giros',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-inspectores',
                    'label': 'Inspectores',
                    'url': '/catalogos/inspectores',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-zonificaciones',
                    'label': 'Zonificaciones',
                    'url': '/catalogos/zonificaciones',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-tipos-procedimiento-tupa',
                    'label': 'Tipo de procedimiento TUPA',
                    'url': '/catalogos/tipos-procedimiento-tupa',
                    'submenues': [],
                },
            ],
        })

    # --- Usuarios ---
    if opciones['admin']:
        menus.append({
            'id': 'usuarios',
            'label': 'Usuarios',
            'url': '/usuarios',
            'submenues': [],
        })

    return menus


# ── CRUD de usuarios ───────────────────────────────────────────────────────────

def listar_usuarios() -> list:
    """
    Retorna todos los usuarios del sistema ordenados por username.
    Incluye el perfil de permisos si existe.
    """
    return list(
        User.objects
        .select_related('perfil_lf_itse')
        .order_by('username')
    )


def crear_usuario(data: dict, digitador) -> object:
    """
    Crea un usuario y su perfil de permisos.

    Parámetros
    ----------
    data : dict
        Claves esperadas:
          - username     (str, obligatorio)
          - password     (str, obligatorio)
          - first_name   (str, opcional)
          - last_name    (str, opcional)
          - email        (str, opcional)
          - is_active    (bool, opcional, default True)
          - perfil       (dict con expedientes, licencias, itse, admin)
    digitador :
        Usuario autenticado que realiza la operación.

    Retorna
    -------
    User
    """
    perfil_data = data.pop('perfil')
    password    = data.pop('password')

    with set_actor(digitador), transaction.atomic():
        user = User(**data)
        user.set_password(password)
        user.save()

        UsuarioPerfil.objects.create(
            user=user,
            user_digitador=digitador,
            fecha_digitacion=timezone.now(),
            **perfil_data,
        )
    return User.objects.select_related('perfil_lf_itse').get(pk=user.pk)


def actualizar_usuario(pk: int, data: dict, usuario) -> object:
    """
    Actualiza un usuario y su perfil de permisos.

    Parámetros
    ----------
    pk : int
        PK del usuario a actualizar.
    data : dict
        Mismas claves que crear_usuario; ``password`` es opcional.

    Retorna
    -------
    User
    """
    user = get_object_or_404(User, pk=pk)

    perfil_data = data.pop('perfil')
    password    = data.pop('password', None)

    with set_actor(usuario), transaction.atomic():
        for campo, valor in data.items():
            setattr(user, campo, valor)
        if password:
            user.set_password(password)
        user.save()

        try:
            perfil = user.perfil_lf_itse
            for campo, valor in perfil_data.items():
                setattr(perfil, campo, valor)
            perfil.save()
        except UsuarioPerfil.DoesNotExist:
            UsuarioPerfil.objects.create(
                user=user,
                user_digitador=usuario,
                fecha_digitacion=timezone.now(),
                **perfil_data,
            )

    return User.objects.select_related('perfil_lf_itse').get(pk=user.pk)


def eliminar_usuario(pk: int, usuario) -> None:
    """
    Elimina un usuario y su perfil de permisos.

    Verifica que el usuario no tenga registros digitados en el sistema antes
    de proceder.  Si tiene registros, lanza ``UsuarioTieneRegistrosError``.

    Parámetros
    ----------
    pk : int
        PK del usuario a eliminar.

    Lanza
    -----
    UsuarioTieneRegistrosError
        Si el usuario tiene registros asociados en el sistema.
    """
    user = get_object_or_404(User, pk=pk)

    checks = [
        (user.expedientes_digitados,              'expedientes'),
        (user.expedientes_ampliacion_digitadas,   'expedientes con ampliación de plazo'),
        (user.licencias_funcionamiento_digitadas, 'licencias de funcionamiento'),
        (user.itse_digitados,                     'certificados ITSE'),
        (user.persona_set,                        'personas'),
        (user.tipoprocedimientotupa_set,          'tipos de procedimiento TUPA'),
        (user.zonificacion_set,                   'zonificaciones'),
        (user.giro_set,                           'giros'),
        (user.autorizacionimprocedente_set,       'autorizaciones improcedentes'),
        (user.expedientearchivo_set,              'archivos de expedientes'),
        (user.licenciafuncionamientoarchivo_set,  'archivos de licencias de funcionamiento'),
        (user.licenciafuncionamientoestado_set,   'estados de licencias de funcionamiento'),
        (user.licenciafuncionamientogiro_set,     'giros de licencias de funcionamiento'),
        (user.itsearchivo_set,                    'archivos de certificados ITSE'),
        (user.itseestado_set,                     'estados de certificados ITSE'),
        (user.itsegiro_set,                       'giros de certificados ITSE'),
        (user.perfiles_digitados,                 'perfiles de otros usuarios'),
        (user.feriadoanual_set,                   'feriados'),
    ]

    for manager, nombre in checks:
        if manager.exists():
            raise UsuarioTieneRegistrosError(
                f'El usuario tiene {nombre} registrados y no puede ser eliminado.'
            )

    with set_actor(usuario), transaction.atomic():
        user.delete()


def cambiar_password(pk: int, nueva_password: str) -> None:
    """
    Cambia la contraseña del usuario indicado.

    Parámetros
    ----------
    pk : int
        PK del usuario.
    nueva_password : str
        Nueva contraseña en texto plano (mínimo 6 caracteres).
    """
    user = get_object_or_404(User, pk=pk)
    user.set_password(nueva_password)
    user.save(update_fields=['password'])
