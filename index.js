import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// 지형 생성을 위한 고성능 노이스 라이브러리 임포트
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

// --- 1. 기본 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 9); // 지구와 위성을 다 담기 위해 조금 더 뒤로

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // 찰흙 색감을 더 선명하게
document.body.appendChild(renderer.domElement);

// --- 2. 찰흙 질감을 극대화하는 조명 설정 ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5)); // 전체적인 기본 밝기

const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8); // 강력한 주광
sunLight.position.set(10, 10, 10);
scene.add(sunLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.6); // 뒷면을 비춰 입체감 부여
backLight.position.set(-10, -5, -10);
scene.add(backLight);

const fillLight = new THREE.DirectionalLight(0xaaccff, 0.9); // 푸른색 보조광으로 그림자 색감 풍부하게
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// --- 3. [업그레이드] 정교한 클레이 지구 만들기 ---
const simplex = new SimplexNoise(); // 고성능 노이스 생성기
const earthRadius = 2.5; // 지구 크기 살짝 키움
// 디테일한 산맥 표현을 위해 구체의 분할 수를 256으로 대폭 늘림
const earthGeometry = new THREE.SphereGeometry(earthRadius, 256, 256); 

// 지형 정보 저장을 위한 배열
const colors = [];
const color = new THREE.Color();
const posAttribute = earthGeometry.attributes.position;
const vertex = new THREE.Vector3();

// [색상 테마 정의] 클레이 느낌의 톤다운된 색상 그라데이션
const c_deepOcean = new THREE.Color(0x1E5678); // 깊은 바다
const c_shallowOcean = new THREE.Color(0x3B99D4); // 얕은 바다
const c_beach = new THREE.Color(0xD2B48C); // 해변 (갈색)
const c_plain = new THREE.Color(0x6ABF4B); // 평지 (연두)
const c_forest = new THREE.Color(0x3A7F2D); // 숲/낮은 산 (초록)
const c_mountain = new THREE.Color(0x8B5A2B); // 높은 산 (진한 갈색)
const c_snow = new THREE.Color(0xFFFFFF); // 눈 덮인 봉우리/극지방 (흰색)

