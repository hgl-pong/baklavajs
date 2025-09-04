<template>
    <div v-if="modelValue" class="baklava-subgraph-name-dialog-overlay" @click.self="cancel">
        <div class="baklava-subgraph-name-dialog">
            <div class="baklava-subgraph-name-dialog__header">
                <h3>Create Subgraph</h3>
            </div>
            
            <div class="baklava-subgraph-name-dialog__content">
                <div class="baklava-subgraph-name-dialog__field">
                    <label for="subgraph-name">Subgraph Name:</label>
                    <input
                        id="subgraph-name"
                        ref="nameInput"
                        v-model="name"
                        type="text"
                        class="baklava-input"
                        :class="{ '--invalid': hasError }"
                        placeholder="Enter subgraph name"
                        @keydown.enter="confirm"
                        @keydown.escape="cancel"
                    />
                    <div v-if="errorMessage" class="baklava-subgraph-name-dialog__error">
                        {{ errorMessage }}
                    </div>
                </div>
            </div>
            
            <div class="baklava-subgraph-name-dialog__actions">
                <button class="baklava-button" @click="cancel">
                    Cancel
                </button>
                <button 
                    class="baklava-button baklava-button--primary" 
                    :disabled="!isValid"
                    @click="confirm"
                >
                    Create
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

interface Props {
    modelValue: boolean;
    defaultName?: string;
    existingNames?: string[];
}

interface Emits {
    "update:modelValue": [value: boolean];
    "confirm": [name: string];
    "cancel": [];
}

const props = withDefaults(defineProps<Props>(), {
    defaultName: "",
    existingNames: () => [],
});

const emit = defineEmits<Emits>();

const nameInput = ref<HTMLInputElement | null>(null);
const name = ref("");

// Validation logic
const errorMessage = computed(() => {
    if (!name.value.trim()) {
        return "Name cannot be empty";
    }
    
    if (name.value.trim().length > 50) {
        return "Name cannot exceed 50 characters";
    }
    
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(name.value.trim())) {
        return "Name can only contain letters, numbers, Chinese characters, underscores, hyphens and spaces";
    }
    
    if (props.existingNames.includes(name.value.trim())) {
        return "This name already exists";
    }
    
    return "";
});

const hasError = computed(() => !!errorMessage.value);
const isValid = computed(() => name.value.trim() && !hasError.value);

// Watch dialog open, set default value and focus
watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue) {
            name.value = props.defaultName;
            nextTick(() => {
                nameInput.value?.focus();
                nameInput.value?.select();
            });
        }
    },
    { immediate: true }
);

const confirm = () => {
    if (isValid.value) {
        emit("confirm", name.value.trim());
        emit("update:modelValue", false);
    }
};

const cancel = () => {
    emit("cancel");
    emit("update:modelValue", false);
};
</script>

<style scoped>
.baklava-subgraph-name-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
}

.baklava-subgraph-name-dialog {
    background-color: var(--baklava-node-color-background);
    border-radius: var(--baklava-control-border-radius);
    box-shadow: var(--baklava-context-menu-shadow);
    border: 1px solid var(--baklava-control-color-hover);
    min-width: 400px;
    max-width: 500px;
    color: var(--baklava-control-color-foreground);
}

.baklava-subgraph-name-dialog__header {
    padding: 1rem 1.5rem 0.5rem;
    border-bottom: 1px solid var(--baklava-control-color-hover);
}

.baklava-subgraph-name-dialog__header h3 {
    margin: 0;
    font-size: 1.2em;
    font-weight: 600;
}

.baklava-subgraph-name-dialog__content {
    padding: 1.5rem;
}

.baklava-subgraph-name-dialog__field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.baklava-subgraph-name-dialog__field label {
    font-weight: 500;
    font-size: 0.9em;
}

.baklava-subgraph-name-dialog__error {
    color: var(--baklava-control-color-error);
    font-size: 0.85em;
    margin-top: 0.25rem;
}

.baklava-subgraph-name-dialog__actions {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--baklava-control-color-hover);
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
}

.baklava-button--primary {
    background-color: var(--baklava-control-color-primary);
    color: white;
}

.baklava-button--primary:hover:not(:disabled) {
    background-color: var(--baklava-control-color-primary);
    opacity: 0.9;
}

.baklava-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>