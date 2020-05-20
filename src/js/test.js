//let THREE = require("../../node_modules/three/build/three.module.js");
// let GeoTIFF = reuire("geotiff");
// let TrackballControlslet = require ("../../lib/TrackballControls");
// //import { GUI } from "dat.gui";
// //import * as terrain from "../texture/DMH/dmh.tif";
// //import * as mountainImage from "../textures/DMH/dmhtext.png";


var width  = window.innerWidth,
        height = window.innerHeight;
    
    //Setup scene
    var scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xeeeeee));
    
    // Setup Camera
    const fov = 75;
    const aspect = this.width / this.height;
    const near = 0.1;
    const far = 10000;
    var camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(1000, 1000, 1000);
    camera.lookAt(scene.position);

    // Setup Renderer
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    
    // 1. Get data from tif
    // 2. Convert tif to image
    // 3. Get data from image as height and generate geometry
    // 4. Load texture
    var geometry = null;
    var texture = null;

    var material = null;
    var fieldmesh = null;
    var lowest_point = 1;
    var planehelper = null;
    const readGeoTif = async () => {
        console.log("GeoStart");
        const response = await fetch('../texture/Mill1M.tif');
               
        const arrayBuffer = await response.arrayBuffer();
        const rawTiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const tifImage = await rawTiff.getImage();
        const image = {
            width: tifImage.getWidth(),
            height: tifImage.getHeight()
        };

        geometry = new THREE.PlaneGeometry(
            image.width,
            image.height,
            image.width - 1,
            image.height -1
        );
        console.log("Image width and height");
        console.log(image.width,image.height);
        const data = await tifImage.readRasters({ interleave: true });


        // function secondSmallest(x) {
        //     if (x.length < 2) return 0;

        //     let first = Number.MAX_VALUE;
        //     let second = Number.MAX_VALUE;

        //     for (let i = 0; i < x.length; i++) {
        //         let current = x[i];
        //         if ((current < first) && current>5) {
        //         second = first;
        //         first = current;
        //         } else if (current < second && current !== first && current>5) {
        //             second = current;
        //         }
        //     }
        //     return second;
        // }
        console.log("sssssssssssss");
        
        console.log(rawTiff.readRasters("height"))
        
        var lowest_point = 10000;
        console.log(lowest_point);
        
        data.forEach(function(item){
            if(item<lowest_point && item>5){
                lowest_point =item;
            }
        });
        console.log("find lowest point");
        geometry.vertices.forEach((geom, index) => {
                
                var z = data[index];
                geom.z =( z* -10)+lowest_point*10;

        });

        console.log("lowest_point");
        console.log(lowest_point);
        // var texture_path = fetch('src/texture/DMH/dmht.png');
        var textureLoader = new THREE.TextureLoader();
        texture =  textureLoader.load('../texture/DMH/Mill.png' );
        console.log("material start");


        // // set clip line
        var localPlane = new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), 10);
		var globalPlane = new THREE.Plane( new THREE.Vector3( - 1, 0, 0 ), 2 );
        
    
        renderer.clippingPlanes = [globalPlane];
        renderer.localClippingEnabled = true;

        material = new THREE.MeshLambertMaterial({
            wireframe: false,
            side: THREE.DoubleSide,
            color: 0x2FF29F,
            map:  THREE.ImageUtils.loadTexture('../texture/DMH/Mill.png' ),
            // ***** Clipping setup (material): *****
			clippingPlanes: globalPlane

        });

        console.log(renderer.clippingPlanes);


        console.log("material finsish");
        material.needsUpdate = true;
        console.log("material finsish");
        fieldmesh = new THREE.Mesh(geometry, material);
        console.log("");
        fieldmesh.position.x=0;
        fieldmesh.rotation.x = Math.PI / 2;
        scene.add( fieldmesh );
        console.log("finfish")


        



    }

    readGeoTif();


    ///
    var geometry1 = new THREE.BoxBufferGeometry( 1, 1, 1 );
    var material1 = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    var cube = new THREE.Mesh( geometry1, material1 );
    scene.add( cube );

    //SET Helper
    const gridHelper = new THREE.GridHelper(600, 400);
    scene.add(gridHelper);



    // Setup controller
    var controls = new THREE.TrackballControls(camera); 
    document.getElementById('container').appendChild(renderer.domElement);

    render();

    function render() {
        controls.update();    
        requestAnimationFrame(render);
        renderer.render(scene, camera);
    }


    // Setup GUI