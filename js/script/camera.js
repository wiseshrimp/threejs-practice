if (!Detector.webgl) Detector.addGetWebGLMessage();

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var renderer, container, stats;
var camera, scene;
var cameraOrtho, sceneRenderTarget;
var uniformsNoise, uniformsNormal,
    heightMap, normalMap,
    quadTarget;
var directionalLight;
var terrain;
var lightVal = 0, lightDir = 1;
var clock = new THREE.Clock();
var updateNoise = true;
var mlib = {};
var havePointerLock = checkForPointerLock();
var controls, controlsEnabled;
var moveForward,
    moveBackward,
    moveLeft,
    moveRight,
    canJump;
var velocity = new THREE.Vector3();

init();
animate();

function init() {
    container = document.getElementById('container');
    
    // SCENE (RENDER TARGET)
    sceneRenderTarget = new THREE.Scene();
    cameraOrtho = new THREE.OrthographicCamera( SCREEN_WIDTH / - 2, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT / - 2, -10000, 10000 );
    cameraOrtho.position.z = 0;
    sceneRenderTarget.add(cameraOrtho);
    
    // CAMERA
    camera = new THREE.PerspectiveCamera( 40, SCREEN_WIDTH / SCREEN_HEIGHT, 2, 4000 );
    camera.position.set( -1200, 800, 1200 );
    controls = new THREE.OrbitControls(camera);
    controls.minDistance = 150;
    controls.maxDistance = 1500;
    controls.minPolarAngle = 1;
    controls.maxPolarAngle = 1.5;
  
    
    // SCENE (FINAL)
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x52828a, 1, 1000);
    
    initPointerLock();
    initControls();
    updateControls();
    controlsPointer = new THREE.PointerLockControls(camera);
    scene.add(controlsPointer.getObject());

    // LIGHTS
    scene.add( new THREE.AmbientLight( 0xeec340 ) );
    directionalLight = new THREE.DirectionalLight( 0xffffff, 1.15 );
    directionalLight.position.set( 500, 2000, 0 );
    scene.add( directionalLight );
    
    // HEIGHT + NORMAL MAPS
    var normalShader = THREE.NormalMapShader;
    var rx = 256, ry = 256;
    var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
    heightMap  = new THREE.WebGLRenderTarget( rx, ry, pars );
    heightMap.texture.generateMipmaps = false;
    normalMap = new THREE.WebGLRenderTarget( rx, ry, pars );
    normalMap.texture.generateMipmaps = false;
  
    uniformsNoise = {
        time:   { value: 1.0 },
        scale:  { value: new THREE.Vector2( 1.5, 1.5 ) },
        offset: { value: new THREE.Vector2( 0, 0 ) }
    };
    uniformsNormal = THREE.UniformsUtils.clone( normalShader.uniforms );
    uniformsNormal.height.value = 0.05;
    uniformsNormal.resolution.value.set( rx, ry );
    uniformsNormal.heightMap.value = heightMap.texture;

    var vertexShader = document.getElementById('vertexShader').textContent;

    // TEXTURES
    var loadingManager = new THREE.LoadingManager( function(){
        terrain.visible = true;
    });
    var textureLoader = new THREE.TextureLoader( loadingManager );
    var specularMap = new THREE.WebGLRenderTarget( 2048, 2048, pars );
    specularMap.texture.generateMipmaps = false;
    var diffuseTexture1 = textureLoader.load( "textures/sand-main.jpg");
    var diffuseTexture2 = textureLoader.load( "textures/sand-waves.jpg" );
    var detailTexture = textureLoader.load( "textures/sand-detail.jpg" );
    diffuseTexture1.wrapS = diffuseTexture1.wrapT = THREE.RepeatWrapping;
    diffuseTexture2.wrapS = diffuseTexture2.wrapT = THREE.RepeatWrapping;
    detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping;
    specularMap.texture.wrapS = specularMap.texture.wrapT = THREE.RepeatWrapping;

    // TERRAIN SHADER
    var terrainShader = THREE.ShaderTerrain[ "terrain" ];
    var uniformsTerrain = THREE.UniformsUtils.clone( terrainShader.uniforms );
    uniformsTerrain[ 'tNormal' ].value = normalMap.texture;
    uniformsTerrain[ 'uNormalScale' ].value = 3.5;
    uniformsTerrain[ 'tDisplacement' ].value = heightMap.texture;
    uniformsTerrain[ 'tDiffuse1' ].value = diffuseTexture1;
    uniformsTerrain[ 'tDiffuse2' ].value = diffuseTexture2;
    uniformsTerrain[ 'tSpecular' ].value = specularMap.texture;
    uniformsTerrain[ 'tDetail' ].value = detailTexture;
    uniformsTerrain[ 'enableDiffuse1' ].value = true;
    uniformsTerrain[ 'enableDiffuse2' ].value = true;
    uniformsTerrain[ 'enableSpecular' ].value = true;
    uniformsTerrain[ 'diffuse' ].value.setHex( 0xffffff );
    uniformsTerrain[ 'specular' ].value.setHex( 0xffffff );
    uniformsTerrain[ 'shininess' ].value = 30;
    uniformsTerrain[ 'uDisplacementScale' ].value = 375;
    uniformsTerrain['uRepeatOverlay'].value.set(6, 6);
    
    var params = [
        [ 'heightmap', 	document.getElementById( 'fragmentShaderNoise' ).textContent, 	vertexShader, uniformsNoise, false ],
        [ 'normal', 	normalShader.fragmentShader,  normalShader.vertexShader, uniformsNormal, false ],
        [ 'terrain', 	terrainShader.fragmentShader, terrainShader.vertexShader, uniformsTerrain, true ]
    ];
  
    for ( var i = 0; i < params.length; i ++ ) {
        material = new THREE.ShaderMaterial( {
            uniforms: 		params[ i ][ 3 ],
            vertexShader: 	params[ i ][ 2 ],
            fragmentShader: params[ i ][ 1 ],
            lights: 		params[ i ][ 4 ],
            fog: 			true
            } );
        mlib[ params[ i ][ 0 ] ] = material;
    }

    var plane = new THREE.PlaneBufferGeometry( SCREEN_WIDTH, SCREEN_HEIGHT );
    quadTarget = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
    quadTarget.position.z = -500;
    sceneRenderTarget.add(quadTarget);
    
    // TERRAIN MESH
    var geometryTerrain = new THREE.PlaneBufferGeometry( 6000, 6000, 256, 256 );
    THREE.BufferGeometryUtils.computeTangents( geometryTerrain );
    terrain = new THREE.Mesh( geometryTerrain, mlib[ 'terrain' ] );
    terrain.position.set( 0, -125, 0 );
    terrain.rotation.x = -Math.PI / 2;
    terrain.visible = false;
    scene.add(terrain);
    
    // RENDERER
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( scene.fog.color );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    container.appendChild(renderer.domElement);
    
    // STATS
    stats = new Stats();
    container.appendChild(stats.domElement);
    
    // EVENTS
    onWindowResize();
    window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener('keydown', onKeyDown, false);
}

