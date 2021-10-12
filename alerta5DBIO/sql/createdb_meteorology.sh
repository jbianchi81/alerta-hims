psql postgres -c "drop database meteorology"
psql postgres -c "create database meteorology"
psql meteorology -c "create extension postgis"
psql meteorology -c "create extension postgis_raster"
psql meteorology -f observaciones_functions.sql
psql meteorology -f observations_schemae.sql
psql meteorology -f simulations_schemae.sql
psql meteorology -f redes_data.sql
psql meteorology -f basic_tables_content.sql
psql meteorology -f users.sql
psql meteorology -f additional_tables.sql
psql meteorology -f gridded.sql
psql meteorology -c "create user actualiza with password 'alturas'"
psql meteorology -c "grant select,delete,update,insert on all tables in schema public to actualiza"
psql meteorology -c "grant usage,select,update on all sequences in schema public to actualiza"
