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

// --- 2. 조명 설정 (반사광 제거, 폭신하고 매트한 느낌) ---
scene.add(new THREE.AmbientLight(0xffffff, 1.2)); // 그림자 없이 전체를 부드럽게 밝힘
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5); // 하늘과 바닥 빛을 동일하게 주어 뽀송한 느낌 추가
scene.add(hemiLight);

// --- 3. 평면도 맵핑된 클레이 지구 만들기 ---
const earthRadius = 1.75; // [요청1] 기존 2.5 크기의 70%로 축소
const earthGeometry = new THREE.SphereGeometry(earthRadius, 256, 256); 

let earthMaterial;
const textureLoader = new THREE.TextureLoader();

const earthTexture = textureLoader.load('earth_texture.png', (texture) => {
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
    
    const grayTexture = new THREE.CanvasTexture(canvas);
    
    // [요청4] 경계선 및 꼭지점 꼬집힘 해결 (텍스처를 꽉 채우지 않고 여백을 바다로 연장)
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(0.9, 0.8); // 좌우 90%, 상하 80%만 맵핑
    texture.offset.set(0.05, 0.1); // 남은 여백이 위아래 대칭이 되도록 중앙 정렬
    
    grayTexture.wrapS = THREE.ClampToEdgeWrapping;
    grayTexture.wrapT = THREE.ClampToEdgeWrapping;
    grayTexture.repeat.set(0.9, 0.8);
    grayTexture.offset.set(0.05, 0.1);

    earthMaterial.displacementMap = grayTexture;
    earthMaterial.displacementScale = 0.1; // 지구가 작아졌으니 튀어나오는 비율도 자연스럽게 조절
    earthMaterial.displacementBias = -0.01; 
    earthMaterial.needsUpdate = true; 
});

earthTexture.colorSpace = THREE.SRGBColorSpace; 

// [요청3] 조명 반사가 아예 없는 폭신하고 매트한 재질
earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 1.0,  // 완전 매트하게
    metalness: 0.0,
    flatShading: false
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

    earth.rotation.y += 0.0002; // [요청2] 기존(0.002)의 0.1배속으로 아주 천천히 회전

    renderer.render(scene, camera);
}
animate();

// --- 6. 창 크기 반응형 (+ 모바일 대응) ---
function updateCamera() {
    camera.aspect = window.innerWidth / window.innerHeight;
    
    // 모바일 화면일 때 카메라를 더 뒤로 빼서 작고 귀엽게 보이도록 조정
    if (window.innerWidth < 768) {
        camera.position.z = 10; 
    } else {
        camera.position.z = 8;
    }
    
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', updateCamera);
updateCamera(); // 처음 페이지 로드 시에도 한 번 실행되도록 추가