function checkForPointerLock() {
  return 'pointerLockElement' in document || 
         'mozPointerLockElement' in document || 
         'webkitPointerLockElement' in document;
}
function initPointerLock() {
  var element = document.body;

  if (havePointerLock) {
    var pointerlockchange = function (event) {
      if (document.pointerLockElement === element ||
          document.mozPointerLockElement === element ||
          document.webkitPointerLockElement === element) {
        controlsEnabled = true;
        controlsPointer.enabled = true;
      } else {
        controlsEnabled = false;
        controlsPointer.enabled = false;
      }
    };

    var pointerlockerror = function (event) {
      element.innerHTML = 'PointerLock Error';
    };

    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

    document.addEventListener('pointerlockerror', pointerlockerror, false);
    document.addEventListener('mozpointerlockerror', pointerlockerror, false);
    document.addEventListener('webkitpointerlockerror', pointerlockerror, false);

    var requestPointerLock = function(event) {
      element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
      element.requestPointerLock();
    };
    element.addEventListener('click', requestPointerLock, false);
  } else {
    element.innerHTML = 'Bad browser; No pointer lock';
  }
}

function initControls() {
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
}

function onKeyDown(e) {
  switch (e.keyCode) {
    case 87:
      moveForward = true;
      break;
    case 65:
      moveLeft = true;
      break;
    case 83:
      moveBackward = true;
      break;
    case 68:
      moveRight = true;
      break;
    case 32: // space
      if (canJump === true) velocity.y += 350;
      canJump = false;
      break;
  }
}

function onKeyUp(e) {
  switch(e.keyCode) {
    case 87:
      moveForward = false;
      break;
    case 65:
      moveLeft = false;
      break;
    case 83:
      moveBackward = false;
      break;
    case 68:
      moveRight = false;
      break;
    case 78:
          lightDir *= -1;
          break;
    case 77: /*M*/  animDeltaDir *= -1; break;
  }
  updateControls();
}

function updateControls() {
    if (controlsEnabled) {
 
    var delta = clock.getDelta();
    var walkingSpeed = 1500.0;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 100.0 * delta;

    if (moveForward) velocity.z -= walkingSpeed * delta;
    if (moveBackward) velocity.z += walkingSpeed * delta;
    if (moveLeft) velocity.x -= walkingSpeed * delta;
    if (moveRight) velocity.x += walkingSpeed * delta;

    controlsPointer.getObject().translateX(velocity.x * delta);
    controlsPointer.getObject().translateY(velocity.y * delta);
    controlsPointer.getObject().translateZ(velocity.z * delta);

    if (controlsPointer.getObject().position.y < 10) {
      velocity.y = 0;
      controlsPointer.getObject().position.y = 10;
      canJump = true;
    }
  }
}
//
function onWindowResize( event ) {
    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();
}

//
function animate() {
    requestAnimationFrame(animate);
    updateControls();
    stats.update();
    render();
}

function render() {
    var delta = clock.getDelta();
    if ( terrain.visible ) {
        controls.update();
        var time = Date.now() * 0.001;
        var fLow = 0.1, fHigh = 0.8;
        lightVal = THREE.Math.clamp( lightVal + 0.5 * delta * lightDir, fLow, fHigh );
        var valNorm = ( lightVal - fLow ) / ( fHigh - fLow );
        scene.fog.color.setHSL( 0.1, 0.5, lightVal );
        renderer.setClearColor( scene.fog.color );
        directionalLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.1, 1.15 );
        // uniformsTerrain['uNormalScale'].value = THREE.Math.mapLinear(valNorm, 0, 1, 0.6, 3.5);
        
        if ( updateNoise ) {            
            quadTarget.material = mlib[ 'heightmap' ];
            renderer.render( sceneRenderTarget, cameraOrtho, heightMap, true );
            quadTarget.material = mlib[ 'normal' ];
            renderer.render( sceneRenderTarget, cameraOrtho, normalMap, true );
        }
        renderer.render( scene, camera );
    }
}
