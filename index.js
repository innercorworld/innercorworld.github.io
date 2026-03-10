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

// --- 7. 도마뱀 발자국 트래킹 이펙트 ---
const yellows = ['#FFEA00', '#FFD700', '#FFC107', '#FFFF00', '#F9A825', '#FFB300']; 
let lastX = 0;
let lastY = 0;
let isLeftFoot = true; 

// [수정됨] 훨씬 통통하고 뭉툭한 게코 발자국 SVG 디자인
const lizardSvg = `
<svg viewBox="0 0 100 100" fill="currentColor" style="width: 100%; height: 100%;">
    <circle cx="50" cy="65" r="22"/> 
    <path d="M50 65 L22 35" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
    <circle cx="22" cy="35" r="11"/> 
    <path d="M50 65 L40 15" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
    <circle cx="40" cy="15" r="11"/> 
    <path d="M50 65 L60 15" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
    <circle cx="60" cy="15" r="11"/> 
    <path d="M50 65 L78 35" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
    <circle cx="78" cy="35" r="11"/> 
</svg>`;

window.addEventListener('mousemove', (e) => {
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 발자국 간격 설정 (도동통한 발자국이 살짝씩 겹치며 걸어가게)
    if (distance > 35) {
        // [오류 수정] 진행 방향 계산
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; 
        
        const footprint = document.createElement('div');
        footprint.classList.add('lizard-footprint');
        footprint.innerHTML = lizardSvg;
        footprint.style.color = yellows[Math.floor(Math.random() * yellows.length)];
        
        const offset = isLeftFoot ? -10 : 10; // 좌우 보폭
        const offsetX = currentX + Math.cos((angle) * Math.PI / 180) * offset;
        const offsetY = currentY + Math.sin((angle) * Math.PI / 180) * offset;
        
        footprint.style.left = `${offsetX - 19}px`;
        footprint.style.top = `${offsetY - 19}px`;
        
        // [오류 수정] CSS 변수(--rot)로 각도를 넘겨주어 애니메이션과 충돌 방지
        footprint.style.setProperty('--rot', `${angle}deg`);
        
        document.body.appendChild(footprint);
        
        isLeftFoot = !isLeftFoot;
        lastX = currentX;
        lastY = currentY;
        
        // [수정됨] 1.5초(1500ms) 후 삭제
        setTimeout(() => {
            footprint.remove();
        }, 1500);
    }
});

// --- 8. 마우스 클릭 시 레오파드 게코 뿅! 효과 ---
window.addEventListener('click', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    // 1. 레오파드 게코(도마뱀 이모지) 생성
    const gecko = document.createElement('div');
    gecko.classList.add('gecko-popup');
    gecko.innerText = '🦎'; // 귀여운 도마뱀 이모지
    gecko.style.left = `${x}px`;
    gecko.style.top = `${y}px`;
    document.body.appendChild(gecko);

    // 1초 뒤에 화면에서 깔끔하게 지우기
    setTimeout(() => {
        gecko.remove();
    }, 1000);

    // 2. 뿅! 터지는 장난스러운 파티클 생성 (마리오 컬러 테마)
    const popColors = ['#E52521', '#049CD8', '#FBD000', '#43B047'];
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.classList.add('pop-particle');
        // 랜덤 색상 지정
        particle.style.backgroundColor = popColors[Math.floor(Math.random() * popColors.length)];
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // 파티클이 사방으로 퍼져나갈 둥근 각도와 거리 계산
        const angle = (Math.PI * 2 / 6) * i + (Math.random() * 0.5);
        const distance = 50 + Math.random() * 30; // 퍼져나가는 거리
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        // CSS 애니메이션(var(--tx), var(--ty))으로 도착 지점 값 넘겨주기
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        document.body.appendChild(particle);
        
        // 파티클도 애니메이션 끝나면 제거
        setTimeout(() => {
            particle.remove();
        }, 600);
    }
});


