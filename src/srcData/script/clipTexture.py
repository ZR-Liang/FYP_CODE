import json
import os
import subprocess
import sys
from shutil import copyfile
from xml.dom import minidom
import numpy as np

import rasterio
from rasterio.enums import Resampling

def main(argv):
    Farmname = argv[1]
    FarmDir = "../Farm/"  + Farmname + "/"
    TextureSrcPath = "../originalData/Farm/" + Farmname + "/" + "TEXTURE/"
    bands = {}
    bbox = []
    Times = []
    Textures = []
    checkleng = 0
    print("=======================")
    print(FarmDir+" "+ TextureSrcPath)
    def createNDVI(Path):
        print("NDVI")
        if not os.path.exists(Path):
            ndviImage = rasterio.open(Path, 'w', driver='Gtiff',
                                      width=band4.width,
                                      height=band4.height,
                                      count=1, crs=band4.crs,
                                      transform=band4.transform,
                                      dtype='float64')
            ndvi = np.where((nir + red) == 0., 0, (nir - red) / (nir + red))
            ndviImage.write(ndvi, 1)
            ndviImage.close()
        else:
            print("already got NDVI")

    def createNDMI(Path):
        print("NDMI")
        if not os.path.exists(Path):
            # upsampling band 11 as band_11 = 20m ; band_8 is 10m
            upsampling_SWIR1 = band11.read(
                out_shape=(
                    band11.count,
                    int(band8.height),
                    int(band8.width)
                ),
                resampling=Resampling.bilinear
            )
            ndmiImage = rasterio.open(Path, 'w', driver='Gtiff',
                                      width=band8.width,
                                      height=band8.height,
                                      count=1, crs=band8.crs,
                                      transform=band8.transform,
                                      dtype='float64')
            #
            ndmi = np.where((nir + upsampling_SWIR1[0]) == 0., 0,
                            ((nir - upsampling_SWIR1[0]) / (nir + upsampling_SWIR1[0])))
            ndmiImage.write(ndmi, 1)
            ndmiImage.close()
        else:
            print("already got NDMI")

    def createMSAVI2(Path):
        print("MSAVI2")
        if not os.path.exists(Path):
            MSAVI2Image = rasterio.open(Path, 'w', driver='Gtiff',
                                        width=band8.width,
                                        height=band8.height,
                                        count=1, crs=band8.crs,
                                        transform=band8.transform,
                                        dtype='float64')

            MSAVI2 = (2 * (nir + 1) - np.sqrt((2 * nir + 1) ** 2 - 8 * (nir - red))) / 2
            MSAVI2Image.write(MSAVI2, 1)
            MSAVI2Image.close()
        else:
            print("already got MSAVI2")



    # Agriculture with DRA
    # step 1: create vrt
    # step 2: create tiff
    # gdalbuildvrt -resolution average -separate -r nearest -separate 11-8-2rgb.vrt -separate B11.tif B08.tif B02.tif -co PHOTOMETRIC=RGB -co COMPRESS=DEFLATE
    def createADRA():
        command1 = "gdalbuildvrt -resolution average -separate -r nearest -separate " + FarmTexturePath + "Agriculture_with_DRA.vrt " \
                   + FarmBands["B11"] + " " + FarmBands["B08"] + " " + FarmBands["B02"]
        command2 = "gdal_translate -ot Byte -co TILED=YES -co PHOTOMETRIC=RGB -scale 0 4096 0 255 " + FarmTexturePath + "Agriculture_with_DRA.vrt " + FarmTexturePath + "Agriculture_with_DRA.tif"

        if not os.path.exists(FarmTexturePath + "Agriculture_with_DRA.vrt"):
            print(command1)
        subprocess.call(command1, shell=True)

        if not os.path.exists(FarmTexturePath + "Agriculture_with_DRA.tif"):
            print(command2)
        subprocess.call(command2, shell=True)

    # Geology with DRA
    # step 1: create vrt
    # step 2: create tiff
    def createGDRA():
        command1 = "gdalbuildvrt -resolution average -separate -r nearest -separate " + FarmTexturePath + "Geology_with_DRA.vrt " \
                   + FarmBands["B12"] + " " + FarmBands["B11"] + " " + FarmBands["B02"]
        command2 = "gdal_translate -ot Byte -co TILED=YES -co PHOTOMETRIC=RGB -scale 0 4096 0 255 " + FarmTexturePath + "Geology_with_DRA.vrt " + FarmTexturePath + "Geology_with_DRA.tif"
        subprocess.call(command1, shell=True)
        subprocess.call(command2, shell=True)
    if os.path.exists(FarmDir + "FieldTable.json"):
        with open(FarmDir + "FieldTable.json") as FieldTable:
            bbox = json.load(FieldTable)["bbox"]
            print(bbox)
            FieldTable.close()
        for TextureDir in os.listdir(TextureSrcPath):
            time = (TextureDir.split("_")[2]).split("T")[0]
            print("---------------------")
            print(time)
            Times.append(time)
            FarmTexturePath = FarmDir + "FarmTexture/" + time + "/"
            if not os.path.exists(FarmTexturePath):
                if not os.path.exists(FarmDir + "FarmTexture/"):
                    os.mkdir(FarmDir + "FarmTexture/")
                os.mkdir(FarmTexturePath)
                os.mkdir(FarmTexturePath + "OriginalBands")
                print("Directory ", FarmTexturePath, " Created ")
            else:
                print("Directory ", FarmTexturePath, " already exists")

            MTDPath = TextureSrcPath + TextureDir + "/MTD_" + TextureDir.split("_")[1] + ".xml"
            doc = minidom.parse(MTDPath)
            root = doc.documentElement

            IMAGE_FILE_PATHS = root.getElementsByTagName('Product_Organisation').item(0).getElementsByTagName(
                "IMAGE_FILE")

            i = 0;
            print("mtdpath "+MTDPath)
            while i < IMAGE_FILE_PATHS.length:
                end = IMAGE_FILE_PATHS.item(i).firstChild.nodeValue[-7:]
                if len(IMAGE_FILE_PATHS.item(i).firstChild.nodeValue)<80:
                    end =end[-3:]
                bandPath = TextureSrcPath + TextureDir + "/" + IMAGE_FILE_PATHS.item(i).firstChild.nodeValue + ".jp2"
                checkleng =  len(IMAGE_FILE_PATHS.item(i).firstChild.nodeValue);
                if checkleng>80:
                    print(end)
                    if end == "TCI_10m":
                        bands["TCI"] = bandPath
                    elif end == "B02_10m":
                        bands["B02"] = bandPath

                    elif end == "B04_10m":
                        bands["B04"] = bandPath
                    elif end == "B08_10m" :
                        bands["B08"] = bandPath
                    elif end == "B11_20m":
                        bands["B11"] = bandPath
                    elif end == "B12_20m":
                        bands["B12"] = bandPath

                else:
                    if  end == "TCI":
                        bands["TCI"] = bandPath
                    elif end == "B02":
                        bands["B02"] = bandPath
                    elif end == "B04":
                        bands["B04"] = bandPath
                    elif end == "B08":
                        bands["B08"] = bandPath
                    elif end == "B11":
                        bands["B11"] = bandPath
                    elif end == "B12":
                        bands["B12"] = bandPath
                i = i + 1;
            print("66666666666666666666666666")
            print(bands)

            # bbox of FARM =[low left of x , low left of y, up right x, up right y]
            # PROJWIN NEED top left corner and low right corner
            # SO WE WILL USE BBOX[0] BBOX[3] BBOX[1] BBOX[2]

            # gdal_translate - projwin - 1.92362735219 51.05906430243 - 1.8999465339485 51.0297833894 - projwin_srs EPSG: 4326 - of GTiff InputPath OutputPath
            FarmBands = {}
            projwin = str(bbox[0]) + " " + str(bbox[3]) + " " + str(bbox[2]) + " " + str(bbox[1])
            for bandPath in bands:
                outputpath = ""
                if checkleng> 80:
                    FarmBands[bandPath] = FarmTexturePath + "OriginalBands/" + bands[bandPath][-11:-8] + ".tif"
                    outputpath = FarmTexturePath + "OriginalBands/" + bands[bandPath][-11:-8] + ".tif"
                else:
                    FarmBands[bandPath] = FarmTexturePath + "OriginalBands/" + bands[bandPath][-7:-4] + ".tif"
                    outputpath = FarmTexturePath + "OriginalBands/" + bands[bandPath][-7:-4] + ".tif"
                print("bands")
                print(outputpath)
                if not os.path.exists(outputpath):
                    command = "gdal_translate -projwin " + str(projwin) + " -projwin_srs EPSG:4326 -of GTiff " + str(
                        bands[bandPath]) + " " + outputpath
                    subprocess.call(command, shell=True)

                else:
                    command = "already clipped"
                    print("already clipped band " + bandPath + ".tif")

            band2 = rasterio.open(FarmBands["B02"])
            band4 = rasterio.open(FarmBands["B04"])
            band8 = rasterio.open(FarmBands["B08"])
            band11 = rasterio.open(FarmBands["B11"])
            band12 = rasterio.open(FarmBands["B12"])
            bandTCI = rasterio.open(FarmBands["TCI"])

            blue = (rasterio.open(FarmBands["B02"])).read(1).astype('float64')
            red = (rasterio.open(FarmBands["B04"])).read(1).astype('float64')
            nir = (rasterio.open(FarmBands["B08"])).read(1).astype('float64')
            SWIR1 = (rasterio.open(FarmBands["B11"])).read(1).astype('float64')
            SWIR2 = (rasterio.open(FarmBands["B12"])).read(1).astype('float64')
            #print(max(redlist[0])+"s "+min(redlist[0]))
            # TCI

            TCIPath = FarmTexturePath + "TCI.tif"

            source_TCI = FarmTexturePath + "OriginalBands/"+"TCI.tif"
            destination_TCI = FarmTexturePath +"TCI.tif"
            copyfile(FarmBands["TCI"], destination_TCI)

            # MSAVI2Path
            MSAVI2Path = FarmTexturePath + "MSAVI2.tif"
            createMSAVI2(MSAVI2Path)
            # NDVI
            ndviPath = FarmTexturePath + "NDVI.tif"
            createNDVI(ndviPath)
            # NDMI
            ndmiPath = FarmTexturePath + "NDMI.tif"
            createNDMI(ndmiPath)
            createADRA()
            createGDRA()
            Textures = ["TCI", "Agriculture_with_DRA", "Geology_with_DRA", "MSAVI2", "NDMI", "NDVI"]

    FieldTablePath = FarmDir + "FieldTable.json"

    with open(FieldTablePath) as json_file:
        NewFieldTable = json.load(json_file)
    json_file.close()
    NewFieldTable['Times'] = Times
    NewFieldTable['Textures'] = Textures

    with open(FieldTablePath, 'w') as json_file:
        json.dump(NewFieldTable, json_file, indent=4)
        json_file.close()
    
    colormap = "../originalData/colortable/"

    for id in NewFieldTable["Field"]:
        FieldBBOX = NewFieldTable["bboxs"][id]
        FieldTextureSrc = FarmDir + "Field" + str(id) + "/textureSrc/"
        if not os.path.exists(FieldTextureSrc):
            os.mkdir(FieldTextureSrc)

        projwin = str(FieldBBOX[0]) + " " + str(FieldBBOX[3]) + " " + str(FieldBBOX[2]) + " " + str(FieldBBOX[1])
        for Texturetime in  NewFieldTable["Times"]:
            inputPath = FarmDir + "FarmTexture/"
            inputPath += str(Texturetime)+"/"
            OutPutFieldTextureSrcTimePath = FieldTextureSrc + str(Texturetime)+"/"

            if not os.path.exists(OutPutFieldTextureSrcTimePath):
                os.mkdir(OutPutFieldTextureSrcTimePath)

            for textureName in NewFieldTable["Textures"]:
                InputFile = inputPath+textureName+".tif"
                OutputTIF = OutPutFieldTextureSrcTimePath+str(textureName)+".tif"
                color_text_file= colormap+textureName+".txt"
                OutputPNG = OutPutFieldTextureSrcTimePath + str(textureName) + ".png"
                # gdaldem color-relief input_dem color_text_file output_color_relief_map
                print("--------------")
                if os.path.exists(color_text_file):
                    if not os.path.exists(OutputTIF):
                        command1 = str("gdal_translate "+"-projwin "+ projwin +" -projwin_srs EPSG:4326 " +InputFile + " " +OutputTIF )
                        command2 = str("gdalinfo -stats "+ OutputTIF)
                        command3 = str("gdaldem color-relief " + OutputTIF + " " + color_text_file + " " + OutputPNG)
                        subprocess.call(command1, shell=True)
                        subprocess.call(command2, shell=True)
                        subprocess.call(command3, shell=True)
                    # gdal_translate -of PNG input.tif output.png  -projwin - 1.92362735219 51.05906430243 - 1.8999465339485 51.0297833894 -projwin_srs EPSG: 4326
                else:
                    command1 = str("gdal_translate -of PNG "+"-projwin "+ projwin +" -projwin_srs EPSG:4326 " +InputFile + " " + OutputPNG)
                    print(command1)
                    subprocess.call(command1, shell=True)
                print("--------------")

if __name__ == "__main__":
    main(sys.argv)