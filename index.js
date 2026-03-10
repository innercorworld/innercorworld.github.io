import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. 기본 씬 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- 2. 조명 설정 (폭신하고 매트한 느낌) ---
// 쨍한 반사광(DirectionalLight)을 모두 빼고, 부드럽게 감싸는 조명만 남겼습니다.
scene.add(new THREE.AmbientLight(0xffffff, 1.2)); 
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5); 
scene.add(hemiLight);

// --- 3. 평면도 맵핑된 클레이 지구 만들기 ---
const earthRadius = 1.75; // 크기 70%로 축소
const earthGeometry = new THREE.SphereGeometry(earthRadius, 256, 256); 

// 재질 먼저 생성 (완전 매트하게)
const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // 이미지가 로딩되기 전 기본 배경색
    roughness: 1.0,  
    metalness: 0.0,
    flatShading: false
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// 텍스처 로딩 및 최적화 맵핑
const textureLoader = new THREE.TextureLoader();
textureLoader.load('earth_texture.png', (texture) => {
    // 1) 원본 텍스처 설정 (색감 및 꼬집힘 방지 여백 설정)
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(0.9, 0.8); // 텍스처를 꽉 채우지 않아 자연스럽게 이어지게 함
    texture.offset.set(0.05, 0.1); 

    // 2) 로딩 속도 최적화를 위한 입체감(그레이스케일) 도화지 세팅
    const canvas = document.createElement('canvas');
    const calcWidth = 512;  
    const calcHeight = 256;
    canvas.width = calcWidth;
    canvas.height = calcHeight;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(texture.image, 0, 0, calcWidth, calcHeight);
    
    const imgData = ctx.getImageData(0, 0, calcWidth, calcHeight);
    const data = imgData.data;
    
    // 픽셀 연산 (초록색은 튀어나오게, 파란색은 들어가게 흑백 처리)
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
    
    const grayTexture = new THREE.CanvasTexture(canvas);
    grayTexture.wrapS = THREE.ClampToEdgeWrapping;
    grayTexture.wrapT = THREE.ClampToEdgeWrapping;
    grayTexture.repeat.set(0.9, 0.8);
    grayTexture.offset.set(0.05, 0.1);

    // 3) 재질에 텍스처와 입체감 업데이트
    earthMaterial.map = texture;
    earthMaterial.displacementMap = grayTexture;
    earthMaterial.displacementScale = 0.1; 
    earthMaterial.displacementBias = -0.01; 
    earthMaterial.needsUpdate = true; // 브라우저에 변경사항 알림
});

// --- 4. 마우스 드래그 컨트롤 (자전축 고정) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; 
controls.enablePan = false; 
controls.minPolarAngle = Math.PI / 2; 
controls.maxPolarAngle = Math.PI / 2; 

// --- 5. 애니메이션 루프 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    earth.rotation.y += 0.0002; // 아주 느리게 0.1배속 회전

    renderer.render(scene, camera);
}
animate();

// --- 6. 창 크기 반응형 (+ 모바일 대응) ---
function updateCamera() {
    camera.aspect = window.innerWidth / window.innerHeight;
    
    // 모바일 화면일 때 카메라를 더 뒤로 빼서 지구가 잘리지 않도록 조정
    if (window.innerWidth < 768) {
        camera.position.z = 10; 
    } else {
        camera.position.z = 8;
    }
    
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', updateCamera);
updateCamera(); // 초기 실행
