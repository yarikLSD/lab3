//импорт библиотеки three.js
import * as THREE from "./libs/three.module.js";

//импорт библиотек для загрузки моделей и материалов
import { MTLLoader } from './libs/MTLLoader.js';
import { OBJLoader } from './libs/OBJLoader.js';

//импорт библиотеки для загрузки моделей в формате glb
import { GLTFLoader } from './libs/GLTFLoader.js';

// Ссылка на элемент веб страницы в котором будет отображаться графика
var container;
// Переменные "камера", "сцена" и "отрисовщик"
var camera, scene, renderer;

//глобальные переменные для хранения списка анимаций
var mixer, morphs = [];
//создание списка анимаций в функции Init
mixer = new THREE.AnimationMixer( scene );
var keyboard = new THREEx.KeyboardState();

var clock = new THREE.Clock();
var storkPath;
var flamingo;
var flam=false;
var T=20.0;
var t=0.0;
var followStork=false;
var axisY=new THREE.Vector3(0,1,0);

// Глобальная переменная для хранения карты высот 
var imagedata; 

var N = 255;
var a = 0.0;




// Функция инициализации камеры, отрисовщика, объектов сцены и т.д.
init();
// Обновление данных по таймеру браузера
animate();

// В этой функции можно добавлять объекты и выполнять их первичную настройку
function init()
{
    // Получение ссылки на элемент html страницы
    container = document.getElementById( 'container' );
    // Создание "сцены"
    scene = new THREE.Scene();
    // Установка параметров камеры
    // 45 - угол обзора
    // window.innerWidth / window.innerHeight - соотношение сторон
    // 1 - 4000 - ближняя и дальняя плоскости отсечения
    camera = new THREE.PerspectiveCamera(
    25, window.innerWidth / window.innerHeight, 1, 4000 );
    // Установка позиции камеры
    camera.position.set(128, 255, 512);

    // Установка точки, на которую камера будет смотреть
    camera.lookAt(new THREE.Vector3( 128, 0.0, 128));
    // Создание отрисовщика
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    // Закрашивание экрана синим цветом, заданным в 16ричной системе
    renderer.setClearColor( 0x000000ff, 1);
    container.appendChild( renderer.domElement );

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Добавление функции обработки события изменения размеров окна
    window.addEventListener( 'resize', onWindowResize, false );
   

    
    
    //создание точечного источника освещения, параметры: цвет, интенсивность, дальность
    const light = new THREE.PointLight( 0xfcf186, 1, 1000 );
    light.position.set( N/2, N, N/2 ); //позиция источника освещения
    light.castShadow = true; //включение расчёта теней от источника освещения
    scene.add( light ); //добавление источника освещения в сцену
    //настройка расчёта теней от источника освещения
    light.shadow.mapSize.width = 1024; //ширина карты теней в пикселях
    light.shadow.mapSize.height = 1024; //высота карты теней в пикселях
    light.shadow.camera.near = 0.5; //расстояние, ближе которого не будет теней
    light.shadow.camera.far = 1500; //расстояние, дальше которого не будет теней

    // вызов функции загрузки модели (в функции Init)
    addSphere(670, "img/sky-texture.jpg");
    loadModel('models/', "Tree.obj", "Tree.mtl");
    loadAnimatedModel('models/Stork.glb', 120, 50, 115,false );
    flamingo=loadAnimatedModel('models/Flamingo.glb', 150, 55, 100, true );
    storkPath=addR();

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var img = new Image();
    img.onload = function()
{
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0 );
    imagedata = context.getImageData(0, 0, img.width, img.height);
    // Пользовательская функция генерации ландшафта
    addTerrain();
   
}
    // Загрузка изображения с картой высот
    img.src = 'img/1.jpg';

}
    function getPixel( imagedata, x, y )
{
    var position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
    return data[ position ];;
}


function onWindowResize()
{
    // Изменение соотношения сторон для виртуальной камеры
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Изменение соотношения сторон рендера
    renderer.setSize( window.innerWidth, window.innerHeight );
}


