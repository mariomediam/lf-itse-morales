"""
Servicios de negocio para Personas.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from auditlog.context import set_actor
from django.db import connection, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import Persona, PersonaDocumento


# ── Excepción de dominio ───────────────────────────────────────────────────────

class DocumentoDuplicadoError(Exception):
    """Se lanza cuando un número de documento ya está asignado a otra persona."""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _nombre_completo(persona: Persona) -> str:
    partes = [
        persona.apellido_paterno or '',
        persona.apellido_materno or '',
        persona.nombres or '',
    ]
    return ' '.join(p for p in partes if p).strip() or persona.nombres


def _verificar_documentos_unicos(
    documentos_data: list[dict],
    excluir_persona_id: int | None = None,
) -> None:
    """
    Verifica que ningún (tipo_documento, numero_documento) del listado
    esté ya asignado a otra persona.

    Lanza DocumentoDuplicadoError con un mensaje descriptivo si encuentra
    un duplicado.
    """
    for doc in documentos_data:
        qs = PersonaDocumento.objects.filter(
            tipo_documento_identidad_id=doc['tipo_documento_identidad_id'],
            numero_documento=doc['numero_documento'],
        ).select_related('persona', 'tipo_documento_identidad')

        if excluir_persona_id is not None:
            qs = qs.exclude(persona_id=excluir_persona_id)

        existente = qs.first()
        if existente:
            nombre = _nombre_completo(existente.persona)
            raise DocumentoDuplicadoError(
                f"El número de documento '{doc['numero_documento']}' "
                f"({existente.tipo_documento_identidad.nombre}) "
                f"ya se encuentra asignado a: {nombre}."
            )


def _guardar_documentos(persona: Persona, documentos_data: list[dict]) -> None:
    """Elimina los documentos actuales de la persona y crea los nuevos."""
    persona.documentos.all().delete()
    PersonaDocumento.objects.bulk_create([
        PersonaDocumento(
            persona=persona,
            tipo_documento_identidad_id=doc['tipo_documento_identidad_id'],
            numero_documento=doc['numero_documento'],
        )
        for doc in documentos_data
    ])


# ── CRUD ───────────────────────────────────────────────────────────────────────

def listar_personas() -> list[Persona]:
    """
    Retorna todas las personas ordenadas por apellido_paterno y nombres.
    """
    return list(
        Persona.objects
        .prefetch_related('documentos__tipo_documento_identidad')
        .order_by('apellido_paterno', 'apellido_materno', 'nombres')
    )


def obtener_persona(pk: int) -> Persona:
    """
    Retorna la Persona con la PK indicada junto con sus documentos.
    Lanza HTTP 404 si no existe.
    """
    return get_object_or_404(
        Persona.objects.prefetch_related('documentos__tipo_documento_identidad'),
        pk=pk,
    )


def crear_persona(data: dict, usuario) -> Persona:
    """
    Crea una Persona y sus documentos de identidad dentro de una transacción.

    Reglas
    ------
    - Verifica que ningún documento del listado esté ya asignado a otra persona.
    - Para persona jurídica ('J') fuerza apellido_paterno y apellido_materno a None.
    - Asigna fecha_creacion, fecha_actualizacion y usuario automáticamente.

    Parámetros
    ----------
    data : dict
        Datos validados por PersonaWriteSerializer.
    usuario : AUTH_USER_MODEL instance

    Retorna
    -------
    Persona
        Instancia recién creada con sus documentos.

    Lanza
    -----
    DocumentoDuplicadoError
        Si algún documento ya está asignado a otra persona.
    """
    documentos_data = data.pop('documentos')

    _verificar_documentos_unicos(documentos_data)

    if data.get('tipo_persona') == 'J':
        data['apellido_paterno'] = None
        data['apellido_materno'] = None

    now = timezone.now()

    with set_actor(usuario), transaction.atomic():
        persona = Persona.objects.create(
            **data,
            user=usuario,
            fecha_creacion=now,
            fecha_actualizacion=now,
        )
        _guardar_documentos(persona, documentos_data)

    return obtener_persona(persona.pk)


def actualizar_persona(pk: int, data: dict, usuario) -> Persona:
    """
    Actualiza los datos de una Persona y reemplaza todos sus documentos,
    dentro de una transacción.

    Parámetros
    ----------
    pk : int
        Clave primaria de la persona a actualizar.
    data : dict
        Datos validados por PersonaWriteSerializer.

    Retorna
    -------
    Persona
        Instancia actualizada con sus documentos.

    Lanza
    -----
    DocumentoDuplicadoError
        Si algún documento ya está asignado a otra persona distinta.
    """
    documentos_data = data.pop('documentos')
    persona = get_object_or_404(Persona, pk=pk)

    _verificar_documentos_unicos(documentos_data, excluir_persona_id=pk)

    if data.get('tipo_persona') == 'J':
        data['apellido_paterno'] = None
        data['apellido_materno'] = None

    for campo, valor in data.items():
        setattr(persona, campo, valor)
    persona.fecha_actualizacion = timezone.now()

    with set_actor(usuario), transaction.atomic():
        persona.save()
        _guardar_documentos(persona, documentos_data)

    return obtener_persona(persona.pk)


def eliminar_persona(pk: int, usuario) -> None:
    """
    Elimina físicamente la Persona indicada y sus documentos (CASCADE).
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria de la persona a eliminar.
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado; se usa para registrar la auditoría.
    """
    persona = get_object_or_404(Persona, pk=pk)
    with set_actor(usuario), transaction.atomic():
        persona.delete()


# Bloque NOMBRE: filtra personas cuyo nombre completo coincida parcialmente.
_SQL_FILTRO_NOMBRE = """
    SELECT p.id AS persona_id
    FROM personas p
    WHERE TRIM(
        CONCAT(COALESCE(p.apellido_paterno, ''), ' ',
        COALESCE(p.apellido_materno, ''), ' ',
        COALESCE(p.nombres, ''))
    ) ILIKE %s
