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
    isRandomConstraints: Boolean,
    saveCsv: Boolean,
    fileHandle: Object,
    isEditingConstraints: Boolean,
    timeLimit: Number, // New prop
    speed: Number,
    separation: Number,
    stats: Array,
    blockedCount: Number
});

const emit = defineEmits(['update:dims', 'update:startPos', 'update:isRandomStart', 'update:isRandomConstraints', 'update:saveCsv', 'select-file', 'update:speed', 'update:separation', 'update:timeLimit', 'toggle-run', 'reset', 'toggle-edit-constraints', 'clear-constraints', 'randomize-constraints']);

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

const totalSteps = computed(() => (localDims[0] * localDims[1] * localDims[2]) - (props.blockedCount || 0));

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
        
        <div class="flex-1 p-4 space-y-6 overflow-y-auto">
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
                    <label class="flex items-center space-x-2 transition-colors cursor-pointer hover:text-gray-300">
                        <span class="text-[10px]">Random</span>
                        <input type="checkbox" 
                               :checked="isRandomStart" 
                               @change="$emit('update:isRandomStart', $event.target.checked)"
                               :disabled="isRunning"
                               class="w-3 h-3 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-0 focus:ring-offset-0 accent-blue-500">
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

            <div class="flex flex-col py-1 space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-2">
                    <input type="checkbox" 
                           :checked="saveCsv" 
                           @change="$emit('update:saveCsv', $event.target.checked)"
                           class="w-3 h-3 text-green-500 bg-gray-800 border-gray-600 rounded focus:ring-0 focus:ring-offset-0 accent-green-500">
                    <span>Auto-Append to CSV</span>
                </label>
                
                <button v-if="saveCsv" 
                        @click="$emit('select-file')"
                        class="flex items-center justify-center gap-2 px-2 py-1 text-xs text-gray-300 transition-colors bg-gray-800 border border-gray-600 rounded hover:bg-gray-700">
                    <span v-if="fileHandle" class="text-green-400 truncate max-w-[200px]">File: {{ fileHandle.name }}</span>
                    <span v-else>Select Log File...</span>
                </button>
            </div>

            <!-- Constraints Section -->
            <div class="pt-2 space-y-2 border-t border-gray-700">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Constraints</span>
                    <div class="flex items-center gap-2">
                        <label class="flex items-center space-x-2 transition-colors cursor-pointer text-gray-500 hover:text-gray-300">
                            <span class="text-[10px]">Random</span>
                            <input type="checkbox" 
                                   :checked="isRandomConstraints" 
                                   @change="$emit('update:isRandomConstraints', $event.target.checked)"
                                   :disabled="isRunning"
                                   class="w-3 h-3 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-0 focus:ring-offset-0 accent-blue-500">
                        </label>
                        <button @click="$emit('clear-constraints')" :disabled="isRunning" class="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50">Clear All</button>
                    </div>
                </div>
                <button @click="$emit('toggle-edit-constraints')" 
                        :disabled="isRunning"
                        :class="isEditingConstraints ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'"
                        class="w-full py-1.5 rounded text-xs font-bold border border-gray-600 transition-colors disabled:opacity-50">
                    {{ isEditingConstraints ? 'Done Editing' : 'Edit Blocked Cells' }}
                </button>
                <p v-if="isEditingConstraints" class="text-[10px] text-yellow-500 text-center animate-pulse">
                    Click on cells to block/unblock
                </p>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Time Limit (sec)</span>
                    <span class="text-orange-400">{{ timeLimit > 0 ? timeLimit + 's' : 'No Limit' }}</span>
                </div>
                <input type="number" :value="timeLimit" @input="$emit('update:timeLimit', +$event.target.value)" 
                       min="0" step="0.1" placeholder="0 = No Limit"
                       class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-center text-sm text-white focus:border-orange-500 focus:outline-none transition-colors">
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