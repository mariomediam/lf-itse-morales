-- Convierte el horario de atención de licencias de funcionamiento
-- de hora entera (0-23) a hora del día (time).
--
-- Ejemplo: 8  -> 08:00:00
--          19 -> 19:00:00
--          NULL se conserva.
--
-- Ejecutar en pgAdmin sobre la base de la aplicación.
-- El script se puede volver a ejecutar: si las columnas ya son time, no hace cambios.

BEGIN;

DO $$
DECLARE
    tipo_desde text;
    tipo_hasta text;
    fuera_rango integer;
BEGIN
    SELECT data_type
      INTO tipo_desde
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'licencias_funcionamiento'
       AND column_name = 'hora_desde';

    SELECT data_type
      INTO tipo_hasta
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'licencias_funcionamiento'
       AND column_name = 'hora_hasta';

    IF tipo_desde IS NULL OR tipo_hasta IS NULL THEN
        RAISE EXCEPTION
            'No se encontraron hora_desde y hora_hasta en public.licencias_funcionamiento.';
    END IF;

    IF tipo_desde = 'time without time zone'
       AND tipo_hasta = 'time without time zone' THEN
        RAISE NOTICE 'hora_desde y hora_hasta ya son time. No se realiza ningún cambio.';
        RETURN;
    END IF;

    IF tipo_desde <> 'integer' OR tipo_hasta <> 'integer' THEN
        RAISE EXCEPTION
            'Tipo inesperado. hora_desde=%, hora_hasta=%. Se esperaba integer.',
            tipo_desde, tipo_hasta;
    END IF;

    SELECT COUNT(*)
      INTO fuera_rango
      FROM licencias_funcionamiento
     WHERE (hora_desde IS NOT NULL AND (hora_desde < 0 OR hora_desde > 23))
        OR (hora_hasta IS NOT NULL AND (hora_hasta < 0 OR hora_hasta > 23));

    IF fuera_rango > 0 THEN
        RAISE EXCEPTION
            'Hay % fila(s) con una hora fuera del rango 0-23. Corrija esos datos antes de convertir.',
            fuera_rango;
    END IF;

    ALTER TABLE licencias_funcionamiento
        ALTER COLUMN hora_desde TYPE time WITHOUT TIME ZONE
        USING (
            CASE
                WHEN hora_desde IS NULL THEN NULL
                ELSE make_time(hora_desde, 0, 0)
            END
        );

    ALTER TABLE licencias_funcionamiento
        ALTER COLUMN hora_hasta TYPE time WITHOUT TIME ZONE
        USING (
            CASE
                WHEN hora_hasta IS NULL THEN NULL
                ELSE make_time(hora_hasta, 0, 0)
            END
        );

    ALTER TABLE licencias_funcionamiento
        ALTER COLUMN hora_desde DROP NOT NULL,
        ALTER COLUMN hora_hasta DROP NOT NULL;

    RAISE NOTICE 'hora_desde y hora_hasta quedaron como time.';
END $$;

COMMIT;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'licencias_funcionamiento'
  AND column_name IN ('hora_desde', 'hora_hasta')
ORDER BY column_name;
