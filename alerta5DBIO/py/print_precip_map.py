#!/usr/bin/env python3

import shutil
import subprocess
import json
import datetime
import pytz
import re
from os import listdir,getenv
from random import randint
import sys

default_base_path = "%s/44-NODEJS_APIS/alerta5DBIO/data/gpm/dia" % getenv('HOME')
color_rule = "%s/44-NODEJS_APIS/alerta5DBIO/data/gpm/resources/gpm_dia_color_table" % getenv('HOME')

def printPrecipMap(inputfile,outputfile):
    timestart, timeend, forecast_date  = getDate(inputfile)
    # print(forecast_date)
    # print(valid_date)
    gscript.run_command('r.in.gdal',input=inputfile,output="gpm",overwrite=True,flags='o')
    gscript.run_command('g.region',rast="gpm.1")
    gscript.run_command("r.colors",map="gpm.1",rules=color_rule)
    gscript.run_command("d.erase")
    gscript.run_command("d.rast",map="gpm.1")
    gscript.run_command("d.vect",map="division_politica@principal",type="boundary")
    gscript.run_command("d.vect",map="CDP@principal")
    gscript.run_command("d.grid",size="05:00:00")
    gscript.run_command("d.legend",raster="gpm.1",range="0,120",fontsize=12,title="[mm]",at="4,80,4,10")
    gscript.run_command("d.text",text="GPM IMERG (NASA)",size=3,line=1,font="DejaVuSans-Bold")
    gscript.run_command("d.text",text="timestart: %s" % (timestart),size=3,line=2,font="DejaVuSans-Bold")
    gscript.run_command("d.text",text="  timeend: %s" % (timeend),size=3,line=3,font="DejaVuSans-Bold")
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
    timestart = metadata["metadata"][""]["timestart"].replace("Z","+00:00")
    timeend = metadata["metadata"][""]["timeend"].replace("Z","+00:00")
    timestart = datetime.datetime.fromisoformat(timestart)
    timeend = datetime.datetime.fromisoformat(timeend)
    if("forecast_date" in metadata["metadata"][""]):
        forecast_date = metadata["metadata"][""]["forecast_date"].replace("Z","+00:00")
        forecast_date = datetime.datetime.fromisoformat(forecast_date)
        return (timestart,timeend,forecast_date)
    else:
        return (timestart,timeend,None)

def printPrecipMaps(files,skip_print=False):
    pngfiles = list()
    for file in files:
        inputfile = file
        outputfile = re.sub(r'tif$',"png",file)
        pngfiles.append(outputfile)
        # print((inputfile,outputfile))
        if not skip_print:
            printPrecipMap(inputfile,outputfile)
    # animationfilename = re.sub(r'f\d{3}\.grib2$',"gif",filtered_files[0]) 
    # subprocess.run(["convert","-delay",20,"%s/*.png" % path,"-loop","0",animationfilename])
    # subprocess.run("convert -delay 20 %s/*.png -loop 0 %s/%s" % (path,path,animationfilename),shell=True)
    return pngfiles

def fileDateIsBetween(file,timestart,timeend):
    s = file.split(".")
    d = s[1]
    t = s[2]
    date = datetime.datetime(int(d[0:4]),int(d[4:6]),int(d[6:8]),int(t[0:2]),int(t[2:4]),int(t[4:6]),tzinfo=datetime.timezone.utc)
    if date >= timestart and date < timeend:
        return True
    else:
        return False    

def fileDateIsGreaterThan(file,timestart):
    s = file.split(".")
    d = s[1]
    t = s[2]
    date = datetime.datetime(int(d[0:4]),int(d[4:6]),int(d[6:8]),int(t[0:2]),int(t[2:4]),int(t[4:6]),tzinfo=datetime.timezone.utc)
    if date >= timestart:
        return True
    else:
        return False    

def getFiles(timestart,timeend,base_path=default_base_path):
    r = re.compile("^gpm_dia\.\d{8}\.\d{6}\.tif$")
    files = list(filter(r.match,listdir(base_path))) 
    list.sort(files)
    if timestart:
        if timeend:
            filtered_files = [x for x in files if fileDateIsBetween(x,timestart,timeend)]
        else:
            filtered_files = [x for x in files if fileDateIsGreaterThan(x,timestart)]
    else:
        filtered_files = files[-1:]
    return ["%s/%s" % (base_path,x) for x in filtered_files]

def run(timestart,timeend,skip_print=False):
    if timestart:
        timestart = datetime.datetime.fromisoformat(timestart)
        timestart = pytz.utc.localize(timestart)
    if timeend:
        timeend = datetime.datetime.fromisoformat(timeend)
        timeend = pytz.utc.localize(timeend)
    files = getFiles(timestart,timeend)
    gscript.run_command('d.mon',start="png",overwrite=True,width=800,height=800)
    # try:
    pngfiles = printPrecipMaps(files,skip_print)
    # except Exception as e:
    #     print(e)
    #     gscript.run_command('d.mon',stop="png")
    #     return 1        
    gscript.run_command('d.mon',stop="png")
    return pngfiles

if __name__ == "__main__":
    import grass.script as gscript
    skip_print = False
    if len(sys.argv) >= 2:
        timestart = sys.argv[1]
        if len(sys.argv) >= 3:
            timeend = sys.argv[2]
    else:
        if getenv("timestart"):
            timestart = getenv("timestart")
        else:
            timestart = None
        if getenv("timeend"):
            timeend = getenv("timeend")
        else:
            timeend = None
        if getenv("skip_print"):
            skip_print = getenv("skip_print")
    # print("path: %s" % path)
    files = run(timestart,timeend,skip_print)
    sys.stdout.write(" ".join([str(i) for i in files]))

