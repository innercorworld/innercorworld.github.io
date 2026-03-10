import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. 씬(Scene), 카메라(Camera), 렌더러(Renderer) 기본 설정
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 4.5; // 카메라를 뒤로 빼서 구체가 화면 중앙에 오도록 배치

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 2. 조명(Lighting) 설정 - 클레이 질감을 완성하는 부드러운 빛
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 전체를 감싸는 은은한 빛
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5); // 입체감을 주는 측면 빛
scene.add(directionalLight);

// 3. 지형 텍스쳐 코드로 생성 (외부 이미지 파일 없이 자체 렌더링)
function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 클레이 느낌의 톤다운된 파란색 바다
    ctx.fillStyle = '#4a8bad';
    ctx.fillRect(0, 0, 1024, 512);

    // 클레이 느낌의 초록색 대륙 (랜덤한 원형을 겹쳐 대륙 형태 생성)
    ctx.fillStyle = '#8abf5c';
    for (let i = 0; i < 70; i++) {
        ctx.beginPath();
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const radius = Math.random() * 50 + 15;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

// 4. 지구(구체) 생성 및 재질(Material) 적용
const geometry = new THREE.SphereGeometry(1.5, 64, 64); // 표면을 부드럽게 깎기 위해 64 분할
const material = new THREE.MeshStandardMaterial({
    map: createEarthTexture(),
    roughness: 0.9, // 거칠기를 극대화하여 번들거림 없는 클레이(점토) 매트한 느낌 부여
    metalness: 0.0, // 쇠 같은 느낌 완전 제거
});

const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// 5. 마우스 드래그 컨트롤 설정
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 드래그 후 부드럽게 미끄러지는 감속 효과
controls.dampingFactor = 0.05;
controls.enableZoom = false; // 마우스 휠로 확대/축소 비활성화 (중심 크기 고정)
controls.enablePan = false;  // 우클릭으로 위치 이동 비활성화 (중심점 고정)

// 6. 애니메이션 루프 (매 프레임 렌더링)
function animate() {
    requestAnimationFrame(animate);
    
    // 가만히 둬도 지구가 아주 천천히 자전하게 만들려면 아래 주석(//)을 지워주세요.
    // earth.rotation.y += 0.001; 
    
    controls.update(); // enableDamping 작동을 위해 매 프레임 업데이트
    renderer.render(scene, camera);
}
animate();

// 7. 브라우저 창 크기 조절 시 반응형 처리
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
