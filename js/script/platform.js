var geometry = new THREE.BoxGeometry(600, 600,600);
var texture = new THREE.TextureLoader().load('textures/pink-gradient.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 4, 4 );

var material = new THREE.MeshBasicMaterial({ map: texture });

var cube = new THREE.Mesh(geometry, material);

scene.add(cube);