// В этой функции можно изменять параметры объектов и обрабатывать действия пользователя
function animate()
{

    var delta = clock.getDelta();
    t += delta;
    mixer.update( delta );


    for (var i = 0; i<morphs.length; i ++ )
    {
        var morph = morphs[ i ];
        var pos = new THREE.Vector3();
        if (t>=T) t=0.0;
             pos.copy(storkPath.getPointAt(t/T));
        
             morph.position.copy(pos);
        if((t+0.001)>=T) t=0.0;
             var nextPoint = new THREE.Vector3();
            nextPoint.copy(storkPath.getPointAt((t+0.001)/T));
            morph.lookAt(nextPoint);
            if (keyboard.pressed("1"))
            {
                followStork=true;
                flam=false;
            }
            if (keyboard.pressed("2"))
            {
                followStork=false;
                flam=true;
            }
            if (keyboard.pressed("3"))
            {
                followStork=false;
                flam=false;
                // Установка позиции камеры
                camera.position.set(128, 255, 512);

                // Установка точки, на которую камера будет смотреть
                camera.lookAt(new THREE.Vector3( 128, 0.0, 128));
            }
        if (followStork==true)
        {
            // установка смещения камеры относительно объекта
            var relativeCameraOffset = new THREE.Vector3(0,40,-60);
            var m1 = new THREE.Matrix4();
            var m2 = new THREE.Matrix4();

            // получение поворота объекта
            m1.extractRotation(morph.matrixWorld);
            // получение позиции объекта
            m2.extractPosition(morph.matrixWorld);
            m1.multiplyMatrices(m2, m1);

            // получение смещения позиции камеры относительно объекта
            var cameraOffset = relativeCameraOffset.applyMatrix4(m1);
            // установка позиции и направления взгляда камеры
            camera.position.copy(cameraOffset);
            camera.lookAt(morph.position );
        }
        if (flam==true)
        {
            // установка смещения камеры относительно объекта
            var relativeCameraOffset = new THREE.Vector3(0,40,-60);
            var m1 = new THREE.Matrix4();
            var m2 = new THREE.Matrix4();

            // получение поворота объекта
            m1.extractRotation(flamingo.matrixWorld);
            // получение позиции объекта
            m2.copyPosition(flamingo.matrixWorld);
            m1.multiplyMatrices(m2, m1);

            // получение смещения позиции камеры относительно объекта
            var cameraOffset = relativeCameraOffset.applyMatrix4(m1);
            // установка позиции и направления взгляда камеры
            camera.position.copy(cameraOffset);
            camera.lookAt(flamingo.position );
            flamingo.translateZ(15*delta);

            if (keyboard.pressed("left")) 
            {
                flamingo.rotateOnAxis(axisY, Math.PI/30.0);

            }
            if (keyboard.pressed("right")) 
            {
                flamingo.rotateOnAxis(axisY, -Math.PI/30.0);
            }



        }
    }
    // Добавление функции на вызов, при перерисовки браузером страницы
    requestAnimationFrame( animate );
    render();
}
 
function render()  
{ 
    // Рисование кадра 
    renderer.render( scene, camera ); 
} 

function addTerrain()
{
    var vertices = []; // Объявление массива для хранения вершин 
    var faces = [];    // Объявление массива для хранения индексов 
    //var colors = [];   // Объявление массива для хранения цветов вершин 
    var uvs = []; // Массив для хранения текстурных координат 

    var geometry = new THREE.BufferGeometry();// Создание структуры для хранения геометрии 
  
    for(var i = 0; i < N; i++)
    for(var j = 0; j < N; j++)
    {
        var h = getPixel( imagedata, i, j );   
        vertices.push(i, h/10.0, j); // Добавление координат первой вершины в массив вершин 
        uvs.push(i/(N-1), j/(N-1)); // Добавление текстурных координат для левой верхней вершины 
    }
    
    for(var i = 0; i < N-1; i++)
    for(var j = 0; j < N-1; j++)
    {
        faces.push(i+j*N, (i+1)+j*N, (i+1)+(j+1)*N); // Добавление индексов (порядок соединения вершин) в массив индексов 
        faces.push(i+j*N, (i+1)+(j+1)*N, i+(j+1)*N); // Добавление индексов (порядок соединения вершин) в массив индексов 
    }
    console.log(faces)
    
    //Добавление вершин и индексов в геометрию 
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) ); 
    geometry.setIndex( faces ); 
    //Добавление цветов вершин в геометрию 
    //geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

    geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) ); 

    geometry.computeVertexNormals(); 

    // Загрузка текстуры yachik.jpg из папки pics 
    var tex = new THREE.TextureLoader().load( 'img/grasstile.jpg' ); 

    var mat = new THREE.MeshLambertMaterial({ 
        map: tex,
        wireframe: false, 
        side:THREE.DoubleSide 
    });

    // Режим повторения текстуры 
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;  
    // Повторить текстуру 10х10 раз 
    tex.repeat.set( 2, 1 ); 

    // Создание объекта и установка его в определённую позицию 
    var mesh = new THREE.Mesh(geometry, mat); 
    mesh.position.set(0.0, 0.0, 0.0); 
    mesh.receiveShadow = true;
    // Добавление объекта в сцену      
    scene.add(mesh);
}
function loadModel(path, oname, mname) //где path – путь к папке с моделями
{
    const onProgress = function ( xhr ) { //выполняющаяся в процессе загрузки
    if ( xhr.lengthComputable ) {
    const percentComplete = xhr.loaded / xhr.total * 100;
    console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
    }
    };
    const onError = function () { }; //выполняется в случае возникновения ошибки
    const manager = new THREE.LoadingManager();
    new MTLLoader( manager )
    .setPath( path ) //путь до модели
    .load( mname, function ( materials ) { //название материала
    materials.preload();
    new OBJLoader( manager )
    .setMaterials( materials ) //установка материала
    .setPath( path ) //путь до модели
    .load( oname, function ( object ) { //название модели
    
    //масштаб модели
    object.scale.set(0.2, 0.2, 0.2);

    object.traverse( function ( child )
    {
        if ( child instanceof THREE.Mesh )
        {
            child.castShadow = true;
        }
    } );

    object.castShadow = true;

    for (var i=0; i<10; i++)
    {
        object.position.x = 100+Math.random()*75;
        object.position.z = 100+Math.random()*75;

            //добавление модели в сцену
        scene.add( object.clone() );
    }
    }, onProgress, onError );
    } );
    
}

