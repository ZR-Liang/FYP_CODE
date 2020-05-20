import json
import os
import subprocess

Farm_Path = "../originalData/Farm"
output_dir = "../Farm/"
farm_table = "../FarmTable.json"
farms = []
if not os.path.exists(output_dir):
    print("no")
    os.mkdir(output_dir)
if not os.path.exists(farm_table):
    with open(farm_table, 'w') as file:
        json.dump(farms,file)
    file.close()
else:
    with open(farm_table) as file:
        farms = json.load(file)["Farms"]
    file.close()
print(farms)

farms = []
for farmname in os.listdir(Farm_Path):
    print(farmname)
    if farmname not in farms:
        print(farmname+"=============")
        if not os.path.exists(os.path.join(output_dir,farmname)):
            print("create folder of farm "+farmname)
            os.mkdir(os.path.join(output_dir,farmname))

        command = "python splittingFarm.py "+ farmname
        subprocess.call(command, shell=True)

        command = "python getFarmDSM.py " + farmname
        subprocess.call(command, shell=True)

        command = "python getFieldDSM.py " + farmname
        subprocess.call(command, shell=True)

        command = "python clipTexture.py " + farmname
        subprocess.call(command, shell=True)
    else:
        print(farmname+" already done")