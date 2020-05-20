
var elevationScale = 2;
var width  = window.innerWidth,height = window.innerHeight;
var mouseX = 0, mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var initFieldID;

var FieldNames;
var FieldTextures;
var cachedGeometrys = {};
var legend = {};
var gui;
var bbox = [];
var unit = 2;
var svg = document.getElementById('legend');
var renderingFieldID;
var renderingMesh;
var renderingTexture;

var textureDates =[]
var renderingDate;

var FarmTable = setFarmTable("src/srcData/FarmTable.json")
var allFarms = FarmTable.Farms;
var renderingFarm = FarmTable.Farms[0]
var FieldTable =setFieldTable(("src/srcData/Farm/"+renderingFarm+"/FieldTable.json"))

// init the map of field's ID and name
// load all field's textures 
// all information stored in FieldTable.json

textureDates = FieldTable.Times;
initFieldID = Object.keys(FieldNames)[0];
renderingFieldID = Object.keys(FieldNames)[0];
renderingDate = textureDates[0];
var checkInit =0;

Object.keys(FieldNames).find(function(value) { 
   
    if(value === GetQueryString('id')) { 
        //则包含该元素    
        initFieldID = GetQueryString('id');
        renderingFieldID  = GetQueryString('id');
        checkInit =1;
    }

})

if(checkInit==0 && GetQueryString('id')!=null){
    alert("your input id is "+GetQueryString('id')+" does not exist")
}


function GetQueryString(name)
{
     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);
     if(r!=null)return  unescape(r[2]); return null;
}

//Setup scene
var scene = new THREE.Scene();
// Set Light 
var light = new THREE.DirectionalLight(0xffffff);
light.position.set(500, 1000, 250);
scene.add(light);
 
// Setup Camera
const fov = 75;
const aspect = this.width / this.height;
const near = 0.1;
const far = 10000;
var camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(50,300, 50);
camera.lookAt(scene.position);
window.addEventListener( 'resize', onWindowResize, false );
// Setup Renderer
var renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xd3d3d3);
renderer.setSize(width, height);

// Setup clipping line
var globalPlane = new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), -1 );
renderer.clippingPlanes = [globalPlane.negate()];
renderer.localClippingEnabled = true;

// Setup GUI
var params = null;
initGUI();


console.time("parseGeom");
// setup mesh
initMesh();

console.timeEnd("parseGeom");
//SET Helper

const gridHelper = new THREE.GridHelper(600, 400);
scene.add(gridHelper);

// Setup controller
var controls = new THREE.OrbitControls(camera,renderer.domElement); 
document.getElementById('container').appendChild(renderer.domElement);

render();

function initMesh(){
    console.log("init Mesh");
    const initGeoTif = async () => {
        const field_response = await fetch(getDSMPath(initFieldID));
        const field_arrayBuffer = await field_response.arrayBuffer();
        const field_rawTiff = await GeoTIFF.fromArrayBuffer(field_arrayBuffer);
        const field_tifImage = await field_rawTiff.getImage();
        bbox = field_tifImage.getBoundingBox();
        console.log("bbox----------------------");
        console.log(bbox);
        const field_image = {
            width: field_tifImage.getWidth(),
            height: field_tifImage.getHeight()
        };

        console.log("Field image  width:"+field_image.width+"      height"+field_image.height)
        console.log("bbox:"+ bbox)

        var renderGeometry = new THREE.PlaneGeometry(
            field_image.width,
            field_image.height,
            field_image.width - 1,
            field_image.height -1
        );
        cachedGeometrys[initFieldID] = renderGeometry;
        var checknodata = 0
        const field_data = await field_tifImage.readRasters({ interleave: true });
        lowest_point = 10000;
        var heightpoint = field_data[0]
        field_data.forEach(function(item){
            if(item<lowest_point && item>0.1){
                lowest_point = item;
            }
            if(item==0){
                checknodata = 1;
            }
            if(item>=heightpoint){
                heightpoint = item;
            }
        });
        console.log("lowest point "+ lowest_point+"-------------"+checknodata+"------------- "+heightpoint)
        renderGeometry.vertices.forEach((geom, index) => {
                var z = field_data[index];
                geom.z =( z*elevationScale)-lowest_point*elevationScale+10;
        });
        //needed for helper
        
        var renderMaterial = new THREE.MeshLambertMaterial({
            wireframe: false,
            side: THREE.DoubleSide,
            map:  THREE.ImageUtils.loadTexture(getTexturePath(initFieldID,FieldTextures[0]))
        });
        renderingTexture = 0;
        renderMaterial.needsUpdate = true;
        //renderingMesh
        renderingMesh = new THREE.Mesh(renderGeometry, renderMaterial);
        renderingMesh.name = "renderingField";
        renderingMesh.position.x=0;
        renderingMesh.rotation.x =3 *  Math.PI / 2;
        scene.add(renderingMesh);
        container.addEventListener( 'mousemove', onMouseMove, false );
        console.log("The X axis is red. The Y axis is green. The Z axis is blue.");
        // const axesHelper = new THREE.AxesHelper(500);
        // scene.add(axesHelper);

    }
    initGeoTif();
    setLegend(FieldTextures[0])
    console.log("-----------------------------------------")
    setMeteData(renderingFieldID,FieldTextures[0])

}

