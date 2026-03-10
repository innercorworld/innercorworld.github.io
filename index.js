import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. 기본 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- 2. 조명 설정 (이미지의 질감을 극대화) ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8)); // 밝기 최적화
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(10, 10, 10);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xddeeff, 0.6);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// --- 3. 평면도 맵핑된 클레이 지구 만들기 ---
const earthRadius = 2.5;
// 텍스처를 매끄럽게 감싸기 위해 면을 잘게 나눔 (64x64)
const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64); 

// 텍스처 로더 설정
const textureLoader = new THREE.TextureLoader();

// 사용자가 저장한 이미지 경로 불러오기
const earthTexture = textureLoader.load('earth_texture.png');
earthTexture.colorSpace = THREE.SRGBColorSpace; // 선명한 색감 보정

// 재질 생성 (이미지를 그대로 덮어씌움)
const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,       // 저장한 이미지를 표면에 인쇄
    bumpMap: earthTexture,   // 동일한 이미지를 활용해 대륙이 튀어나오게 만듦!
    bumpScale: 0.1,          // 튀어나오는 입체감의 정도 (클레이 느낌 강화)
    roughness: 0.9,          // 매트한 찰흙 질감
    metalness: 0.0,
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- 4. 마우스 드래그 컨트롤 (자전축 고정) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; 
controls.enablePan = false; 
controls.minPolarAngle = Math.PI / 2; // 상하 회전 고정 (팽이처럼)
controls.maxPolarAngle = Math.PI / 2; 

// --- 5. 애니메이션 루프 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    earth.rotation.y += 0.002; // 부드러운 자동 자전

    renderer.render(scene, camera);
}
animate();

// --- 6. 창 크기 반응형 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
