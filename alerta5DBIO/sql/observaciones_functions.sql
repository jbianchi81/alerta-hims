CREATE OR REPLACE FUNCTION public.area_calc()
 RETURNS trigger
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
    if new.geom is null then raise notice 'geom is null';return null;end if;
    new.area = st_area(st_transform(new.geom,22185)); return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.estacion_id_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
new_id int;
begin
    if new.id is null then
       select coalesce(max(id)+1,1) into new_id from estaciones where tabla=new.tabla;
       if not found then
  new.id := 1;
   else
 new.id := new_id;
   end if;
end if;
    return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.obs_hora_corte_constraint_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ 
declare
_sql text;
_hora_corte interval;
_new_hora_corte interval;
_dt interval;
_check boolean;

begin
_sql := 'select fuentes.def_dt from fuentes,series_areal where fuentes.id=series_areal.fuentes_id and series_areal.id='||new.series_id;
execute _sql into _dt;
_sql := 'select fuentes.hora_corte from fuentes,series_areal where fuentes.id=series_areal.fuentes_id and series_areal.id='||new.series_id;
execute _sql into _hora_corte;
--_new_hora_corte := extract(hour from _sd)::integer%(extract(epoch from _dt)/3600)::integer;
--raise notice 'new_hora_corte: %, def_hora_corte: %', _new_hora_corte, _hora_corte;
_sql := 'select extract(epoch from case when '''||_hora_corte||'''::interval<interval ''0 seconds'' then interval ''1 day''+'''||_hora_corte||'''::interval else '''||_hora_corte||'''::interval end)=(extract(epoch from '''||new.timestart||'''::timestamp-'''||new.timestart||'''::date))::integer%extract(epoch from '''||_dt||'''::interval)::integer';
execute _sql into _check;
IF _check
then return NEW;
ELSE 
 raise notice 'new hora corte invalid';
     return NULL;
END IF;
end
$function$
;

CREATE OR REPLACE FUNCTION public.obs_dt_constraint_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
_sql text;
_dt interval;
_new_dt interval;

begin
_sql := 'select fuentes.def_dt from fuentes,series_areal where fuentes.id=series_areal.fuentes_id and series_areal.id='||new.series_id;
execute _sql into _dt;
-- _new_dt := new.timeend - new.timestart;
--raise notice 'new_dt: %, def_dt: %', _new_dt, _dt;
IF (new.timeend - _dt = new.timestart OR new.timestart + _dt = new.timeend) 
then return NEW;
ELSE 
 raise notice 'new dt is invalid';
     return NULL;
END IF;
end
$function$
;

CREATE OR REPLACE FUNCTION public.obs_puntual_dt_constraint_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

declare
_sql text;
_dt interval;
_hora_corte interval;
_new_dt interval;
_sql2 text;
_match boolean;

begin
_sql := 'select var."timeSupport",def_hora_corte  from var,series where var.id=series.var_id and series.id='||new.series_id;
execute _sql into _dt, _hora_corte;
IF (_dt is null)
THEN 
	return NEW;
ELSE
	IF (new.timeend - _dt = new.timestart OR new.timestart + _dt = new.timeend) 
	THEN 
		_sql2 := 'select exists (select 1 from observaciones where observaciones.series_id='||new.series_id||' AND '''||new.timestart||'''<observaciones.timeend AND '''||new.timeend||'''> observaciones.timestart AND '''||new.timestart||'''!=observaciones.timestart and '''||new.timeend||'''!=observaciones.timeend AND coalesce('||new.id||',-1) != observaciones.id)';
		execute _sql2 into _match;
		IF _match = TRUE
		THEN
			raise notice 'El intervalo intersecta con un registro existente'; 
			return NULL;
		ELSE 
			IF _hora_corte is null
			THEN
				return NEW;
			ELSE
				IF extract(epoch from case when _hora_corte<interval '0 seconds' then interval '1 day'+_hora_corte else _hora_corte end)=(extract(epoch from new.timestart-new.timestart::date))::integer%extract(epoch from _dt)::integer
				THEN 
					return NEW;
				ELSE
					raise notice 'new hora_corte is invalid';
					return NULL;
				END IF;
			END IF;
		END IF;
	ELSE 
		 raise notice 'new dt is invalid';
		 return NULL;
	END IF;
END IF;
end
$function$
;

CREATE OR REPLACE FUNCTION public.obs_range_constraint_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
_sql text;
_match boolean;
begin
_sql := 'select exists (select 1 from observaciones_areal where tsrange('''||new.timestart||''','''||new.timeend||''',''[)'') && tsrange(observaciones_areal.timestart,observaciones_areal.timeend,''[)'') AND '''||new.timestart||'''!=observaciones_areal.timestart and '''||new.timeend||'''!=observaciones_areal.timeend and observaciones_areal.series_id='||new.series_id||')';
execute _sql into _match;
--raise notice 'match: %', _match;
IF _match = TRUE
THEN return NULL;
ELSE return NEW;
END IF;
end
$function$
;

CREATE OR REPLACE FUNCTION public.check_key_tab(integer[], character varying, character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  arrIds ALIAS for $1;
  tab ALIAS for $2;
  key ALIAS for $3;
  retVal boolean :=true;
  thisval boolean;
begin
   if arrIds is null
   then raise notice 'null array';
        return true;
   else
       for I in array_lower(arrIds,1)..array_upper(arrIds,1) LOOP
          execute ( 'select exists (select 1 from ' || quote_ident(tab) || ' where ' || quote_ident(key) || ' = ' || arrIds[I] ||')' ) into thisval;
    --    raise notice 'I:% thisval:%', arrIds[I], thisval;
          if thisval = true
          then 
          -- raise notice 'exists';
               retVal := retVal;
           else
            raise notice 'campo % valor % no existe en tabla %', key, arrIds[I], tab;
                retVal := false;
            end if;
       end loop;
    end if;
return retVal;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_par_lims()
 RETURNS trigger
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
bounds record;
begin
    if new.model_id is null then raise notice 'model_id is null'; return null; end if;
    if new.orden is null then raise notice 'orden is null'; return null; end if;
    execute ( 'select * from parametros where model_id=' || new.model_id || ' and orden=' || new.orden) into bounds;
    if bounds is null then raise notice 'No se encontro parametro'; return null;end if;
    if (new.valor < coalesce(bounds.lim_inf,'-inf') or new.valor > coalesce(bounds.lim_sup,'inf'))
    then raise notice 'ERROR: El valor excede el rango valido para el parametro. %>=%>=%', bounds.lim_inf, bounds.nombre, bounds.lim_sup;
         return null;
    else 
         return new;
    end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_model_id()
 RETURNS trigger
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
mid int;
begin
    if new.cal_id is null then raise notice 'cal_id is null';return null;end if;
    execute ( 'select model_id from calibrados where id=' || new.cal_id ) into mid;
    new.model_id := mid;
    if new.model_id is null then raise notice 'model_id no encontrado para cal_id=%',new.cal_id;return null;end if;
    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.orden_model_forz()
 RETURNS trigger
 LANGUAGE plpgsql
 STABLE
AS $function$
begin;
    if NEW.orden is NULL then
        execute ( 'select coalesce(max(orden)+1,1) from ' || TG_TABLE_NAME || ' where model_id=' || new.model_id ) into orden;
        NEW.orden := orden;
    end if;
    return NEW;
end;
$function$
;