function render() {
    controls.update();    
    requestAnimationFrame(render);
    renderer.render(scene, camera); 
}

function initGUI(){

    params = {
        Farm: renderingFarm,
        Field: initFieldID,
        FieldName: FieldNames[initFieldID],
        Texture: FieldTextures[0],
        MAXIMUM:"",
        MEAN: "",
        MINIMUM:"",
        Longitude:"0",
        Latitude:"0",
        Elevation:"0",
        Date:textureDates[0],
        Value:"0"
    };
    gui = new dat.GUI();
    gui.add( params, 'Farm', allFarms).name( 'Farm' ).onChange( function ( value ) {
        console.log("farm "+value);
        renderingFarm =value;
        FieldTable =setFieldTable(("src/srcData/Farm/"+renderingFarm+"/FieldTable.json"));
        textureDates = FieldTable.Times;
        initFieldID = Object.keys(FieldNames)[0];
        renderingFieldID = Object.keys(FieldNames)[0];
        renderingDate = textureDates[0];
        cachedGeometrys= {};
        scene.remove( scene.getObjectByName(renderingMesh.name) );
        initMesh();
        gui.destroy();
        initGUI();
        // renderingFarm = value
    });
    gui.add(params,'FieldName');
   
    var guiFieldName ={}
    for ( index in FieldNames){
        guiFieldName[index] = index;
    }
    // guiFieldName : name: id
    gui.add( params, 'Field',guiFieldName).name( 'Field ID' ).onChange( function ( value ) {
        renderingFieldID  =  value;
      
        if(cachedGeometrys[value]==null){
            console.time("parseGeom");
            addGeometrys(getDSMPath(value),value);
            console.log("Field "+value+" render time");
            console.timeEnd("parseGeom");
        }else{
            scene.getObjectByName("renderingField").geometry = cachedGeometrys[value];
            scene.getObjectByName("renderingField").material.map = THREE.ImageUtils.loadTexture(getTexturePath(renderingFieldID,FieldTextures[renderingTexture]));
        }
        params.FieldName = FieldNames[value];
        renderingFieldID = value;
        setLegend(FieldTextures[renderingTexture])
        setMeteData(renderingFieldID,FieldTextures[renderingTexture])
        gui.updateDisplay();
        render();
        //drawTable();
    });

    // guiTextureName = texturename : index
    gui.add( params, 'Date', textureDates).name( 'Date' ).onChange( function ( value ) {
        renderingDate = value;
        scene.getObjectByName("renderingField").material.map = THREE.ImageUtils.loadTexture(getTexturePath(renderingFieldID,FieldTextures[renderingTexture]));
        render();
        setLegend(FieldTextures[renderingTexture]);
        setMeteData(renderingFieldID,FieldTextures[renderingTexture]);

    });

    var guiTextureNames = {}
    for ( index in Object.keys(FieldTextures)){
        guiTextureNames[FieldTextures[index]] = index;
        console.log("GUI Texture Names value " +guiTextureNames[FieldTextures[index]]+ " KEY"+ FieldTextures[index] + " index "+index)
    }

    // guiTextureName = texturename : index
    gui.add( params, 'Texture', guiTextureNames).name( 'Texture' ).onChange( function ( value ) {
        renderingTexture = value;
        scene.getObjectByName("renderingField").material.map = THREE.ImageUtils.loadTexture(getTexturePath(renderingFieldID,FieldTextures[value]));
        render();
        setLegend(FieldTextures[renderingTexture])
        setMeteData(renderingFieldID,FieldTextures[renderingTexture])
        gui.updateDisplay(); 
        render();
    });



    var FieldValue = gui.addFolder('location');
    FieldValue.add(params,'Longitude');
    FieldValue.add(params,'Latitude');
    FieldValue.add(params,'Elevation');
    var textureValue = gui.addFolder('Texture Value');
    textureValue.add(params,"MAXIMUM");
    textureValue.add(params,"MEAN");
    textureValue.add(params,"MINIMUM")
    

    //gui.add(params,'Value');

}