"""

# Bloque DOCUMENTO: filtra por número de documento de identidad exacto.
_SQL_FILTRO_DOCUMENTO = """
    SELECT DISTINCT pd.persona_id
    FROM personas_documentos pd
    WHERE pd.numero_documento = %s
"""

# Bloque ID: filtra por clave primaria de la persona.
_SQL_FILTRO_ID = """
    SELECT %s::bigint AS persona_id
"""

# Consulta principal: recibe el bloque de filtro como subquery y
# concatena todos los documentos de identidad de cada persona en una sola celda.
_SQL_BUSCAR_PERSONAS = """
WITH personas_filtradas AS (
    {filtro}
),
documentos_concatenados AS (
    SELECT
        pf.persona_id,
        STRING_AGG(
            tdi.nombre || ' ' || pd.numero_documento,
            ', '
            ORDER BY tdi.nombre || ' ' || pd.numero_documento
        ) AS documento_concatenado
    FROM personas_filtradas pf
    LEFT JOIN personas_documentos pd
           ON pf.persona_id = pd.persona_id
    LEFT JOIN tipos_documento_identidad tdi
           ON pd.tipo_documento_identidad_id = tdi.id
    GROUP BY pf.persona_id
)
SELECT
    p.id,
    p.tipo_persona,
    p.apellido_paterno,
    p.apellido_materno,
    p.nombres,
    TRIM(
        CONCAT(COALESCE(p.apellido_paterno, ''), ' ',
        COALESCE(p.apellido_materno, ''), ' ',
        COALESCE(p.nombres, ''))
    )                       AS persona_nombre,
    p.direccion,
    p.distrito,
    p.provincia,
    p.departamento,
    p.telefono,
    p.correo_electronico,
    p.fecha_creacion,
    p.fecha_actualizacion,
    p.user_id,
    dc.documento_concatenado
FROM documentos_concatenados dc
INNER JOIN personas p ON dc.persona_id = p.id
ORDER BY TRIM(
    CONCAT(COALESCE(p.apellido_paterno, ''), ' ',
    COALESCE(p.apellido_materno, ''), ' ',
    COALESCE(p.nombres, ''))
)
"""

# Mapa de filtros: nombre → (subquery SQL, función de transformación del valor)
_FILTROS_BUSQUEDA: dict[str, tuple[str, callable]] = {
    'NOMBRE': (
        _SQL_FILTRO_NOMBRE,
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'DOCUMENTO': (
        _SQL_FILTRO_DOCUMENTO,
        str,
    ),
    'ID': (
        _SQL_FILTRO_ID,
        str,
    ),
}


def listar_documentos_persona(persona_id: int):
    """
    Retorna los documentos de identidad de una persona, con los datos del tipo
    de documento incluidos mediante select_related (equivale al LEFT JOIN de la
    consulta original).

    Parámetros
    ----------
    persona_id : int
        Clave primaria de la persona.

    Retorna
    -------
    QuerySet[PersonaDocumento]
        Instancias con ``tipo_documento_identidad`` ya cargado.

    Lanza
    -----
    Http404
        Si la persona no existe.
    """
    get_object_or_404(Persona, pk=persona_id)
    return (
        PersonaDocumento.objects
        .filter(persona_id=persona_id)
        .select_related('tipo_documento_identidad')
    )


def buscar_personas(filtro: str, valor: str) -> list[dict]:
    """
    Busca personas aplicando el filtro indicado sobre el valor recibido.
    Retorna una fila por persona con todos sus documentos de identidad
    concatenados en el campo ``documento_concatenado``.

    Parámetros
    ----------
    filtro : str
        Tipo de búsqueda.  Valores válidos:
          ─────────────────────────────────────────────────────────────────
          'NOMBRE'    → búsqueda parcial sobre apellidos y nombres
          'DOCUMENTO' → número de documento de identidad exacto
          'ID'        → clave primaria de la persona
          ─────────────────────────────────────────────────────────────────
    valor : str
        Valor a buscar según el filtro elegido.
          - NOMBRE:     texto parcial, ej. 'medina' o 'garcia lopez'
          - DOCUMENTO:  número exacto, ej. '20154477374'
          - ID:         entero como cadena, ej. '1'

    Retorna
    -------
    list[dict]
        Lista de personas que coinciden con el filtro.  Cada diccionario
        incluye:
          id, tipo_persona, apellido_paterno, apellido_materno, nombres,
          persona_nombre, direccion, distrito, provincia, departamento,
          telefono, correo_electronico, fecha_creacion, fecha_actualizacion,
          user_id, documento_concatenado.

    Lanza
    -----
    ValueError
        Si el filtro no es uno de los valores válidos.
    """
    filtro = filtro.upper().strip()
    if filtro not in _FILTROS_BUSQUEDA:
        raise ValueError(
            f"Filtro '{filtro}' no válido. "
            f"Opciones: {', '.join(_FILTROS_BUSQUEDA)}"
        )

    subquery, transformar = _FILTROS_BUSQUEDA[filtro]
    valor_param = transformar(valor)

    sql = _SQL_BUSCAR_PERSONAS.format(filtro=subquery)

    with connection.cursor() as cursor:
        cursor.execute(sql, [valor_param])
        columnas = [col[0] for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
