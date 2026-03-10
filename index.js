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
// 비비드하고 밝은 톤온톤 노란색 배열
const yellows = ['#FFEA00', '#FFD700', '#FFC107', '#FFFF00', '#F9A825', '#FFB300']; 
let lastX = 0;
let lastY = 0;
let isLeftFoot = true; // 왼발, 오른발 교차를 위한 스위치

// 귀여운 도마뱀(게코) 발자국 SVG 디자인
const lizardSvg = `
<svg viewBox="0 0 100 100" fill="currentColor" style="width: 100%; height: 100%;">
    <circle cx="50" cy="70" r="14"/> <path d="M50 70 L20 40" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <circle cx="20" cy="40" r="7"/> <path d="M50 70 L40 20" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <circle cx="40" cy="20" r="7"/> <path d="M50 70 L60 20" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <circle cx="60" cy="20" r="7"/> <path d="M50 70 L80 40" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <circle cx="80" cy="40" r="7"/> </svg>`;

window.addEventListener('mousemove', (e) => {
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    // 마우스가 이동한 거리 계산
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 35px 이상 이동했을 때만 발자국 생성 (너무 빽빽하게 겹치지 않도록 조절)
    if (distance > 35) {
        // 이동 방향의 각도 계산 (SVG가 위를 향하고 있어 90도 보정)
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; 
        
        const footprint = document.createElement('div');
        footprint.classList.add('lizard-footprint');
        footprint.innerHTML = lizardSvg;
        
        // 랜덤한 비비드 옐로우 컬러 적용
        footprint.style.color = yellows[Math.floor(Math.random() * yellows.length)];
        
        // 아장아장 걷는 느낌을 위해 진행 방향의 좌/우로 엇갈리게 좌표 수정
        const offset = isLeftFoot ? -8 : 8;
        const offsetX = currentX + Math.cos((angle) * Math.PI / 180) * offset;
        const offsetY = currentY + Math.sin((angle) * Math.PI / 180) * offset;
        
        // 중심을 맞추기 위해 크기의 절반(15px)만큼 빼서 배치
        footprint.style.left = `${offsetX - 15}px`;
        footprint.style.top = `${offsetY - 15}px`;
        footprint.style.transform = `rotate(${angle}deg)`;
        
        document.body.appendChild(footprint);
        
        // 발 교체 및 현재 위치 저장
        isLeftFoot = !isLeftFoot;
        lastX = currentX;
        lastY = currentY;
        
        // 3초(3000ms) 후 브라우저에서 요소 완전히 삭제
        setTimeout(() => {
            footprint.remove();
        }, 3000);
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