function setFarmTable(url){
    var rawJSON = new XMLHttpRequest();
    rawJSON.open("GET",url, false);
    var JSONcontent;
    rawJSON.onreadystatechange = function ()
    {
        if(rawJSON.readyState === 4)
        {
            if(rawJSON.status === 200 || rawJSON.status == 0)
            {
                JSONcontent =  JSON.parse(rawJSON.responseText);  

            }else{
                console.log("not 200")
            }
        }else{
            console.log("not 4")
        }
        
    }
    rawJSON.send(null);
    console.log(JSONcontent)
    return JSONcontent
}


function setFieldTable(url){
    var rawJSON = new XMLHttpRequest();
    rawJSON.open("GET",url, false);
    var JSONcontent;
    rawJSON.onreadystatechange = function ()
    {
        if(rawJSON.readyState === 4)
        {
            if(rawJSON.status === 200 || rawJSON.status == 0)
            {
                JSONcontent =  JSON.parse(rawJSON.responseText);  
                FieldTextures = JSONcontent.Textures;
                FieldNames = JSONcontent.Field;
                textureDates = JSONcontent.Times;
            }
        }
    }
    rawJSON.send(null);
    return JSONcontent
}

function getTexturePath(FieldID,TextureName){
    console.log( "Get Texture path: "+"src/srcData/Farm/"+renderingFarm+"/Field"+FieldID+"/"+"textureSrc/"+renderingDate+"/"+TextureName+".png")
    return  "src/srcData/Farm/"+renderingFarm+"/Field"+FieldID+"/"+"textureSrc/"+renderingDate+"/"+TextureName+".png"
}


function getTextureMeteData(FieldID,TextureName){
    console.log("Get METEDATA path: "+"src/srcData/Farm/"+renderingFarm+"/Field"+FieldID+"/"+"textureSrc/"+renderingDate+"/"+TextureName+".tif.aux.xml")
    return "src/srcData/Farm/"+renderingFarm+"/Field"+FieldID+"/"+"textureSrc/"+renderingDate+"/"+TextureName+".tif.aux.xml"
}

function getDSMPath(FieldID){
    console.log("DSM path is: "+"src/srcData/Farm/"+renderingFarm+"/Field"+FieldID+"/DSM.tif")
    return "src/srcData/Farm/"+renderingFarm+"/Field"+FieldID+"/DSM.tif"
}


function setMeteData(FieldID,TextureName){
    console.log("Set mete data")
    let XMLpath = getTextureMeteData(FieldID,TextureName);
    console.log(XMLpath)
    if (window.XMLHttpRequest)
    {
        xhttp=new XMLHttpRequest();
    }
    else
    {
        xhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }
    try{
        xhttp.open("GET",XMLpath,false);
        xhttp.send();
        let metedata = xhttp.responseXML.getElementsByTagName("MDI");
        params.MAXIMUM = metedata[1].innerHTML;
        params.MEAN =  metedata[2].innerHTML;
        params.MINIMUM =  metedata[3].innerHTML;
        console.log(params.MAXIMUM+" "+params.MEAN+" "+params.MINIMUM)
    }catch(err){
        params.MAXIMUM ="";
        params.MEAN = "";
        params.MINIMUM ="";
        console.log("no mete data")
    }
    gui.updateDisplay();   
    console.log("Set mete data END")
}


