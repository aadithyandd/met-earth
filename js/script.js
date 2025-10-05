// Global variables for Three.js essentials
let scene, camera, renderer, controls;
const planets = [];
const SOLAR_SYSTEM_SCALE = 0.5; // Overall scale factor for orbits and sizes

// Vector used to calculate Earth's world position in the animation loop
const earthTarget = new THREE.Vector3();

// --- Celestial Body Data (Simplified to only Sun and Earth) ---
const solarData = [
    // Sun (Center point, not moving)
    { name: 'Sun', radius: 3.5, distance: 0, color: 0xFFD700, orbitSpeed: 0, rotationSpeed: 0.005, emissive: 0xFFE040 },
    // Earth
    { name: 'Earth', radius: 1.0, distance: 11, color: 0x0077FF, orbitSpeed: 0.018, rotationSpeed: 0.03 },
];

// --- Initialization Function ---
function init() {
    // 1. Setup Scene, Camera, Renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Set initial camera position for a good view
    camera.position.set(0, 30, 60);

    // 2. Lighting
    // Ambient light for general visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // Point light for the Sun (emits strong light from the center)
    const sunLight = new THREE.PointLight(0xFFFFFF, 1.5, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);


    // 3. Controls (Camera interaction)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // smooth camera movement
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 150;

    // 4. Create Solar System Objects
    createSolarSystem();

    // Set initial target on Earth's position
    const earthBody = planets.find(p => p.data.name === 'Earth');
    if (earthBody && earthBody.mesh) {
        // Initialize the control target to Earth's current world position
        earthBody.mesh.getWorldPosition(controls.target);
    }

    // 5. Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);
}

function createSolarSystem() {
    // Helper function to create a planet/sun
    const createBody = (data) => {
        const geometry = new THREE.SphereGeometry(data.radius * SOLAR_SYSTEM_SCALE, 32, 32);

        let material;
        if (data.name === 'Sun') {
            // Sun uses MeshBasicMaterial with emissive property for brightness
            material = new THREE.MeshBasicMaterial({
                color: data.color,
                emissive: data.emissive,
                emissiveIntensity: 1
            });
        } else {
            // Planets use MeshPhongMaterial to react to the sun's light
            material = new THREE.MeshPhongMaterial({
                color: data.color,
                specular: 0x333333,
                shininess: 15
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = data.name;

        // Create a Group for the planet's orbit
        const orbitGroup = new THREE.Group();
        orbitGroup.rotation.y = Math.random() * Math.PI * 2; // Start at random position

        // Add the planet to its orbit group, offset by its distance
        mesh.position.x = data.distance;
        orbitGroup.add(mesh);
        scene.add(orbitGroup);

        return { mesh, orbitGroup, data };
    };

    // Loop through data and create all bodies (Sun and Earth)
    solarData.forEach(data => {
        const body = createBody(data);
        planets.push(body);

        // Add the orbit line (path)
        if (data.distance > 0) {
            const radius = data.distance;
            const segments = 64;

            // Create points for the orbit line
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
            orbitLine.rotation.x = Math.PI / 2; // Orient flat on the x-z plane
            scene.add(orbitLine);
        }
    });

    // Special: Add only ONE named Meteor around Earth
    const earth = planets.find(p => p.data.name === 'Earth');
    if (earth) {
        createAsteroids(earth);
    }
}

// --- Asteroid/Meteor Creation Function ---
function createAsteroids(earthData) {
    const earthOrbitGroup = earthData.orbitGroup;
    const meteorName = 'Halley'; // Name for the single meteor

    // Meteor 'Halley'
    const asteroid = createAsteroidMesh(0xADD8E6, 0.2); // Light blue/white for a comet-like feel, slightly larger

    // Position relative to Earth
    asteroid.position.x = earthData.data.distance + 1.8;
    earthOrbitGroup.add(asteroid);

    // Add to planets array for animation loop
    planets.push({
        mesh: asteroid,
        orbitGroup: earthOrbitGroup,
        data: {
            name: meteorName,
            // Orbit speed ensures it moves with the Earth's group
            orbitSpeed: 0.03,
            rotationSpeed: 0.08,
            isAsteroid: true
        }
    });

    console.log(`One meteor named '${meteorName}' added orbiting with Earth's group.`);
}

function createAsteroidMesh(color, size) {
    // Use an Icosahedron to create a slightly irregular, rocky shape
    const geometry = new THREE.IcosahedronGeometry(size, 1);

    // Randomly deform the vertices for a more natural asteroid look (BufferGeometry approach)
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
        const index = i * 3;

        // Modify X, Y, Z coordinates
        positions[index] += (Math.random() - 0.5) * 0.1 * size; // X
        positions[index + 1] += (Math.random() - 0.5) * 0.1 * size; // Y
        positions[index + 2] += (Math.random() - 0.5) * 0.1 * size; // Z
    }

    // Tell Three.js the positions array has been changed
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // Recompute normals after position change

    const material = new THREE.MeshPhongMaterial({
        color: color,
        flatShading: true,
        shininess: 5
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

// --- Animation Loop ---
let clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time elapsed since last frame

    // Update orbital positions and rotations
    planets.forEach(body => {
        const data = body.data;
        const mesh = body.mesh;

        // 1. Rotation (spin on its axis)
        mesh.rotation.y += data.rotationSpeed * delta * 5; // Scale rotation speed

        // 2. Orbital Movement (around the Sun, handled by the orbitGroup)
        if (data.distance > 0) {
            // Orbit Group rotation
            body.orbitGroup.rotation.y += data.orbitSpeed * delta * 5; // Scale orbit speed
        }
    });

    // --- Camera Target Fix ---
    // Find the Earth object
    const earthBody = planets.find(p => p.data.name === 'Earth');
    if (earthBody && earthBody.mesh) {
        // Get the Earth's current absolute position in the scene
        earthBody.mesh.getWorldPosition(earthTarget);
        // Copy the Earth's position to the controls target
        controls.target.copy(earthTarget);
    }

    controls.update(); // Recalculates based on the new target position
    renderer.render(scene, camera);
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the visualization
window.onload = function () {
    init();
    animate();
}