for (let i = 0; i < posAttribute.count; i++) {
    vertex.fromBufferAttribute(posAttribute, i);
    // 노이즈 계산을 위해 꼭짓점 위치를 정규화(단위 구체로 만듦)
    const p = vertex.clone().normalize();
    
    // 1) 지형 노이즈 계산 (fbm 방식: 여러 층의 노이즈를 쌓음)
    // 대륙 형태 (낮은 주파수)
    let noise = simplex.noise3d(p.x * 1.5, p.y * 1.5, p.z * 1.5) * 0.5 + 0.5;
    // 산맥 디테일 (중간 주파수)
    noise += simplex.noise3d(p.x * 4, p.y * 4, p.z * 4) * 0.25;
    // 자잘한 찰흙 질감 (높은 주파수)
    noise += simplex.noise3d(p.x * 10, p.y * 10, p.z * 10) * 0.1;
    
    // 노이즈 범위를 0~1로 정규화
    noise = Math.min(1, Math.max(0, noise));

    // 2) 고도에 따른 그라데이션 색상 및 입체감 계산
    let bumpHeight = 0;
    
    // 북극/남극 표현 (위도 계산)
    const lat = Math.abs(p.y); // 0(적도) ~ 1(극지방)
    const polarCapSize = 0.88; // 극지방 흰색 크기 설정

    if (lat > polarCapSize) {
        // --- 북극/남극 ---
        color.lerpColors(c_forest, c_snow, (lat - polarCapSize) / (1 - polarCapSize));
        // 극지방은 약간 튀어나온 찰흙 덩어리처럼 표현
        bumpHeight = earthRadius * 0.03 * simplex.noise3d(p.x*5, p.y*5, p.z*5);
    } 
    else if (noise < 0.48) { 
        // --- 바다 (노이즈 값 0.48 미만) ---
        // 깊이에 따라 진한 파랑 -> 연한 파랑 그라데이션
        color.lerpColors(c_deepOcean, c_shallowOcean, noise / 0.48);
        // 바다는 구체의 기본 표면보다 살짝 들어가게 (수심 표현)
        bumpHeight = -earthRadius * 0.02 * (1 - noise);
    } 
    else {
        // --- 육지 ---
        // 육지 내에서도 얼룩덜룩한 그라데이션을 위한 보조 노이즈
        const patchNoise = simplex.noise3d(p.x * 8, p.y * 8, p.z * 8) * 0.5 + 0.5;
        
        if (noise < 0.52) {
            // 해변/저지대
            color.lerpColors(c_beach, c_plain, patchNoise);
            bumpHeight = earthRadius * 0.01 * patchNoise; // 아주 살짝 튀어나옴
        }
        else if (noise < 0.7) {
            // 평지/숲 (불규칙한 색상 적용)
            const greenMix = THREE.MathUtils.lerp(0, 1, patchNoise);
            color.lerpColors(c_plain, c_forest, greenMix);
            bumpHeight = earthRadius * 0.02 * patchNoise; 
        }
        else {
            // --- 산맥 (노이즈 값 0.7 이상) ---
            // 산맥 높이에 따라 갈색 -> 흰색(눈) 그라데이션
            const mtNoise = (noise - 0.7) / 0.3; // 산맥 내에서의 상대적 높이 (0~1)
            const colorNoise = patchNoise * 0.3 + mtNoise * 0.7; // 불규칙성 섞음
            
            if (colorNoise < 0.6) {
                color.lerpColors(c_forest, c_mountain, colorNoise / 0.6);
            } else {
                color.lerpColors(c_mountain, c_snow, (colorNoise - 0.6) / 0.4);
            }
            // 산은 확실하게 솟아오르게 (입체적 산맥)
            // 지수 함수를 사용하여 높은 곳은 더 뾰족하게
            bumpHeight = earthRadius * 0.15 * Math.pow(mtNoise, 1.5) * (0.8 + patchNoise * 0.4);
        }
    }

    // 3) 계산된 입체감(bumpHeight)을 실제 구체 꼭짓점에 적용
    // 꼭짓점 위치 = 기본 구체 반지름 + 입체 높이
    vertex.multiplyScalar(1 + bumpHeight / earthRadius);
    posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);

    // 찰흙 특유의 불완전함을 위해 색상에 자잘한 노이즈 추가
    color.r += (Math.random() - 0.5) * 0.02;
    color.g += (Math.random() - 0.5) * 0.02;
    color.b += (Math.random() - 0.5) * 0.02;
    colors.push(color.r, color.g, color.b);
}

// 조명이 울퉁불퉁한 지형을 인식하도록 법선 벡터 재계산
earthGeometry.computeVertexNormals();
earthGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

// 매트하고 쫀득한 클레이 재질 (Material)
const earthMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, // 계산된 정점 색상 사용
    roughness: 1.0,  // 번들거림 완전 제거 (무광 클레이)
    metalness: 0.0,
    flatShading: false, // 산맥을 부드럽게 연결
    envMapIntensity: 0.3 // 환경광 억제
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);


// --- 4. 클레이 위성 만들기 (별, 코인, 망고, 수박) ---
const satellites = [];
const satelliteGroup = new THREE.Group();
scene.add(satelliteGroup);

// 클레이 재질 생성 헬퍼 (각지게 만들어서 찰흙 느낌 강조)
function createClayMesh(geometry, colorHex) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 1.0, flatShading: true });
    return new THREE.Mesh(geometry, mat);
}

// 1) 마리오 별 (노란색 다면체)
const starGeo = new THREE.IcosahedronGeometry(0.35, 0);
const star = createClayMesh(starGeo, 0xFBD000);
satellites.push({ mesh: star, angle: 0, speed: 0.008, radius: 4.5, yOffset: 0 });

// 2) 마리오 코인 (납작한 원기둥)
const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12);
const coin = createClayMesh(coinGeo, 0xFFB000);
coin.rotation.x = Math.PI / 2;
satellites.push({ mesh: coin, angle: Math.PI / 2, speed: 0.012, radius: 5.2, yOffset: 1.2 });

