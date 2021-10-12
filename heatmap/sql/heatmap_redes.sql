heatmap	
 DECLARE
 _enddate2 timestamp := _enddate+'23:59:59'::interval;
 _procid int := case when _procid is not null then _procid when _varid = 4 then 2 else 1 end;
 BEGIN
RETURN QUERY WITH ts as (
    SELECT generate_series(_startdate::date,_enddate::date,'1 day'::interval) t
    ),
    tseries as (
    SELECT t,
           row_number() OVER (order by t) x
    FROM ts
    ),
    alltablas as (
    SELECT redes.tabla_id, 
           redes.nombre,
           redes.id red_id,
           row_number() OVER (ORDER BY CASE WHEN (_use_id = 'ext' OR _use_id = 'ext_only') THEN id_externo WHEN _use_id = 'nombre' THEN nombre WHEN _use_id = 'id' THEN LPAD(estaciones.id::text,5,'0') ELSE LPAD(estacion_id::text,5,'0') END) y
    FROM series,estaciones
    WHERE estaciones.tabla=_tabla
    AND series.estacion_id=estaciones.unid
    AND series.var_id=_varid
    AND series.proc_id=_procid
    AND estaciones.habilitar = true
    AND estaciones.has_obs = CASE WHEN _has_obs = true 
								  THEN true
								  ELSE has_obs
							 END
    ORDER BY CASE WHEN (_use_id = 'ext' OR _use_id = 'ext_only')
                  THEN estaciones.id_externo
                  WHEN _use_id = 'nombre' 
                  THEN nombre 
                  WHEN _use_id = 'id' 
                  THEN LPAD(estaciones.id::text,5,'0')
                  ELSE LPAD(unid::text,5,'0')
             END
    ),
    subobs as (
		SELECT observaciones.*,
		       allstations.estacion_id,
		       allstations.nombre
		FROM observaciones,
			 allstations
		WHERE observaciones.series_id=allstations.series_id
		AND observaciones.timestart>=_startdate
		AND observaciones.timestart<=_enddate2
	),
    countreg as (
    SELECT subobs.estacion_id,
           subobs.timestart::date date,
           count(subobs.timestart) count 
    FROM subobs,
         tseries
    WHERE subobs.timestart::date=tseries.t
    GROUP BY subobs.estacion_id,
             subobs.timestart::date 
    ORDER BY subobs.estacion_id,
             subobs.timestart::date
    ),
        heatmap as (
    SELECT tseries.x, 
           allstations.y, 
           coalesce(countreg.count, 0) count
    FROM tseries
    JOIN allstations ON (allstations.estacion_id is not null)
    LEFT JOIN countreg ON (tseries.t=countreg.date AND allstations.estacion_id=countreg.estacion_id) 
    ),
    datearr as (
		SELECT array_agg(tseries.t::date) dates
		FROM tseries),
	starr as (
		SELECT CASE WHEN _use_id = 'ext'
		            THEN array_agg(substring(coalesce(allstations.id_externo,allstations.estacion_id::text),0,9) || ' - ' || substring(allstations.nombre,0,12)) 
		            WHEN _use_id = 'ext_only'
		            THEN array_agg(coalesce(allstations.id_externo,allstations.estacion_id::text)) 
		            WHEN _use_id = 'nombre'
		            THEN array_agg(substring(coalesce(allstations.nombre,allstations.estacion_id::text),0,16))
		            WHEN _use_id = 'id'
		            THEN array_agg(substring(coalesce(allstations.id_interno::text,allstations.estacion_id::text),0,16))
		            ELSE array_agg(substring(allstations.nombre,0,12) ||  ' (' || allstations.estacion_id || ')')
		       END estaciones
		FROM allstations
	), heatmaparr as (
       SELECT array_agg(ARRAY[heatmap.x::int-1, heatmap.y::int-1, heatmap.count::int]) heatmap
       FROM heatmap)
    SELECT json_build_object('dates',dates,'estaciones',estaciones,'heatmap',heatmap)
    FROM datearr,
         starr,
         heatmaparr;
END;

