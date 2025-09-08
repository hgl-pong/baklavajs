<template>
    <div class="color-picker-container">
        <div class="color-grid">
            <div
                v-for="color in presetColors"
                :key="color.value"
                class="color-item"
                :class="{ '--selected': isSelected(color.value) }"
                :style="{ backgroundColor: color.value }"
                @click="selectColor(color.value)"
                :title="color.name"
            />
        </div>
        <div class="custom-color-section">
            <input
                ref="colorInput"
                type="color"
                :value="currentColor"
                @input="onCustomColorChange"
                class="color-input"
                :title="'Custom color'"
            />
            <input
                type="text"
                :value="currentColor"
                @input="onHexInput"
                class="hex-input"
                placeholder="#000000"
                maxlength="7"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps<{
    modelValue: string;
    node: any;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const colorInput = ref<HTMLInputElement | null>(null);

const presetColors = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#dc3545' },
    { name: 'Green', value: '#28a745' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Yellow', value: '#ffc107' },
    { name: 'Purple', value: '#6f42c1' },
    { name: 'Pink', value: '#e83e8c' },
    { name: 'Orange', value: '#fd7e14' },
    { name: 'Teal', value: '#20c997' },
    { name: 'Cyan', value: '#17a2b8' },
    { name: 'Dark', value: '#343a40' },
    { name: 'Gray', value: '#6c757d' },
];

const currentColor = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const isSelected = (color: string) => {
    if (!color) return !props.modelValue;
    return props.modelValue === color;
};

const selectColor = (color: string) => {
    currentColor.value = color;
};

const onCustomColorChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    currentColor.value = target.value;
};

const onHexInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    let value = target.value;
    
    // Ensure it starts with #
    if (value && !value.startsWith('#')) {
        value = '#' + value;
    }
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
        currentColor.value = value;
    }
};

// Watch for external changes and update the color input
watch(currentColor, (newColor) => {
    if (colorInput.value) {
        colorInput.value.value = newColor || '#000000';
    }
}, { immediate: true });
</script>

<style scoped>
.color-picker-container {
    padding: 8px;
    min-width: 200px;
}

.color-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    margin-bottom: 8px;
}

.color-item {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;
}

.color-item:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.5);
}

.color-item.--selected {
    border-color: white;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}

.color-item.--selected::after {
    content: '✓';
    position: absolute;
    color: white;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.custom-color-section {
    display: flex;
    gap: 8px;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding-top: 8px;
}

.color-input {
    width: 40px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: none;
}

.hex-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 12px;
    font-family: monospace;
}

.hex-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.15);
}
</style>