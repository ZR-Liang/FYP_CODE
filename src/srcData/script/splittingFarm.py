import json
import os
import subprocess
import sys

import ogr, osr
# get all field from the farm and save them as a shapefile with EPSG 27700

def CRS_4326To27700(points):
    # points [latitude, longtite]
    inputEPSG = 4326
    outputEPSG = 27700
    pointX = points[0]
    pointY = points[1]
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

def createJSON(name,crs,popupContent,coordinates):

    FieldJSON = {}
    FieldJSON["type"] = "FeatureCollection"
    FieldJSON["name"] = name
    FieldCrs = {"type":"name", "properties": { "name": ("urn:ogc:def:crs:EPSG::"+str(crs))}}
    FieldJSON["crs"] = FieldCrs
    FieldFeatures = [{"type": "Feature",
                      "properties": {"popupContent": popupContent},
                      "geometry": {"type": "Polygon",
                                   "coordinates": coordinates
                                   }
                    }]
    FieldJSON["features"] = FieldFeatures
    return FieldJSON


def main(argv):
    farmname = argv[1]
    farm = "../originalData/Farm/" + farmname + "/" + farmname + ".json"
    output = "../Farm/" + farmname + "/"
    if not os.path.exists(farm):
        print("Wrong address of FARM JSON")
    else:
        with open(farm) as json_file:
            locationX = []
            locationY = []
            FieldTable = {}
            if (os.path.exists(output + "FieldTable.json")):
                with open(output + "FieldTable.json", "r") as FieldTableJson:
                    FieldTable = json.load(FieldTableJson)
                    FieldTableJson.close()
            else:
                with open(output + "FieldTable.json", "w") as FieldTableJson:
                    json.dump(FieldTable, FieldTableJson, indent=4)
                    FieldTableJson.close()
                FieldTable["Field"] = {}
                FieldTable["FieldID"] = {}
                FieldTable["bboxs"] = {}
            outDriver = ogr.GetDriverByName('GeoJSON')
            data = json.load(json_file)
            PerfectField = data["PerfectField"]
            Field_properties = PerfectField["properties"]
            Farm_name = Field_properties["name"]

            for p in data['features']:
                fieldID = p['id'];
                fieldRealID = p["properties"]["Field_id"]
                fieldRealName = p["properties"]["FieldName"]
                FieldTable["Field"][fieldID] = fieldRealName
                FieldTable["FieldID"][fieldID] = fieldRealID
                FieldTable["bboxs"][fieldID] = []
                print('ID: ' + str(p['id']))
                coordinates = p["geometry"]["coordinates"]
                Field_name = "Field" + str(fieldID)
                Coordinates = []
                Coordinates.append([]);

                fieldLocationX = []
                fieldLocationY = []
                for coordinate in coordinates[0]:
                    locationX.append(coordinate[0])
                    locationY.append(coordinate[1])
                    Coordinates[0].append([coordinate[0], coordinate[1]])
                    # swapedCoordinates[0].append(CRS_4326To27700([coordinate[1], coordinate[0]]))
                    fieldLocationX.append(coordinate[0])
                    fieldLocationY.append(coordinate[1])
                FieldTable["bboxs"][fieldID] = [min(fieldLocationX), min(fieldLocationY), max(fieldLocationX),
                                                max(fieldLocationY)]
                FieldJSON = createJSON(Field_name, 4326, Farm_name, Coordinates)
                outputFieldPath = output + "Field" + str(fieldID)
                fielname = "Field" + str(fieldID)
                if (not os.path.exists(outputFieldPath)):
                    os.mkdir(outputFieldPath)
                if (not os.path.exists(os.path.join(outputFieldPath, "shp"))):
                    os.mkdir(os.path.join(outputFieldPath, "shp"))

                filePath = outputFieldPath + "/shp" + "/" + Field_name + ".json"
                if (not os.path.exists(filePath)):
                    with open(filePath, 'w') as outfile:
                        json.dump(FieldJSON, outfile)
                print()
                if (not os.path.exists(filePath[:-4] + "shp")):
                    print(filePath[:-4] + "shp")
                    command = "ogr2ogr -f \"ESRI Shapefile\" -s_srs EPSG:4326 -t_srs EPSG:27700 " + filePath[
                                                                                                    :-4] + "shp " + filePath[
                                                                                                                    :-4] + "json"
                    print(command)
                    subprocess.call(command, shell=True)

                outputJSONPath = None
                FieldJSON = None
                Coordinates = None

            with open(output + "FieldTable.json", "w") as FieldTableJson:
                FieldTable["bbox"] = [min(locationX), min(locationY), max(locationX), max(locationY)]
                json.dump(FieldTable, FieldTableJson, indent=4)
                FieldTableJson.close()
            print(CRS_4326To27700([min(locationY), min(locationX)]))
            print(CRS_4326To27700([max(locationY), max(locationX)]))
        json_file.close()



if __name__ == "__main__":
    main(sys.argv)