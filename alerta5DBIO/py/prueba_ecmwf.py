import argparse
import cdsapi
import sys
from datetime import datetime
today = datetime.today()

parser = argparse.ArgumentParser(description='You can add a description here')

parser.add_argument('modelo', type=str, help='ecmwf', default='ecmwf', nargs="?")
parser.add_argument('anio', type=int, help='anio', default=today.year, nargs="?")
parser.add_argument('mes', type=int, help='mes', default=today.month, nargs="?")
parser.add_argument('output', type=str, help='ecmwf202007.grib', default='ecmwf202007.grib', nargs="?")
parser.add_argument('dataset', type=str, help='seasonal-monthly-single-levels', default='seasonal-monthly-single-levels', nargs="?")
parser.add_argument('variable', type=str, help='total_precipitation', default='total_precipitation', nargs="?")

args = parser.parse_args()

try:
    c = cdsapi.Client()

    c.retrieve(
        args.dataset,
        {
            'format': 'grib',
            'originating_centre': args.modelo,
            'variable': args.variable,
            'product_type': 'ensemble_mean',
            'year': args.anio,
            'month': args.mes,
            'leadtime_month': [
                '1', '2', '3',
                '4', '5', '6',
            ],
            'area': [
                -10, -70, -40,
                -41,
            ],
            'system': '5',
        },
        args.output)
except Exception as e:
    print("does not exist", file=sys.stderr)
    print("Exception: %s" % str(e), file=sys.stderr)
    sys.exit(1)