// 3) 망고 (살짝 길쭉한 주황/노랑 구체)
const mangoGeo = new THREE.SphereGeometry(0.3, 16, 16);
const mango = createClayMesh(mangoGeo, 0xFF9900);
mango.scale.set(1, 1.4, 0.8);
satellites.push({ mesh: mango, angle: Math.PI, speed: 0.01, radius: 4.8, yOffset: -1.2 });

// 4) 봄 수박 (초록색 둥근 구체)
const melonGeo = new THREE.SphereGeometry(0.35, 16, 16);
const melon = createClayMesh(melonGeo, 0x43B047);
satellites.push({ mesh: melon, angle: Math.PI * 1.5, speed: 0.006, radius: 5.8, yOffset: 0.8 });

satellites.forEach(sat => satelliteGroup.add(sat.mesh));


// --- 5. 애니메이션 및 상호작용 (별똥별 & 폭발) ---
const animations = [];

// 귀여운 클레이 폭발 파티클
function createExplosion(hitPoint) {
    const particleCount = 10;
    const pColors = [0xE52521, 0xFBD000, 0x049CD8, 0xFFFFFF, 0x8ABF5C]; // 마리오+지형 컬러
    
    for (let i = 0; i < particleCount; i++) {
        const pGeo = new THREE.IcosahedronGeometry(Math.random() * 0.15 + 0.05, 0);
        const pMat = new THREE.MeshStandardMaterial({ 
            color: pColors[Math.floor(Math.random() * pColors.length)], 
            roughness: 1.0, flatShading: true 
        });
        const particle = new THREE.Mesh(pGeo, pMat);
        particle.position.copy(hitPoint);
        scene.add(particle);

        // 폭발 방향 설정
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25
        ).add(hitPoint.clone().normalize().multiplyScalar(0.15));

        let age = 0;
        animations.push({
            update: () => {
                age += 0.015;
                particle.position.add(velocity);
                particle.rotation.x += 0.1; particle.rotation.y += 0.1;
                particle.scale.setScalar(Math.max(0, 1 - age)); // 점점 작아짐
                if (age >= 1) { scene.remove(particle); return true; }
                return false;
            }
        });
    }
}

// 별똥별 발사
function shootStar(targetPoint) {
    const starletGeo = new THREE.TetrahedronGeometry(0.2, 0);
    const starletMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const starlet = new THREE.Mesh(starletGeo, starletMat);
    
    // 화면 바깥 높은 곳에서 시작
    starlet.position.set(targetPoint.x * 2 + (Math.random()-0.5)*10, targetPoint.y + 8, targetPoint.z * 2 + 5);
    scene.add(starlet);

    let progress = 0;
    const startPos = starlet.position.clone();

    animations.push({
        update: () => {
            progress += 0.04; // 속도
            if (progress >= 1) {
                scene.remove(starlet);
                createExplosion(targetPoint);
                return true;
            }
            starlet.position.lerpVectors(startPos, targetPoint, progress);
            starlet.rotation.x += 0.3; starlet.rotation.y += 0.3;
            return false;
        }
    });
}


// --- 6. 마우스 클릭 감지 및 드래그 ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earth);
    
    if (intersects.length > 0) {
        shootStar(intersects[0].point); // 클릭한 지점으로 별똥별 발사
    }
});

// 드래그 컨트롤 (자전축 고정)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; 
controls.enablePan = false; 
controls.minPolarAngle = Math.PI / 2; // 상하 회전 고정
controls.maxPolarAngle = Math.PI / 2; 


// --- 7. 애니메이션 루프 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // 1) 지구가 아주 천천히 자전
    earth.rotation.y += 0.0005;

    // 2) 위성들 공전 및 둥둥거림
    satellites.forEach(sat => {
        sat.angle += sat.speed;
        sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
        sat.mesh.position.z = Math.sin(sat.angle) * sat.radius;
        sat.mesh.position.y = Math.sin(sat.angle * 2.5) * 0.6 + sat.yOffset; // 둥둥거림 추가
        sat.mesh.rotation.y += 0.03;
        sat.mesh.rotation.x += 0.01;
    });

    // 3) 애니메이션 업데이트
    for (let i = animations.length - 1; i >= 0; i--) {
        if (animations[i].update()) { animations.splice(i, 1); }
    }

    renderer.render(scene, camera);
}
animate();

// --- 8. 창 크기 반응형 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
