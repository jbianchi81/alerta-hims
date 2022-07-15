BEGIN;

-- DROP TABLE informe_semanal_contenido_region;
-- DROP TABLE informe_semanal_tramos;
-- DROP TABLE informe_semanal_regiones;
-- DROP TABLE informe_semanal;

CREATE TABLE informe_semanal_regiones (id varchar not null primary key,nombre varchar not null,geom geometry not null);

CREATE TABLE informe_semanal_tramos (id varchar not null primary key, region_id  varchar not null references informe_semanal_regiones(id), nombre varchar not null, geom geometry not null);

CREATE TABLE informe_semanal (fecha date not null primary key, texto_general varchar);

CREATE TABLE informe_semanal_contenido (fecha date references informe_semanal(fecha) ON DELETE CASCADE NOT NULL, region_id varchar references informe_semanal_regiones(id) ON DELETE CASCADE NOT NULL, texto varchar not null, unique (fecha, region_id));

CREATE TABLE informe_semanal_contenido_tramo (fecha date references informe_semanal(fecha) ON DELETE CASCADE NOT NULL, tramo_id varchar references informe_semanal_tramos(id) ON DELETE CASCADE NOT NULL, texto varchar not null, unique (fecha, tramo_id));


GRANT SELECT,INSERT,UPDATE,DELETE ON informe_semanal to actualiza;
GRANT SELECT,INSERT,UPDATE,DELETE ON informe_semanal_regiones to actualiza;
GRANT SELECT,INSERT,UPDATE,DELETE ON informe_semanal_contenido to actualiza;
GRANT SELECT,INSERT,UPDATE,DELETE ON informe_semanal_tramos to actualiza;
GRANT SELECT,INSERT,UPDATE,DELETE ON informe_semanal_contenido_tramo to actualiza;
-- GRANT SELECT ON informe_semanal to sololectura;
-- GRANT SELECT ON informe_semanal_regiones to sololectura;
-- GRANT SELECT ON informe_semanal_contenido to sololectura;

COMMIT;