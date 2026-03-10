import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. 기본 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 9); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// --- 2. 조명 설정 ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5)); 
const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
sunLight.position.set(10, 10, 10);
scene.add(sunLight);
const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
backLight.position.set(-10, -5, -10);
scene.add(backLight);
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.9);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// --- 3. [에러 해결] 자체 함수를 이용한 안전한 클레이 지구 만들기 ---
const earthRadius = 2.5;
// 최적화와 안정성을 위해 분할 수를 128로 설정
const earthGeometry = new THREE.SphereGeometry(earthRadius, 128, 128); 

const colors = [];
const color = new THREE.Color();
const posAttribute = earthGeometry.attributes.position;
const vertex = new THREE.Vector3();

// 색상 테마
const c_deepOcean = new THREE.Color(0x1E5678); 
const c_shallowOcean = new THREE.Color(0x3B99D4); 
const c_beach = new THREE.Color(0xD2B48C); 
const c_plain = new THREE.Color(0x6ABF4B); 
const c_forest = new THREE.Color(0x3A7F2D); 
const c_mountain = new THREE.Color(0x8B5A2B); 
const c_snow = new THREE.Color(0xFFFFFF); 

for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);
    const p = vertex.clone().normalize();
    
    // 외부 라이브러리 없이 자체 삼각함수로 자연스러운 노이즈(지형) 생성
    const nx = p.x * 3.0; const ny = p.y * 3.0; const nz = p.z * 3.0;
    let noise = (Math.sin(nx)*Math.cos(ny) + Math.sin(ny)*Math.cos(nz) + Math.sin(nz)*Math.cos(nx)) * 0.5 + 0.5;
    
    // 자잘한 디테일 추가
    noise += (Math.sin(nx*5)*Math.cos(ny*5)*Math.sin(nz*5)) * 0.2;
    noise = Math.max(0, Math.min(1, noise)); // 0~1 사이로 고정

    let bumpHeight = 0;
    const lat = Math.abs(p.y); // 위도 (0~1)

    // 고도와 위도에 따른 색상 및 지형 계산
    if (lat > 0.85) { 
        // 극지방 (북극/남극)
        color.lerpColors(c_forest, c_snow, (lat - 0.85) / 0.15);
        bumpHeight = earthRadius * 0.02 * Math.sin(nx*10); 
    } 
    else if (noise < 0.45) { 
        // 바다
        color.lerpColors(c_deepOcean, c_shallowOcean, noise / 0.45);
        bumpHeight = -earthRadius * 0.01; // 바다는 살짝 들어감
    } 
    else {
        // 육지
        if (noise < 0.55) {
            // 해변/평지
            color.lerpColors(c_beach, c_plain, (noise - 0.45) / 0.1);
            bumpHeight = earthRadius * 0.01;
        } 
        else if (noise < 0.7) {
            // 숲
            color.lerpColors(c_plain, c_forest, (noise - 0.55) / 0.15);
            bumpHeight = earthRadius * 0.03 + (0.01 * Math.sin(nx*8)); 
        } 
        else {
            // 산맥 (높이에 따라 갈색 -> 흰 눈)
            let mt = (noise - 0.7) / 0.3;
            if (mt < 0.5) {
                color.lerpColors(c_forest, c_mountain, mt / 0.5);
            } else {
                color.lerpColors(c_mountain, c_snow, (mt - 0.5) / 0.5);
            }
            // 산맥을 확실히 솟아오르게 표현
            bumpHeight = earthRadius * 0.15 * Math.pow(mt, 1.5);
        }
    }

    // 꼭짓점 위치 이동으로 입체감 생성
    vertex.multiplyScalar(1 + bumpHeight / earthRadius);
    posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);

    // 찰흙 질감을 위한 미세한 색상 랜덤화
    color.r += (Math.random() - 0.5) * 0.03;
    color.g += (Math.random() - 0.5) * 0.03;
    color.b += (Math.random() - 0.5) * 0.03;
    colors.push(color.r, color.g, color.b);
}

earthGeometry.computeVertexNormals();
earthGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const earthMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, 
    roughness: 1.0, 
    metalness: 0.0,
    flatShading: false, 
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- 4. 클레이 위성 만들기 ---
const satellites = [];
const satelliteGroup = new THREE.Group();
scene.add(satelliteGroup);

function createClayMesh(geometry, colorHex) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 1.0, flatShading: true });
    return new THREE.Mesh(geometry, mat);
}

// 별, 코인, 망고, 수박
const starGeo = new THREE.IcosahedronGeometry(0.35, 0);
satellites.push({ mesh: createClayMesh(starGeo, 0xFBD000), angle: 0, speed: 0.008, radius: 4.5, yOffset: 0 });

const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12);
const coin = createClayMesh(coinGeo, 0xFFB000);
coin.rotation.x = Math.PI / 2;
satellites.push({ mesh: coin, angle: Math.PI / 2, speed: 0.012, radius: 5.2, yOffset: 1.2 });

const mangoGeo = new THREE.SphereGeometry(0.3, 16, 16);
const mango = createClayMesh(mangoGeo, 0xFF9900);
mango.scale.set(1, 1.4, 0.8);
satellites.push({ mesh: mango, angle: Math.PI, speed: 0.01, radius: 4.8, yOffset: -1.2 });

const melonGeo = new THREE.SphereGeometry(0.35, 16, 16);
satellites.push({ mesh: createClayMesh(melonGeo, 0x43B047), angle: Math.PI * 1.5, speed: 0.006, radius: 5.8, yOffset: 0.8 });

satellites.forEach(sat => satelliteGroup.add(sat.mesh));

// --- 5. 마우스 드래그 컨트롤 ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; 
controls.enablePan = false; 
controls.minPolarAngle = Math.PI / 2; 
controls.maxPolarAngle = Math.PI / 2; 

// --- 6. 애니메이션 루프 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    earth.rotation.y += 0.001; // 지구가 천천히 돎

    satellites.forEach(sat => {
        sat.angle += sat.speed;
        sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
        sat.mesh.position.z = Math.sin(sat.angle) * sat.radius;
        sat.mesh.position.y = Math.sin(sat.angle * 2.5) * 0.6 + sat.yOffset; 
        sat.mesh.rotation.y += 0.03;
        sat.mesh.rotation.x += 0.01;
    });

    renderer.render(scene, camera);
}
animate();

// --- 7. 창 크기 반응형 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
