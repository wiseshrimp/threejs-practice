$(function () {
    const addModel = (geometry, materials) => {
        var material = new THREE.MeshFaceMaterial(materials);
        model = new THREE.Mesh(geometry, material);
        model.scale.set(5, 5, 5);
        model.position.set(0, 0, 0);
        scene.add(model);
        console.log(model);
        
    }
    
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .1, 500);
    var renderer = new THREE.WebGLRenderer();

    renderer.setClearColor(0xdddddd);
    renderer.setSize(window.innerWidth, window.innerHeight);

    var axis = new THREE.AxisHelper(10);
    scene.add(axis);

    var grid = new THREE.GridHelper(50, 5);
    var color = new THREE.Color("rgb(255, 0, 0)");
    grid.setColors(color, 0x000000);

    loader = new THREE.JSONLoader();
    loader.load('test.json', addModel);

    camera.position.x = 40;
    camera.position.y = 40;
    camera.position.z = 40;

    camera.lookAt(scene.position);

    $("#webGL-container").append(renderer.domElement);
    renderer.render(scene, camera);
})