//функция загрузки анимированной модели
function loadAnimatedModel(path, i,h,j, controlled) //где path – путь и название модели
{
    var loader = new GLTFLoader();
    loader.load( path, function ( gltf ) {
    var mesh = gltf.scene.children[ 0 ];
    var clip = gltf.animations[ 0 ];

    //установка параметров анимации (скорость воспроизведения и стартовый фрейм)
    mixer.clipAction( clip, mesh ).setDuration( 1 ).startAt( 0 ).play();

    mesh.position.set( i, h, j ); //установка позиции объекта
    mesh.rotation.y = Math.PI / 8; //поворот модели вокруг оси Y
    mesh.scale.set( 0.1, 0.1, 0.1 ); //масштаб модели

    mesh.castShadow = true;

    scene.add( mesh ); //добавление модели в сцену
    if(controlled==false)
    morphs.push( mesh );
    else
    flamingo=mesh;
 } );
}
function addR()
{
var curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3( 40, 70, 175 ), //P0
    new THREE.Vector3( 75, 40, 50 ), //P1
    new THREE.Vector3( 175, 40, 50 ), //P2
    new THREE.Vector3( 200, 70, 175 ) //P3
   );
   var curve2 = new THREE.CubicBezierCurve3(
    new THREE.Vector3( 200, 70, 185 ),//P0
    new THREE.Vector3( 175, 40, 275 ), //P1
    new THREE.Vector3( 75, 40, 275 ), //P2
    new THREE.Vector3( 40, 70, 185 ) //P3
   );
   var vertices = [];
   // получение 20-ти точек на заданной кривой
   vertices = curve.getPoints( 20 );
   vertices = vertices.concat(curve2.getPoints( 20 ));

   // создание кривой по списку точек
    var path = new THREE.CatmullRomCurve3(vertices);
    // является ли кривая замкнутой (зацикленной)
    path.closed = true;
    vertices=path.getPoints(500);
    //создание геометрии из точек кривой
    var geometry = new THREE.BufferGeometry().setFromPoints( vertices );
    var material = new THREE.LineBasicMaterial( { color : 0xffff00 } );
    //создание объекта
    var curveObject = new THREE.Line( geometry, material );
    scene.add(curveObject); //добавление объекта в сцену
    return path;
}
function addSphere(r,tname)
{
    //создание геометрии сферы
    var geometry = new THREE.SphereGeometry( r, 32, 32 );
    //загрузка текстуры
    var tex = new THREE.TextureLoader().load( tname );
    tex.minFilter = THREE.NearestFilter;
    //создание материала
    var material = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide
    });
    //создание объекта
    var sphere = new THREE.Mesh( geometry, material );
    //размещение объекта в сцене
    scene.add( sphere );
}