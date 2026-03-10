import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. 기본 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8); // 카메라를 조금 더 뒤로 (위성 공간 확보)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
mainLight.position.set(5, 5, 5);
scene.add(mainLight);
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
fillLight.position.set(-5, -2, -5);
scene.add(fillLight);

// --- 2. 클레이 지구 만들기 ---
const earthRadius = 2;
const earthGeometry = new THREE.SphereGeometry(earthRadius, 128, 128);
const positionAttribute = earthGeometry.attributes.position;
const vertex = new THREE.Vector3();
const colors = [];
const color = new THREE.Color();

for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);
    const basePosition = new THREE.Vector3().copy(vertex).normalize();
    const nx = basePosition.x * 2.5; const ny = basePosition.y * 2.5; const nz = basePosition.z * 2.5;
    const landNoise = Math.sin(nx)*Math.cos(ny) + Math.sin(ny)*Math.cos(nz) + Math.sin(nz)*Math.cos(nx);
    const microNoise = Math.sin(nx*15)*Math.cos(ny*15)*Math.sin(nz*15) * 0.05;
    
    let bump = 0; let isLand = false;
    if (landNoise > 0.4) { 
        bump = landNoise * 0.2 + microNoise; isLand = true;
    } else {
        bump = landNoise * 0.05 + microNoise * 0.8;
    }

    vertex.copy(basePosition).multiplyScalar(earthRadius + bump);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);

    if (isLand) color.setHex(0x8ABF5C); else color.setHex(0x2D82B5);
    color.r += (Math.random() - 0.5) * 0.05; color.g += (Math.random() - 0.5) * 0.05; color.b += (Math.random() - 0.5) * 0.05;
    colors.push(color.r, color.g, color.b);
}

earthGeometry.computeVertexNormals();
earthGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const earthMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1.0, metalness: 0.0, flatShading: false
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- 3. 클레이 위성 만들기 (별, 코인, 망고, 수박) ---
const satellites = [];
const satelliteGroup = new THREE.Group();
scene.add(satelliteGroup);

// 클레이 재질 생성 헬퍼 함수 (각지게 만들어서 찰흙 느낌 강조)
function createClayMesh(geometry, colorHex) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 1.0, flatShading: true });
    return new THREE.Mesh(geometry, mat);
}

// 1) 마리오 별 (노란색 다면체)
const starGeo = new THREE.IcosahedronGeometry(0.3, 0);
const star = createClayMesh(starGeo, 0xFBD000);
satellites.push({ mesh: star, angle: 0, speed: 0.01, radius: 3.5, yOffset: 0 });

// 2) 마리오 코인 (납작한 원기둥)
const coinGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12);
const coin = createClayMesh(coinGeo, 0xFFB000);
coin.rotation.x = Math.PI / 2;
satellites.push({ mesh: coin, angle: Math.PI / 2, speed: 0.015, radius: 4, yOffset: 1 });

// 3) 망고 (살짝 길쭉한 주황/노랑 구체)
const mangoGeo = new THREE.SphereGeometry(0.25, 16, 16);
const mango = createClayMesh(mangoGeo, 0xFF9900);
mango.scale.set(1, 1.4, 0.8);
satellites.push({ mesh: mango, angle: Math.PI, speed: 0.012, radius: 3.8, yOffset: -1 });

// 4) 봄 수박 (초록색 둥근 구체)
const melonGeo = new THREE.SphereGeometry(0.3, 16, 16);
const melon = createClayMesh(melonGeo, 0x43B047);
satellites.push({ mesh: melon, angle: Math.PI * 1.5, speed: 0.008, radius: 4.5, yOffset: 0.5 });

satellites.forEach(sat => satelliteGroup.add(sat.mesh));

// --- 4. 애니메이션 시스템 (별똥별 & 폭발 효과) ---
const animations = []; // 활성화된 애니메이션 보관 배열

// 폭발 파티클 생성 함수
function createExplosion(hitPoint) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        // 귀여운 클레이 파편
        const pGeo = new THREE.IcosahedronGeometry(Math.random() * 0.1 + 0.05, 0);
        const pColors = [0xE52521, 0xFBD000, 0x049CD8, 0xFFFFFF]; // 마리오 컬러
        const pMat = new THREE.MeshStandardMaterial({ 
            color: pColors[Math.floor(Math.random() * pColors.length)], 
            roughness: 1.0, flatShading: true 
        });
        const particle = new THREE.Mesh(pGeo, pMat);
        particle.position.copy(hitPoint);
        scene.add(particle);

        // 폭발 방향 (지구 표면에서 바깥쪽으로 무작위로 튕겨나감)
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        ).add(hitPoint.clone().normalize().multiplyScalar(0.1)); // 표면 법선 방향 힘 추가

        let age = 0;
        animations.push({
            update: () => {
                age += 0.02;
                particle.position.add(velocity);
                particle.rotation.x += 0.1; particle.rotation.y += 0.1;
                particle.scale.setScalar(Math.max(0, 1 - age)); // 점점 작아짐
                if (age >= 1) {
                    scene.remove(particle);
                    return true; // 배열에서 삭제
                }
                return false;
            }
        });
    }
}

// 별똥별 발사 함수
function shootStar(targetPoint) {
    // 별똥별 모양 (하얀색 클레이 조각)
    const starletGeo = new THREE.TetrahedronGeometry(0.15, 0);
    const starletMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const starlet = new THREE.Mesh(starletGeo, starletMat);
    
    // 화면 바깥의 랜덤한 높은 위치에서 시작
    starlet.position.set(
        targetPoint.x + (Math.random() > 0.5 ? 5 : -5),
        targetPoint.y + 5,
        targetPoint.z + 5
    );
    scene.add(starlet);

    let progress = 0;
    const startPos = starlet.position.clone();

    animations.push({
        update: () => {
            progress += 0.05; // 날아가는 속도
            if (progress >= 1) {
                scene.remove(starlet);
                createExplosion(targetPoint); // 목표 지점 도달 시 폭발
                return true;
            }
            // 부드럽게 목표 지점을 향해 이동 (Lerp)
            starlet.position.lerpVectors(startPos, targetPoint, progress);
            starlet.rotation.x += 0.2; starlet.rotation.y += 0.2;
            return false;
        }
    });
}

// --- 5. 마우스 클릭 감지 (Raycaster) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    // 마우스 좌표를 3D 공간 좌표로 변환
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earth);

    // 지구를 클릭했다면 해당 지점으로 별똥별 발사!
    if (intersects.length > 0) {
        shootStar(intersects[0].point);
    }
});

// --- 6. 드래
