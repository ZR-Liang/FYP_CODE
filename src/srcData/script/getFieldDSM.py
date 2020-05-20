# gdalwarp --config GDALWARP_IGNORE_BAD_CUTLINE YES -s_srs EPSG:27700 -cutline Field1.json  -crop_to_cutline -dstnodata None clippedFarm.tif test.tif
import os
import subprocess
import sys

def main(argv):
    Farmname = argv[1]
    FarmDir ="../Farm/" + Farmname + "/"
    clippedDSM = FarmDir + "ClippedFarm.tif"
    for FieldID in os.listdir(FarmDir):
        Field_dir = FarmDir + FieldID + "/"
        fieldDSM = Field_dir + "DSM.tif"
        command = "gdalwarp --config GDALWARP_IGNORE_BAD_CUTLINE YES -s_srs EPSG:27700 -cutline "
        if (os.path.isdir(Field_dir)):
            cutline = Field_dir + "shp/" + FieldID + ".json "
            command += cutline + "-crop_to_cutline -dstnodata None " + clippedDSM + " " + fieldDSM
            if (not os.path.exists(fieldDSM)) and (os.path.exists(cutline)):
                subprocess.call(command, shell=True)


if __name__ == "__main__":
    main(sys.argv)