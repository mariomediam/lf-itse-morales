"""
Servicios de negocio para TipoProcedimientoTupa.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from auditlog.context import set_actor
from django.db import transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import TipoProcedimientoTupa


def listar_tipos_procedimiento_tupa(solo_activos: bool = False) -> list[TipoProcedimientoTupa]:
    """
    Retorna los tipos de procedimiento TUPA ordenados por nombre.

    Parámetros
    ----------
    solo_activos : bool
        Si es True, retorna únicamente los registros con esta_activo=True.

    Retorna
    -------
    list[TipoProcedimientoTupa]
    """
    qs = TipoProcedimientoTupa.objects.select_related('unidad_organica')
    if solo_activos:
        qs = qs.filter(esta_activo=True)
    return list(qs.order_by('nombre'))


def obtener_tipo_procedimiento_tupa(pk: int) -> TipoProcedimientoTupa:
    """
    Retorna el TipoProcedimientoTupa con la PK indicada.
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria del registro.

    Retorna
    -------
    TipoProcedimientoTupa
    """
    return get_object_or_404(
        TipoProcedimientoTupa.objects.select_related('unidad_organica'),
        pk=pk,
    )


def crear_tipo_procedimiento_tupa(data: dict, usuario) -> TipoProcedimientoTupa:
    """
    Crea y retorna un TipoProcedimientoTupa.

    ``usuario`` y ``fecha_digitacion`` se asignan automáticamente;
    no deben incluirse en ``data``.

    Parámetros
    ----------
    data : dict
        Datos validados por TipoProcedimientoTupaWriteSerializer.
        Claves esperadas:
          - codigo                  (str, obligatorio)
          - nombre                  (str, obligatorio)
          - monto                   (decimal, opcional, default 0)
          - plazo_atencion_dias     (int, obligatorio)
          - dias_alerta_vencimiento (int, obligatorio)
          - esta_activo             (bool, opcional)
          - unidad_organica_id      (int, obligatorio)
          - requiere_lf             (bool, opcional)
          - requiere_itse           (bool, opcional)
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del token JWT.

    Retorna
    -------
    TipoProcedimientoTupa
        Instancia recién creada.
    """
    with set_actor(usuario), transaction.atomic():
        return TipoProcedimientoTupa.objects.create(
            **data,
            usuario=usuario,
            fecha_digitacion=timezone.now(),
        )


def actualizar_tipo_procedimiento_tupa(pk: int, data: dict, usuario) -> TipoProcedimientoTupa:
    """
    Actualiza y retorna el TipoProcedimientoTupa indicado.
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria del registro a actualizar.
    data : dict
        Datos validados por TipoProcedimientoTupaWriteSerializer.
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado; se usa para registrar la auditoría.

    Retorna
    -------
    TipoProcedimientoTupa
        Instancia actualizada.
    """
    tipo = get_object_or_404(TipoProcedimientoTupa, pk=pk)

    with set_actor(usuario), transaction.atomic():
        tipo.codigo                  = data['codigo']
        tipo.nombre                  = data['nombre']
        tipo.monto                   = data['monto']
        tipo.plazo_atencion_dias     = data['plazo_atencion_dias']
        tipo.dias_alerta_vencimiento = data['dias_alerta_vencimiento']
        tipo.esta_activo             = data['esta_activo']
        tipo.unidad_organica         = data['unidad_organica']
        tipo.requiere_lf             = data['requiere_lf']
        tipo.requiere_itse           = data['requiere_itse']
        tipo.save()

    return tipo


def eliminar_tipo_procedimiento_tupa(pk: int, usuario) -> None:
    """
    Elimina físicamente el TipoProcedimientoTupa indicado.
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria del registro a eliminar.
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado; se usa para registrar la auditoría.

    Lanza
    -----
    ProtectedError
        Si el registro está referenciado por expedientes u otros modelos
        con ``on_delete=PROTECT``.
    """
    tipo = get_object_or_404(TipoProcedimientoTupa, pk=pk)
    with set_actor(usuario), transaction.atomic():
        tipo.delete()
