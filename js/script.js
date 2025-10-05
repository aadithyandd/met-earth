
let scene, camera, renderer, controls;
const planets = [];
const SOLAR_SYSTEM_SCALE = 0.5;


const earthTarget = new THREE.Vector3();

const solarData = [
   
    { name: 'Sun', radius: 3.5, distance: 0, color: 0xFFD700, orbitSpeed: 0, rotationSpeed: 0.005, emissive: 0xFFE040 },
  
    { name: 'Earth', radius: 1.0, distance: 11, color: 0x0077FF, orbitSpeed: 0.018, rotationSpeed: 0.03 },
];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.set(0, 30, 60);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xFFFFFF, 1.5, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 150;

    createSolarSystem();

  
    const earthBody = planets.find(p => p.data.name === 'Earth');
    if (earthBody && earthBody.mesh) {
        earthBody.mesh.getWorldPosition(controls.target);
    }

    window.addEventListener('resize', onWindowResize, false);
}

function createSolarSystem() {
    const createBody = (data) => {
        const geometry = new THREE.SphereGeometry(data.radius * SOLAR_SYSTEM_SCALE, 32, 32);

        let material;
        if (data.name === 'Sun') {
          material = new THREE.MeshBasicMaterial({
                color: data.color,
                emissive: data.emissive,
                emissiveIntensity: 1
            });
        } else {
            material = new THREE.MeshPhongMaterial({
                color: data.color,
                specular: 0x333333,
                shininess: 15
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = data.name;

        const orbitGroup = new THREE.Group();
        orbitGroup.rotation.y = Math.random() * Math.PI * 2; 
        mesh.position.x = data.distance;
        orbitGroup.add(mesh);
        scene.add(orbitGroup);

        return { mesh, orbitGroup, data };
    };

    solarData.forEach(data => {
        const body = createBody(data);
        planets.push(body);

        if (data.distance > 0) {
            const radius = data.distance;
            const segments = 64;

            const points = [];
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
            }
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

            const orbitLine = new THREE.LineLoop(lineGeometry, new THREE.LineBasicMaterial({
                color: 0x444444,
                linewidth: 1
            }));
            orbitLine.rotation.x = Math.PI / 2; 
            scene.add(orbitLine);
        }
    });

    const earth = planets.find(p => p.data.name === 'Earth');
    if (earth) {
        createAsteroids(earth);
    }
}


function createAsteroids(earthData) {
    const earthOrbitGroup = earthData.orbitGroup;
    const meteorName = 'Halley'; 

    const asteroid = createAsteroidMesh(0xADD8E6, 0.2); 

    asteroid.position.x = earthData.data.distance + 1.8;
    earthOrbitGroup.add(asteroid);

    planets.push({
        mesh: asteroid,
        orbitGroup: earthOrbitGroup,
        data: {
            name: meteorName,

            orbitSpeed: 0.03,
            rotationSpeed: 0.08,
            isAsteroid: true
        }
    });

    console.log(`One meteor named '${meteorName}' added orbiting with Earth's group.`);
}

function createAsteroidMesh(color, size) {

    const geometry = new THREE.IcosahedronGeometry(size, 1);

   
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
        const index = i * 3;

  
        positions[index] += (Math.random() - 0.5) * 0.1 * size; // X
        positions[index + 1] += (Math.random() - 0.5) * 0.1 * size; // Y
        positions[index + 2] += (Math.random() - 0.5) * 0.1 * size; // Z
    }


    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
        color: color,
        flatShading: true,
        shininess: 5
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

let clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); 

    planets.forEach(body => {
        const data = body.data;
        const mesh = body.mesh;

     
        mesh.rotation.y += data.rotationSpeed * delta * 5; 

 
        if (data.distance > 0) {
        
            body.orbitGroup.rotation.y += data.orbitSpeed * delta * 5; 
        }
    });


    const earthBody = planets.find(p => p.data.name === 'Earth');
    if (earthBody && earthBody.mesh) {
      
        earthBody.mesh.getWorldPosition(earthTarget);
      
        controls.target.copy(earthTarget);
    }

    controls.update(); 
    renderer.render(scene, camera);
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = function () {
    init();
    animate();

}
