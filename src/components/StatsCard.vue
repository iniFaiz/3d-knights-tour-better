<script setup>
import { computed } from 'vue';

const props = defineProps({
    title: String,
    description: String,
    colorClass: String,
    stats: Object,
    totalSteps: Number
});

const colorMap = {
    red: {
        border: 'border-red-500',
        text: 'text-red-400',
        badge: 'bg-red-900 text-red-200',
        bar: 'bg-red-500'
    },
    cyan: {
        border: 'border-cyan-500',
        text: 'text-cyan-400',
        badge: 'bg-cyan-900 text-cyan-200',
        bar: 'bg-cyan-500'
    },
    green: {
        border: 'border-green-500',
        text: 'text-green-400',
        badge: 'bg-green-900 text-green-200',
        bar: 'bg-green-500'
    }
};

const colors = computed(() => colorMap[props.colorClass] || colorMap.red);
const progress = computed(() => {
    if (!props.totalSteps) return 0;
    return (props.stats.step / props.totalSteps) * 100;
});

const formattedTime = computed(() => {
    const ms = props.stats.time || 0;
    return (ms / 1000).toFixed(2) + 's';
});
</script>

<template>
    <div class="bg-gray-800 p-2 rounded border-l-4 transition-all" :class="colors.border">
        <div class="flex justify-between items-start mb-1">
            <div class="flex flex-col">
                <span class="font-bold text-sm" :class="colors.text">{{ title }}</span>
                <span class="text-[10px] text-gray-500 -mt-0.5">{{ description }}</span>
            </div>
            <span v-if="stats.done" class="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold" :class="colors.badge">Done</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2 text-xs text-gray-300">
            <div class="flex justify-between"><span>Steps:</span> <span class="text-white font-mono">{{ stats.step }}/{{ totalSteps }}</span></div>
            <div class="flex justify-between"><span>Deepest:</span> <span class="text-white font-mono">{{ stats.maxStep || 0 }}</span></div>
            <div class="flex justify-between"><span>Time:</span> <span class="text-white font-mono">{{ formattedTime }}</span></div>
            <div class="flex justify-between"><span>Ops:</span> <span class="text-white font-mono">{{ stats.ops }}</span></div>
            <div class="col-span-2 mt-2 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-300 ease-out" :class="colors.bar" :style="{ width: progress + '%' }"></div>
            </div>
        </div>
    </div>
</template>