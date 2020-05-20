import json
import os
import subprocess
import sys
import rasterio
import ogr, osr




def CRS_4326To27700(points):
    # points [longtite,latitude]
    inputEPSG = 4326
    outputEPSG = 27700
    pointX = points[1]
    pointY = points[0]
    # create a geometry from coordinates
    point = ogr.Geometry(ogr.wkbPoint)
    point.AddPoint(pointX, pointY)
    # create coordinate transformation
    inSpatialRef = osr.SpatialReference()
    inSpatialRef.ImportFromEPSG(inputEPSG)
    outSpatialRef = osr.SpatialReference()
    outSpatialRef.ImportFromEPSG(outputEPSG)
    coordTransform = osr.CoordinateTransformation(inSpatialRef, outSpatialRef)
    # transform point
    point.Transform(coordTransform)
    return [point.GetX(),point.GetY()]



def main(arvg):
    Farmname = arvg[1]
    Farm_Path = "../originalData/Farm/"+Farmname
    LidarDir = Farm_Path+"/LIDAR/"
    output_dir = "../Farm/"+Farmname
    wholeFarm = output_dir+"/WholeDSM.tif"
    if(not os.path.exists(wholeFarm)):
        command = "python gdal_merge.py -init 255 -o "+ wholeFarm+" "
        for name in os.listdir(LidarDir):
            command += LidarDir+name+" "
        subprocess.call(command, shell=True)
    src = rasterio.open(wholeFarm)
    print("------------")
    print(src.crs)
    print(src.transform)
    command = ""
    FieldTablepath = (output_dir + "/FieldTable.json")
    minXY = []
    maxXY = []

    with open(FieldTablepath, "r") as FieldTableJson:
        FieldTable =json.load(FieldTableJson)
        minXY =  CRS_4326To27700([FieldTable["bbox"][0],FieldTable["bbox"][1]])
        maxXY = CRS_4326To27700([FieldTable["bbox"][2], FieldTable["bbox"][3]])
        print(minXY+maxXY)


    # gdalwarp -t_srs EPSG:4326 input.tif output.tif
    command = "gdalwarp -t_srs EPSG:27700 -te "+str(minXY[0])+" "+ str(minXY[1])+" "+str(maxXY[0])+" "+ str(maxXY[1])+" "
    clippedFarm = output_dir+"/ClippedFarm.tif"
    command += wholeFarm +" " + clippedFarm

    if(not os.path.exists(clippedFarm)):
        subprocess.call(command, shell=True)
    else:
        print("already exit clippedFarm delete it first")

if __name__ == "__main__":
    main(sys.argv)