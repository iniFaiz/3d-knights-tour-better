<script setup>
import { reactive, computed, watch } from 'vue';
import StatsCard from './StatsCard.vue';

const props = defineProps({
    isRunning: Boolean,
    allFinished: Boolean,
    statusText: String,
    dims: Array,
    startPos: Array,
    isRandomStart: Boolean,
    saveCsv: Boolean,
    fileHandle: Object, // Tambahkan prop ini
    speed: Number,
    separation: Number,
    stats: Array
});

const emit = defineEmits(['update:dims', 'update:startPos', 'update:isRandomStart', 'update:saveCsv', 'select-file', 'update:speed', 'update:separation', 'toggle-run', 'reset']);

const localDims = reactive([...props.dims]);
const localStartPos = reactive([...props.startPos]);

watch(() => props.dims, (newVal) => {
    localDims[0] = newVal[0];
    localDims[1] = newVal[1];
    localDims[2] = newVal[2];
}, { deep: true });

watch(() => props.startPos, (newVal) => {
    localStartPos[0] = newVal[0];
    localStartPos[1] = newVal[1];
    localStartPos[2] = newVal[2];
}, { deep: true });

const updateDims = () => emit('update:dims', [...localDims]);
const updateStartPos = () => emit('update:startPos', [...localStartPos]);

const totalSteps = computed(() => localDims[0] * localDims[1] * localDims[2]);

const speedLevels = {
    1: { label: 'Very Slow', value: 10 },
    2: { label: 'Slow',      value: 30 },
    3: { label: 'Normal',    value: 50 },
    4: { label: 'Fast',      value: 75 },
    5: { label: 'Very Fast', value: 100 }
};

const speedStep = computed({
    get() {
        let closestStep = 3;
        let minDiff = Infinity;
        for (const [step, data] of Object.entries(speedLevels)) {
            const diff = Math.abs(props.speed - data.value);
            if (diff < minDiff) {
                minDiff = diff;
                closestStep = Number(step);
            }
        }
        return closestStep;
    },
    set(newStep) {
        emit('update:speed', speedLevels[newStep].value);
    }
});
</script>

<template>
    <div class="absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 flex flex-col max-h-[90vh] overflow-hidden z-20">
        
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <div class="space-y-2">
                <div class="grid grid-cols-3 gap-2">
                    <div v-for="(axis, idx) in ['x', 'y', 'z']" :key="axis">
                        <label class="block text-center text-[10px] text-gray-500 mb-1">{{ axis.toUpperCase() }}</label>
                        <input type="number" v-model.number="localDims[idx]" @change="updateDims" :disabled="isRunning" :min="idx === 2 ? 1 : 2" max="20"
                            class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-center text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 transition-colors">
                    </div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Start Position</span>
                    <label class="flex items-center space-x-2 cursor-pointer hover:text-gray-300 transition-colors">
                        <span class="text-[10px]">Random</span>
                        <input type="checkbox" 
                               :checked="isRandomStart" 
                               @change="$emit('update:isRandomStart', $event.target.checked)"
                               :disabled="isRunning"
                               class="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0 focus:ring-offset-0 accent-blue-500">
                    </label>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div v-for="(axis, idx) in ['x', 'y', 'z']" :key="'start-'+axis">
                        <label class="block text-center text-[10px] text-gray-500 mb-1">{{ axis.toUpperCase() }}</label>
                        <input type="number" v-model.number="localStartPos[idx]" @change="updateStartPos" 
                            :disabled="isRunning || isRandomStart" 
                            min="0" :max="localDims[idx]-1"
                            class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-center text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 transition-colors">
                    </div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Sim Speed</span>
                    <span class="text-blue-400">{{ speedLevels[speedStep].label }}</span>
                </div>
                <input type="range" v-model.number="speedStep" 
                       min="1" max="5" step="1" 
                       class="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
                <div class="flex justify-between px-1">
                    <div v-for="i in 5" :key="i" class="w-0.5 h-1.5 bg-gray-600 rounded-full"></div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Layer Gap</span>
                    <span class="text-purple-400">{{ separation.toFixed(1) }}</span>
                </div>
                <input type="range" :value="separation" @input="$emit('update:separation', +$event.target.value)" 
                       min="0" max="2" step="0.1" class="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500">
            </div>

            <div class="flex flex-col space-y-2 py-1">
                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-2">
                    <input type="checkbox" 
                           :checked="saveCsv" 
                           @change="$emit('update:saveCsv', $event.target.checked)"
                           class="w-3 h-3 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-0 focus:ring-offset-0 accent-green-500">
                    <span>Auto-Append to CSV</span>
                </label>
                
                <button v-if="saveCsv" 
                        @click="$emit('select-file')"
                        class="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-300 transition-colors flex items-center justify-center gap-2">
                    <span v-if="fileHandle" class="text-green-400 truncate max-w-[200px]">File: {{ fileHandle.name }}</span>
                    <span v-else>Select Log File...</span>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <button @click="$emit('toggle-run')" 
                        :class="isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
                        class="py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <span v-if="!isRunning">Start</span>
                    <span v-else>Stop</span>
                </button>
                <button @click="$emit('reset')" class="bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colors border border-gray-600">
                    Reset
                </button>
            </div>

            <div class="pt-2 space-y-3">
                <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Metrics</h3>
                <StatsCard title="Backtracking" description="Guaranteed (Slow)" colorClass="red" :stats="stats[0]" :totalSteps="totalSteps" />
                <StatsCard title="Warnsdorff" description="Heuristic (Fast)" colorClass="cyan" :stats="stats[1]" :totalSteps="totalSteps" />
                <StatsCard title="Combined" description="Hybrid Approach" colorClass="green" :stats="stats[2]" :totalSteps="totalSteps" />
            </div>
        </div>
    </div>
</template>