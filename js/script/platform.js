var geometry = new THREE.BoxGeometry(500, 500, 500);

// TEXTURES:
var texture = new THREE.TextureLoader().load('textures/pink-gradient.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 4, 4 );
var material = new THREE.MeshBasicMaterial({ map: texture });

// CUBE1:
var cube = new THREE.Mesh(geometry, material);
    cube.position.x = 100;
    cube.position.y = 500;
    cube.position.z = 600;
scene.add(cube);

// CUBE2:
var cube2 = new THREE.Mesh(geometry, material);
    cube.position.x = 300;
    cube.position.y = 200;
    cube.position.z = 900;
scene.add(cube2);