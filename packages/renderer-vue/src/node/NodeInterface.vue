<template>
    <div :id="intf.id" ref="el" class="baklava-node-interface" :class="classes">
        <div
            v-if="intf.port"
            class="__port"
            :class="{ '--selected': isPortSelected }"
            @pointerover="startHover"
            @pointerout="endHover"
        >
            <slot name="portTooltip" :show-tooltip="showTooltip">
                <span v-if="showTooltip === true" class="__tooltip">
                    {{ ellipsis(intf.value) }}
                </span>
            </slot>
        </div>
        <component
            :is="intf.component"
            v-if="showComponent"
            v-model="intf.value"
            :node="node"
            :intf="intf"
            @open-sidebar="openSidebar"
        />
        <span v-else class="align-middle">
            {{ intf.name }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUpdated, Ref, ref, inject } from "vue";
import { AbstractNode, NodeInterface } from "@baklavajs/core";
import { useViewModel } from "../utility";
import { useTemporaryConnection } from "../editor/temporaryConnection";
import { getDomElements } from "../connection/domResolver";

const ellipsis = (value: any, characters = 100) => {
    const stringValue: string = typeof value?.toString === "function" ? String(value) : "";

    if (stringValue.length > characters) {
        return stringValue.slice(0, characters) + "...";
    }

    return stringValue;
};

const props = defineProps<{
    node: AbstractNode;
    intf: NodeInterface;
}>();

const { viewModel } = useViewModel();
const { hoveredOver, temporaryConnection } = useTemporaryConnection();

// 注入连接选择状态管理
const connectionSelection = inject<{
    selectedConnectionId: any;
    selectConnection: (id: string) => void;
    unselectConnection: () => void;
}>("connectionSelection");

const el = ref<HTMLElement | null>(null) as Ref<HTMLElement>;

const isConnected = computed(() => props.intf.connectionCount > 0);
const isHovered = ref<boolean>(false);
const showTooltip = computed(() => viewModel.value.settings.displayValueOnHover && isHovered.value);
const classes = computed(() => ({
    "--input": props.intf.isInput,
    "--output": !props.intf.isInput,
    "--connected": isConnected.value,
}));

// 检查连接点是否应该显示选中状态
const isPortSelected = computed(() => {
    // 临时连接状态优先
    if (temporaryConnection.value?.from === props.intf) {
        return true;
    }
    
    // 如果没有连接选择管理或没有选中的连接线，返回false
    if (!connectionSelection || !connectionSelection.selectedConnectionId.value) {
        return false;
    }
    
    // 检查是否有连接到该接口的连接线被选中
    const connections = viewModel.value.displayedGraph.connections;
    return connections.some(conn => {
        const isConnectedToThisInterface = conn.from === props.intf || conn.to === props.intf;
        if (!isConnectedToThisInterface) return false;
        
        // 使用实际的连接ID而不是坐标计算的ID
        return connectionSelection.selectedConnectionId.value === conn.id;
    });
});
const showComponent = computed<boolean>(
    () => props.intf.component && (!props.intf.isInput || !props.intf.port || props.intf.connectionCount === 0),
);

const startHover = () => {
    isHovered.value = true;
    hoveredOver(props.intf);
};
const endHover = () => {
    isHovered.value = false;
    hoveredOver(undefined);
};

const onRender = () => {
    if (el.value) {
        viewModel.value.hooks.renderInterface.execute({ intf: props.intf, el: el.value });
    }
};

const openSidebar = () => {
    const sidebar = viewModel.value.displayedGraph.sidebar;
    sidebar.nodeId = props.node.id;
    sidebar.optionName = props.intf.name;
    sidebar.visible = true;
};

onMounted(onRender);
onUpdated(onRender);
</script>
