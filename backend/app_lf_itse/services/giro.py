"""
Servicios de negocio para Giro.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from auditlog.context import set_actor
from django.db import connection, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import Giro


def buscar_giros(
    busqueda: str | None = None,
    esta_activo: bool | None = None,
) -> list[Giro]:
    """
    Retorna giros aplicando los filtros indicados, ordenados por ``nombre``.

    Parámetros
    ----------
    busqueda : str | None
        Texto libre que se busca simultáneamente en ``ciiu_id`` (si es numérico)
        y en ``nombre`` (búsqueda parcial, insensible a mayúsculas).
        Si es ``None`` o cadena vacía no se aplica ningún filtro de texto.
    esta_activo : bool | None
        ``True``  → solo activos.
        ``False`` → solo inactivos.
        ``None``  → todos (sin filtro).

    Retorna
    -------
    list[Giro]
        Registros de la tabla ``giros`` que cumplen los criterios, ordenados
        por ``nombre``.
    """
    qs = Giro.objects.all()

    if esta_activo is not None:
        qs = qs.filter(esta_activo=esta_activo)

    if busqueda:
        busqueda = busqueda.strip()
        filtro_nombre = Q(nombre__icontains=busqueda)
        if busqueda.isdigit():
            qs = qs.filter(filtro_nombre | Q(ciiu_id=int(busqueda)))
        else:
            qs = qs.filter(filtro_nombre)

    return list(qs.order_by('nombre'))


# ── CRUD ───────────────────────────────────────────────────────────────────────

def listar_giros() -> list[Giro]:
    """Retorna todos los giros ordenados por nombre."""
    return list(Giro.objects.all().order_by('nombre'))


def obtener_giro(pk: int) -> Giro:
    """Retorna el Giro con la PK indicada. Lanza HTTP 404 si no existe."""
    return get_object_or_404(Giro, pk=pk)


def crear_giro(data: dict, usuario) -> Giro:
    """
    Crea un Giro con los datos validados.

    Parámetros
    ----------
    data    : dict  — datos validados por GiroWriteSerializer
    usuario : AUTH_USER_MODEL instance

    Retorna
    -------
    Giro
        Instancia recién creada.
    """
    with set_actor(usuario), transaction.atomic():
        return Giro.objects.create(
            **data,
            usuario=usuario,
            fecha_digitacion=timezone.now(),
        )


def actualizar_giro(pk: int, data: dict, usuario) -> Giro:
    """
    Actualiza los campos de un Giro.

    Parámetros
    ----------
    pk   : int   — clave primaria del giro a actualizar
    data : dict  — datos validados por GiroWriteSerializer

    Retorna
    -------
    Giro
        Instancia actualizada.
    """
    giro = get_object_or_404(Giro, pk=pk)
    with set_actor(usuario), transaction.atomic():
        for campo, valor in data.items():
            setattr(giro, campo, valor)
        giro.save()
    return giro


def eliminar_giro(pk: int, usuario) -> None:
    """
    Elimina físicamente el Giro indicado.
    Lanza HTTP 404 si no existe.
    Lanza ProtectedError si está referenciado por licencias o certificados ITSE.
    """
    giro = get_object_or_404(Giro, pk=pk)
    with set_actor(usuario), transaction.atomic():
        giro.delete()


_SQL_GIROS_POR_LICENCIA = """
SELECT
    lfg.id,
    lfg.licencia_funcionamiento_id,
    lfg.giro_id,
    g.ciiu_id,
    g.nombre
FROM licencias_funcionamiento_giros lfg
INNER JOIN giros g ON g.id = lfg.giro_id
WHERE lfg.licencia_funcionamiento_id = %s
ORDER BY g.nombre
"""


_SQL_GIROS_POR_ITSE = """
SELECT
    ig.id,
    ig.itse_id,
    ig.giro_id,
    g.ciiu_id,
    g.nombre
FROM itse_giros ig
INNER JOIN giros g ON g.id = ig.giro_id
WHERE ig.itse_id = %s
ORDER BY g.nombre
"""


def listar_giros_por_itse(itse_id: int) -> list[dict]:
    """
    Retorna los giros asociados a un ITSE.

    Parámetros
    ----------
    itse_id : int
        PK del ITSE.

    Retorna
    -------
    list[dict]
        Lista de dicts con las claves:
        ``id``, ``itse_id``, ``giro_id``, ``ciiu_id``, ``nombre``.
    """
    with connection.cursor() as cursor:
        cursor.execute(_SQL_GIROS_POR_ITSE, [itse_id])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def listar_giros_por_licencia(licencia_funcionamiento_id: int) -> list[dict]:
    """
    Retorna los giros asociados a una licencia de funcionamiento.

    Realiza un único JOIN entre ``licencias_funcionamiento_giros`` y ``giros``
    para devolver, por cada fila, los campos de la tabla de relación más
    ``ciiu_id`` y ``nombre`` del giro.

    Parámetros
    ----------
    licencia_funcionamiento_id : int
        PK de la licencia de funcionamiento.

    Retorna
    -------
    list[dict]
        Lista de dicts con las claves:
        ``id``, ``licencia_funcionamiento_id``, ``giro_id``,
        ``ciiu_id``, ``nombre``.
    """
    with connection.cursor() as cursor:
        cursor.execute(_SQL_GIROS_POR_LICENCIA, [licencia_funcionamiento_id])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
