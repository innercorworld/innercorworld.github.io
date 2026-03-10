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
// 전체를 비추는 기본 조명
scene.add(new THREE.AmbientLight(0xffffff, 0.8)); 

// 측면에서 입체감을 주는 강력한 주광 (찰흙 덩어리 옆면을 밝힘)
const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
sunLight.position.set(10, 10, 10);
scene.add(sunLight);

// 반대편에서 그림자 색감을 풍부하게 하는 보조광
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.9);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// --- 3. [에러 해결 및 입체적 맵핑] 자체 그레이스케일 맵 생성을 통한 클레이 지구 만들기 ---
const earthRadius = 2.5;
// [고해상도 설정] 정교한 찰흙 지형을 표현하기 위해 구체의 분할 수를 256으로 대폭 늘림 (매우 부드러움)
const earthGeometry = new THREE.SphereGeometry(earthRadius, 256, 256); 

// 재질 설정
let earthMaterial;
const textureLoader = new THREE.TextureLoader();

// 1) 사용자 이미지를 로딩하고 색감 보정
const earthTexture = textureLoader.load('earth_texture.png', (texture) => {
    // 이미지가 로딩되면, 브라우저에서 직접 이미지를 그레이스케일(흑백)로 변환하는 작업을 시작합니다.
    // 이는 초록색(밝음)은 튀어나오고, 파란색(어두움)은 들어가게 만들기 위한 필수 작업입니다.
    
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // 이미지를 한 픽셀씩 분석해서 흑백으로 변환 (초록색 부분은 밝게, 파란색 부분은 어둡게)
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i]     = avg; // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
    }
    
    ctx.putImageData(imgData, 0, 0);
    
    // 만들어진 그레이스케일 맵을 Three.js용 텍스처로 변환
    const grayTexture = new THREE.CanvasTexture(canvas);
    
    // 2) [마법의 마법 소스] Displacement Map 설정
    // grayTexture를 displacementMap으로 사용하여, 밝은 부분(초록색 대륙)을 실제 물리적으로 튀어나오게 만듭니다!
    // roughnessMap에도 적용하여 대륙 부분이 바다보다 번들거림이 덜하게 만듭니다.
    earthMaterial.displacementMap = grayTexture;
    earthMaterial.roughnessMap = grayTexture; 
    
    // [입체감 조절] 대륙이 얼마나 튀어나올지 결정하는 값을 설정합니다. (너무 과하지 않게 살짝!)
    earthMaterial.displacementScale = 0.15; 
    
    // [미세 조정] 바다가 살짝 들어가게 보이도록 음수 값으로 설정합니다.
    earthMaterial.displacementBias = -0.01; 
    
    earthMaterial.needsUpdate = true; // 변경 사항 적용
});

// 컬러 텍스처 설정
earthTexture.colorSpace = THREE.SRGBColorSpace; 

// 3) [입체적 재질] 매트한 클레이 재질 (Material) 설정
earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,       // 저장한 컬러 이미지를 표면에 인쇄 (색상)
    roughness: 1.0,          // 번들거림 없이 완전 매트하게 (찰흙 질감 극대화)
    metalness: 0.0,
    flatShading: false,      // 산맥을 부드럽게 연결
    envMapIntensity: 0.3     // 환경광 억제
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

    earth.rotation.y += 0.002; // 가만히 있어도 아주 천천히 회전

    renderer.render(scene, camera);
}
animate();

// --- 6. 창 크기 반응형 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
