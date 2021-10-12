#!/usr/bin/env python3

import shutil
import subprocess
import json
import datetime
import re
from os import listdir,getenv
from random import randint
import sys

default_base_path = "%s/44-NODEJS_APIS/alerta5DBIO/data/gefs_wave" % getenv('HOME')
color_rule = "%s/51-GEFS_WAVE/wspeed_color_table" % getenv('HOME')

def printWindMap(inputfile,outputfile):
    forecast_date, valid_date  = getDate(inputfile)
    # print(forecast_date)
    # print(valid_date)
    gscript.run_command('r.in.gdal',input=inputfile,output="gefs",overwrite=True,flags='o')
    gscript.run_command('g.region',rast="gefs.1")
    gscript.run_command("r.mapcalc",expression="speed=sqrt(gefs.1*gefs.1+gefs.2*gefs.2)",overwrite=True)
    gscript.run_command("r.mapcalc",expression="direction=atan(gefs.1,gefs.2)",overwrite=True)
    gscript.run_command("r.colors",map="speed",rules=color_rule)
    gscript.run_command("d.erase")
    gscript.run_command("d.rast",map="speed")
    gscript.run_command("d.rast.arrow",type="grass",magnitude_map="speed",map="direction",grid="none",color="white",flags="a")
    gscript.run_command("d.vect",map="division_politica@principal",type="boundary")
    gscript.run_command("d.grid",size="01:00:00")
    gscript.run_command("d.legend",raster="speed",range="0,30",fontsize=12,title="[m/s]",at="4,80,4,10")
    gscript.run_command("d.text",text="modelo GEFS-WAVE (NCEP)",size=3,line=1,font="DejaVuSans-Bold")
    gscript.run_command("d.text",text="forecast date: %s" % (forecast_date),size=3,line=2,font="DejaVuSans-Bold")
    gscript.run_command("d.text",text="    valid date: %s" % (valid_date),size=3,line=3,font="DejaVuSans-Bold")
    shutil.copyfile("map.png",outputfile)
    return

def getDate(file):
    # cmd = 'gdalinfo "%s" -json' % (file)
    print("getDate file:%s" % file)
    gdi = subprocess.Popen(['/usr/bin/gdalinfo',file,"-json"],stdout=subprocess.PIPE,stderr=subprocess.PIPE)    #run(['gdalinfo',file,"-json"],shell=True,stdout=subprocess.PIPE) 
    stdout, stderr = gdi.communicate()
    # print(stdout)
    ginfo = stdout.decode('utf-8')
    metadata = json.loads(ginfo)
    ref_time = int(re.sub(r'\s.*$',"",metadata["bands"][0]["metadata"][""]["GRIB_REF_TIME"]))
    valid_time = int(re.sub(r'\s.*$',"",metadata["bands"][0]["metadata"][""]["GRIB_VALID_TIME"]))
    forecast_date = datetime.datetime.utcfromtimestamp(int(ref_time))
    valid_date = datetime.datetime.utcfromtimestamp(int(valid_time))
    return (forecast_date,valid_date)

def printModelRunWindMaps(path,skip_print=False):
    files = listdir(path)
    r = re.compile(".*\.grib2$")
    filtered_files = list(filter(r.match,files))
    filtered_files.sort()
    for file in filtered_files:
        inputfile = "%s/%s" % (path,file)
        outputfile = "%s/%s" % (path, re.sub(r'grib2$',"png",file))
        # print((inputfile,outputfile))
        if not skip_print:
            printWindMap(inputfile,outputfile)
    animationfilename = re.sub(r'f\d{3}\.grib2$',"gif",filtered_files[0]) 
    # subprocess.run(["convert","-delay",20,"%s/*.png" % path,"-loop","0",animationfilename])
    subprocess.run("convert -delay 20 %s/*.png -loop 0 %s/%s" % (path,path,animationfilename),shell=True)
    return filtered_files

def getLastModelRunPath(base_path=default_base_path):
    r = re.compile("^gefs\.\d{8}$")
    days = list(filter(r.match,listdir(base_path))) 
    list.sort(days)
    last_day = days[-1]
    r = re.compile("^\d{2}$")
    runs = list(filter(r.match,listdir("%s/%s" % (base_path,last_day))))
    if not len(runs):
        last_day = days[-2]
        runs = list(filter(r.match,listdir("%s/%s" % (base_path,last_day))))
    list.sort(runs)
    last_run = runs[-1]
    return "%s/%s/%s" % (base_path,last_day,last_run)

def run(path,skip_print=False):
    if not path:
        path = getLastModelRunPath()
    gscript.run_command('d.mon',start="png",overwrite=True,width=800,height=800)
    # try:
    files = printModelRunWindMaps(path,skip_print)
    # except Exception as e:
    #     print(e)
    #     gscript.run_command('d.mon',stop="png")
    #     return 1        
    gscript.run_command('d.mon',stop="png")
    return files

# mapset = "tempmapset_%08d" % randint(0,99999999)
# with Session(gisdb="/home/leyden/GISDATABASE", location="WGS84", mapset=mapset, create_opts=""):
#     gscript.run_command('d.mon',start="png",overwrite=True,width=800,height=800)
#     gscript.run_command('d.mon',stop="png")
#    printWindMap("gefs_wave/gefs.wave.t06z.c00.global.0p25.f000.grib2","gefs_wave/gefs.wave.t06z.c00.global.0p25.f000.png")


################################################
#printWindMap("gefs_wave/gefs.wave.t06z.c00.global.0p25.f000.grib2","gefs_wave/gefs.wave.t06z.c00.global.0p25.f000.png")
# forecast_date, timestart = getDate("gefs_wave/gefs.wave.t06z.c00.global.0p25.f000.grib2")
# print(forecast_date)
# print(timestart)

if __name__ == "__main__":
    import grass.script as gscript
    skip_print = False
    if len(sys.argv) >= 2:
        path = sys.argv[1]
        if len(sys.argv) >= 3:
            skip_print = sys.argv[2]
    else:
        if getenv("gefs_run_path"):
            path = getenv("gefs_run_path")
        else:
            path = None
        if getenv("skip_print"):
            skip_print = getenv("skip_print")
    # print("path: %s" % path)
    files = run(path,skip_print)
    sys.stdout.write(" ".join([str(i) from i in files]))

