import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. 기본 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8); // 지구가 화면에 꽉 차 보이도록 카메라 위치 조정

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- 2. 입체감을 살리는 조명 ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6)); 
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(10, 10, 10);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xddeeff, 0.8);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// --- 3. 비비드한 두 가지 색상의 찰흙 지구 만들기 ---
const earthRadius = 2.5;
const earthGeometry = new THREE.SphereGeometry(earthRadius, 128, 128); 

const colors = [];
const color = new THREE.Color();
const posAttribute = earthGeometry.attributes.position;
const vertex = new THREE.Vector3();

// 방금 전 이미지와 똑같은 비비드한 컬러
const c_ocean = new THREE.Color(0x2865E5); // 쨍한 파란색
const c_land = new THREE.Color(0x2EA83A);  // 쨍한 초록색

for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);
    const p = vertex.clone().normalize();
    
    // 낮은 주파수의 노이즈로 크고 단순한 덩어리 형태의 대륙 생성
    const nx = p.x * 2.5; const ny = p.y * 2.5; const nz = p.z * 2.5;
    let noise = (Math.sin(nx)*Math.cos(ny) + Math.sin(ny)*Math.cos(nz) + Math.sin(nz)*Math.cos(nx)) * 0.5 + 0.5;

    let bumpHeight = 0;

    if (noise < 0.52) { 
        // 바다 (디테일 없이 매끈하고 둥글게)
        color.copy(c_ocean);
        bumpHeight = 0; 
    } else {
        // 대륙 (찰흙을 턱턱 붙인 것처럼 튀어나오게)
        color.copy(c_land);
        bumpHeight = earthRadius * 0.06; // 대륙 전체가 일정하게 솟아오름
    }

    // 대륙과 바다 전체 표면에 자잘한 찰흙 질감(손자국) 추가
    let clayTexture = (Math.sin(p.x*15)*Math.cos(p.y*15)*Math.sin(p.z*15)) * 0.015;
    bumpHeight += earthRadius * clayTexture;

    // 꼭짓점 위치 이동
    vertex.multiplyScalar(1 + bumpHeight / earthRadius);
    posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);

    // 찰흙의 아주 미세한 색상 얼룩 (조금 더 리얼하게)
    color.r += (Math.random() - 0.5) * 0.02;
    color.g += (Math.random() - 0.5) * 0.02;
    color.b += (Math.random() - 0.5) * 0.02;
    colors.push(color.r, color.g, color.b);
}

earthGeometry.computeVertexNormals();
earthGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const earthMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, 
    roughness: 0.9,  // 매트한 질감
    metalness: 0.0,
    flatShading: false, 
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- 4. 마우스 드래그 컨트롤 (자전축 고정) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; 
controls.enablePan = false; 
controls.minPolarAngle = Math.PI / 2; // 상하 회전 막음 (팽이처럼 회전)
controls.maxPolarAngle = Math.PI / 2; 

// --- 5. 애니메이션 루프 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    earth.rotation.y += 0.002; // 가만히 두어도 아주 천천히 회전

    renderer.render(scene, camera);
}
animate();

// --- 6. 창 크기 반응형 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
