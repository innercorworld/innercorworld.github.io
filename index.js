import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. 씬, 카메라, 렌더러 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 7); // 카메라를 정면에서 약간 떨어트림

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// 클레이의 부드러운 그림자를 위해 톤 매핑 설정
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// 2. 찰흙 질감을 돋보이게 하는 다중 조명 (스튜디오 라이팅)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 전체 밝기
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.5); // 따뜻한 주광 (오른쪽 위)
mainLight.position.set(5, 5, 5);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8); // 차가운 보조광 (왼쪽 아래, 그림자 색감 풍부하게)
fillLight.position.set(-5, -2, -5);
scene.add(fillLight);

// 3. 울퉁불퉁한 클레이 지구 지오메트리 생성
const geometry = new THREE.SphereGeometry(2, 128, 128);
const positionAttribute = geometry.attributes.position;
const vertex = new THREE.Vector3();
const colors = [];
const color = new THREE.Color();

// 정점(Vertex)의 높낮이를 조작하여 산과 계곡(찰흙 자국)을 만듭니다.
for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);
    const basePosition = new THREE.Vector3().copy(vertex).normalize();
    
    // 사인파를 겹쳐서 대륙과 산맥의 형태를 계산 (Macro noise)
    const nx = basePosition.x * 2.5;
    const ny = basePosition.y * 2.5;
    const nz = basePosition.z * 2.5;
    const landNoise = Math.sin(nx)*Math.cos(ny) + Math.sin(ny)*Math.cos(nz) + Math.sin(nz)*Math.cos(nx);
    
    // 손가락 자국 같은 자잘한 질감 계산 (Micro noise)
    const microNoise = Math.sin(nx*15)*Math.cos(ny*15)*Math.sin(nz*15) * 0.05;
    
    let bump = 0;
    let isLand = false;

    // landNoise 값이 높으면 대륙(산맥), 낮으면 바다
    if (landNoise > 0.4) { 
        bump = landNoise * 0.2 + microNoise; // 대륙은 튀어나오게
        isLand = true;
    } else {
        bump = landNoise * 0.05 + microNoise * 0.8; // 바다는 상대적으로 평평하지만 찰흙 느낌 유지
    }

    // 꼭짓점의 위치를 튀어나오게 조정
    vertex.copy(basePosition).multiplyScalar(2 + bump);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);

    // 높낮이에 따라 색상 칠하기
    if (isLand) {
        color.setHex(0x8ABF5C); // 클레이 느낌의 초록색 (육지)
    } else {
        color.setHex(0x2D82B5); // 클레이 느낌의 짙은 파란색 (바다)
    }

    // 찰흙 특유의 색상 불균형(얼룩덜룩함) 추가
    color.r += (Math.random() - 0.5) * 0.05;
    color.g += (Math.random() - 0.5) * 0.05;
    color.b += (Math.random() - 0.5) * 0.05;
    
    colors.push(color.r, color.g, color.b);
}

// 조명이 울퉁불퉁한 표면을 인식하도록 법선 재계산
geometry.computeVertexNormals();
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

// 4. 매트한 클레이 재질(Material) 설정
const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,  // 빛 반사 없이 완전 매트하게
    metalness: 0.0,
    flatShading: false // 부드럽게 이어지는 찰흙 질감
});

const clayEarth = new THREE.Mesh(geometry, material);
scene.add(clayEarth);

// 5. 마우스 드래그 컨트롤 (자전축 고정)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; 
controls.enablePan = false; 

// 자전축 고정 핵심 코드: 위/아래로 굴러가지 않고 팽이처럼 좌우로만 회전하도록 각도 제한
controls.minPolarAngle = Math.PI / 2; // 상하 회전각도 고정 (90도)
controls.maxPolarAngle = Math.PI / 2; 

// 6. 애니메이션 렌더링 루프
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// 7. 창 크기 반응형
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
