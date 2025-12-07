<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import ControlPanel from './components/ControlPanel.vue';
import { KnightTourSolver } from './logic/KnightTourSolver.js';
import { SimulationPanel } from './logic/SimulationPanel.js';

const canvasRef = ref(null);
const isRunning = ref(false);
const dimensions = ref([4, 4, 4]);
const startPos = ref([0, 0, 0]);
const speed = ref(50);
const separation = ref(0.2);

const stats = reactive([
    { done: false, step: 0, ops: 0, time: 0, startTime: 0 },
    { done: false, step: 0, ops: 0, time: 0, startTime: 0 },
    { done: false, step: 0, ops: 0, time: 0, startTime: 0 } 
]);

let scene, camera, renderer, controls, animationId;
let panels = []; 
let solvers = [];

const allFinished = computed(() => stats.every(s => s.done));
const statusText = computed(() => {
    if (isRunning.value) return 'Running...';
    if (allFinished.value) return 'Completed';
    return 'Idle';
});

onMounted(() => {
    initThree();
    rebuildBoards();
    window.addEventListener('resize', onWindowResize);
    animateLoop();
});

onBeforeUnmount(() => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onWindowResize);
});

// Three.js
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.value.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animateLoop() {
    requestAnimationFrame(animateLoop);
    controls.update();
    renderer.render(scene, camera);
}

function rebuildBoards() {
    stopSimulation();
    
    // Bersihkan panel lama
    panels.forEach(p => scene.remove(p.group));
    panels = [];

    const [w, l, h] = dimensions.value;
    const spacing = Math.max(w, l) * 2.5;

    // panel visual
    panels.push(new SimulationPanel(scene, [-spacing, 0, 0], 0xef4444, dimensions.value));
    panels.push(new SimulationPanel(scene, [0, 0, 0], 0x06b6d4, dimensions.value));
    panels.push(new SimulationPanel(scene, [spacing, 0, 0], 0x22c55e, dimensions.value));

    // Set posisi awal visual
    panels.forEach(p => p.updateKnightPos(...startPos.value));

    resetStats();
    resetCamera();
}

function resetCamera() {
    if (!camera) return;
    const maxDim = Math.max(...dimensions.value);
    camera.position.set(0, maxDim * 4, maxDim * 6);
    controls.target.set(0, 0, 0);
    controls.update();
}

function resetStats() {
    stats.forEach(s => { s.done = false; s.step = 0; s.ops = 0; s.time = 0; s.startTime = 0; });
}

function stopSimulation() {
    isRunning.value = false;
    if (animationId) cancelAnimationFrame(animationId);
}

function toggleSimulation() {
    if (isRunning.value) {
        stopSimulation();
    } else {
        if (allFinished.value) rebuildBoards();
        
        // Panggil solver
        const [w, l, h] = dimensions.value;
        const sLogic = new KnightTourSolver(w, l, h);
        const start = [...startPos.value];
        solvers = [
            sLogic.solveBacktracking(start),
            sLogic.solveWarnsdorff(start),
            sLogic.solveCombined(start)
        ];

        panels.forEach(p => p.reset(start));
        resetStats();
        
        const now = performance.now();
        stats.forEach(s => s.startTime = now);

        isRunning.value = true;
        logicLoop();
    }
}

function logicLoop() {
    if (!isRunning.value) return;

    // kontrol speed
    let stepsPerFrame = 1;
    let delayMs = 0;

    if (speed.value < 40) {
        delayMs = (40 - speed.value) * 10;
    } else {
        stepsPerFrame = Math.floor((speed.value - 40) / 4);
        if (stepsPerFrame < 1) stepsPerFrame = 1;
    }

    const now = performance.now();

    const stepFn = () => {
        let active = 0;
        solvers.forEach((gen, idx) => {
            if (stats[idx].done) return;
            active++;

            stats[idx].time = now - stats[idx].startTime;

            try {
                const res = gen.next();
                stats[idx].ops++;
                if (res.done) {
                    stats[idx].done = true;
                    stats[idx].time = performance.now() - stats[idx].startTime;
                } else {
                    const { type, pos, step } = res.value;
                    panels[idx].update(type, pos, step);
                    
                    if (type === 'move') stats[idx].step = step + 1;
                    if (type === 'revert') stats[idx].step = step - 1;
                    
                    // Check complete
                    const total = dimensions.value[0] * dimensions.value[1] * dimensions.value[2];
                    if (stats[idx].step === total) {
                        stats[idx].done = true;
                        stats[idx].time = performance.now() - stats[idx].startTime;
                    }
                }
            } catch(e) { console.error(e); stats[idx].done = true; }
        });
        if (active === 0) isRunning.value = false;
    };

    if (delayMs > 0) {
        stepFn();
        setTimeout(() => {
            if (isRunning.value) requestAnimationFrame(logicLoop);
        }, delayMs);
    } else {
        for(let i=0; i<stepsPerFrame; i++) stepFn();
        if (isRunning.value) requestAnimationFrame(logicLoop);
    }
}

watch(separation, (val) => panels.forEach(p => p.updateSeparation(val)));
watch(startPos, (val) => {
    if (!isRunning.value) {
        panels.forEach(p => p.updateKnightPos(...val));
    }
}, { deep: true });

watch(dimensions, () => {
    // Clamp startPos if dimensions shrink
    for(let i=0; i<3; i++) {
        if (startPos.value[i] >= dimensions.value[i]) {
            startPos.value[i] = dimensions.value[i] - 1;
        }
    }
    rebuildBoards();
}, { deep: true });

function updateDims(v) { dimensions.value = v; }
function updateStartPos(v) { startPos.value = v; }
function updateSpeed(v) { speed.value = v; }
function updateSeparation(v) { separation.value = v; }
</script>

<template>
    <div class="relative w-full h-screen font-sans">
        <div class="absolute z-10 pointer-events-none top-4 left-4">
            <h1 class="p-2 text-3xl font-bold text-white border-l-4 border-blue-500 rounded bg-black/50 backdrop-blur-sm">
                3D Knight's Tour
            </h1>
        </div>

        <div ref="canvasRef" class="absolute inset-0 z-0"></div>

        <ControlPanel 
            :isRunning="isRunning"
            :allFinished="allFinished"
            :statusText="statusText"
            :dims="dimensions"
            :startPos="startPos"
            :speed="speed"
            :separation="separation"
            :stats="stats"
            @update:dims="updateDims"
            @update:startPos="updateStartPos"
            @update:speed="updateSpeed"
            @update:separation="updateSeparation"
            @toggle-run="toggleSimulation"
            @reset="rebuildBoards"
        />
    </div>
</template>