function addGeometrys(field_path,field_id){

    const addGeoTif = async () => {
        const field_response = await fetch(field_path);
        const field_arrayBuffer = await field_response.arrayBuffer();
        const field_rawTiff = await GeoTIFF.fromArrayBuffer(field_arrayBuffer);
        const field_tifImage = await field_rawTiff.getImage();
        bbox = field_tifImage.getBoundingBox();
        const field_image = {
            width: field_tifImage.getWidth(),
            height: field_tifImage.getHeight()
        };
        var addedGeometry = new THREE.PlaneGeometry(
            field_image.width,
            field_image.height,
            field_image.width - 1,
            field_image.height -1
        );

        var checknodata = 0
        const field_data = await field_tifImage.readRasters({ interleave: true });
        lowest_point = 10000;
        var heightpoint =  field_data[0]
        field_data.forEach(function(item){
            if(item<lowest_point && item>0.1){
                lowest_point =item;
            }
            if(item==0){
                checknodata = 1;
            }
            if(item>=heightpoint){
                heightpoint = item;
            }
        });
        console.log("lowest point "+ lowest_point+"-------------"+checknodata+"------------- "+heightpoint)
        var lastValue = -1;
        addedGeometry.vertices.forEach((geom, index) => {
                var z = field_data[index];
                if(z == 255){
                    z = lastValue;
                    console.log(z)
                }else{
                    if(z>=lowest_point){
                        lastValue = z;
                    }    
                }
                geom.z =( z*elevationScale)-lowest_point*elevationScale+0.001;
        });
        cachedGeometrys[field_id] = addedGeometry;

        scene.getObjectByName("renderingField").geometry = cachedGeometrys[field_id];

        scene.getObjectByName("renderingField").material.map = THREE.ImageUtils.loadTexture(getTexturePath(renderingFieldID,FieldTextures[renderingTexture]));
    }
    addGeoTif();

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
// new function
//
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// because I rotate the object
// The X axis is red. The Y axis is green. The Z axis is blue.
// X is longitude 
// Z is latitude 
// Y is Elevation
var read = new Float32Array( 4 );
function onMouseMove( event ) {
    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    raycaster.setFromCamera( mouse, camera );          
    // See if the ray from the camera into the world hits one of our meshes
    var intersects = raycaster.intersectObject( renderingMesh);
    // Toggle rotation bool for meshes that we clicked
    var centreX = (bbox[0]+bbox[2])/2;
    var centreY = (bbox[1]+bbox[3])/2;
    if ( intersects.length > 0 ) {
        params.Longitude = (unit*intersects[ 0 ].point.x + centreX).toFixed(2);
        params.Latitude = (centreY- unit*intersects[ 0 ].point.z).toFixed(2);
        params.Elevation = ((intersects[ 0 ].point.y+elevationScale*lowest_point)/elevationScale).toFixed(3);
        //params.Value = intersects[ 0 ].point.x;
        //console.log(intersects[ 0 ].point);
        gui.updateDisplay();

    }else{
        console.log("No");
    }
}

//setLegend(1,"NDVI_BlueGreen")
function setLegend(textureName){
    console.log(" texture name "+ textureName+" "+FieldTextures);
    const legend = new XMLHttpRequest();
    const url = "src/srcData/legend/"+textureName+".txt"
    console.log("color table path: "+url)
    legend.open("GET",url, false);
    legend.onreadystatechange = function ()
    { 
        if(legend.readyState === 4)
        {
            if(legend.status === 200 || legend.status == 0)
            {
                const content =  legend.responseText;  
                let lines = content.split('\n');
                console.log(lines)
                let rgba;
                lines = lines.filter(function() { return true; });
                console.log("**************************************");
                console.log("set")
                for(let i = 0; i　< lines.length; i++) {
                    rgba = lines[i].split(",")[1]+","+lines[i].split(",")[2]+","+lines[i].split(",")[3]+","+lines[i].split(",")[4]; 
                    const bandnumber = ('band'+(i+1)).toString();
                    document.getElementById( bandnumber ).setAttribute("stop-color","rgba("+rgba+")")
                    let value = lines[i].split(",")[0];
                    console.log( bandnumber +" and value "+ value);
                    if(value.toString()=="0"){
                        document.getElementById('Value'+(i+1)).innerHTML = "";
                    }else{
                        document.getElementById('Value'+(i+1)).innerHTML = value;
                    }
                } 
            }
        }
    }
    legend.send(null);
}


function drawTable() {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Soil Composition');
    data.addColumn('string', 'Value');
    let Soilurl ="src/srcData/Field"+renderingFieldID+"/properties.json";
    let SoilJSON = new XMLHttpRequest();
    SoilJSON.open("GET",Soilurl, false);
    let SoilJSONcontent;
    let SoilRows=[];
    SoilJSON.onreadystatechange = function ()
    {
        if(SoilJSON.readyState === 4)
        {
            if(SoilJSON.status === 200 || SoilJSON.status == 0)
            {
                SoilJSONcontent =  JSON.parse(SoilJSON.responseText);  
                SoilDetails = SoilJSONcontent.properties;
                let i = 0; 
                for (elemesnt in SoilDetails){
                    if(i>2){
                        SoilRows.push([elemesnt,SoilDetails[elemesnt].toString()]);
                    }
                    i += 1;
                }
                console.log("==========================");
                data.addRows(SoilRows);
                let table = new google.visualization.Table(document.getElementById('soilDetails'));
                table.draw(data, {showRowNumber: true, width: '100%', height: '100%'});
            }
        }
    }
    SoilJSON.send(null);
}