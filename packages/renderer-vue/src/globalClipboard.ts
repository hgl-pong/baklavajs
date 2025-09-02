import { reactive, ref, computed } from "vue";
import { v4 as uuidv4 } from "uuid";

export interface IGlobalClipboardData {
    nodeBuffer: string;
    connectionBuffer: string;
    timestamp: number;
    instanceId: string;
}

export interface IGlobalClipboard {
    isEmpty: boolean;
    setData(nodeBuffer: string, connectionBuffer: string): void;
    getData(): IGlobalClipboardData | null;
    clear(): void;
    subscribe(callback: (data: IGlobalClipboardData | null) => void): () => void;
}

class GlobalClipboardManager implements IGlobalClipboard {
    private static instance: GlobalClipboardManager;
    private static readonly STORAGE_KEY = 'baklavajs-global-clipboard';
    private instanceId: string;
    private subscribers: Set<(data: IGlobalClipboardData | null) => void> = new Set();
    private _data = ref<IGlobalClipboardData | null>(null);

    private constructor() {
        this.instanceId = uuidv4();
        this.loadFromStorage();
        
        // 监听localStorage变化，实现跨标签页同步
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // 页面卸载时清理
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    public static getInstance(): GlobalClipboardManager {
        if (!GlobalClipboardManager.instance) {
            GlobalClipboardManager.instance = new GlobalClipboardManager();
        }
        return GlobalClipboardManager.instance;
    }

    public get isEmpty(): boolean {
        return !this._data.value || !this._data.value.nodeBuffer;
    }

    public setData(nodeBuffer: string, connectionBuffer: string): void {
        const data: IGlobalClipboardData = {
            nodeBuffer,
            connectionBuffer,
            timestamp: Date.now(),
            instanceId: this.instanceId
        };
        
        this._data.value = data;
        this.saveToStorage(data);
        this.notifySubscribers(data);
    }

    public getData(): IGlobalClipboardData | null {
        return this._data.value;
    }

    public clear(): void {
        this._data.value = null;
        localStorage.removeItem(GlobalClipboardManager.STORAGE_KEY);
        this.notifySubscribers(null);
    }

    public subscribe(callback: (data: IGlobalClipboardData | null) => void): () => void {
        this.subscribers.add(callback);
        // 立即调用一次回调，传递当前数据
        callback(this._data.value);
        
        // 返回取消订阅函数
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private handleStorageChange(event: StorageEvent): void {
        if (event.key === GlobalClipboardManager.STORAGE_KEY) {
            this.loadFromStorage();
        }
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(GlobalClipboardManager.STORAGE_KEY);
            if (stored) {
                const data: IGlobalClipboardData = JSON.parse(stored);
                // 只有当数据不是来自当前实例时才更新
                if (data.instanceId !== this.instanceId) {
                    this._data.value = data;
                    this.notifySubscribers(data);
                }
            } else {
                this._data.value = null;
                this.notifySubscribers(null);
            }
        } catch (error) {
            console.warn('Failed to load clipboard data from localStorage:', error);
            this._data.value = null;
        }
    }

    private saveToStorage(data: IGlobalClipboardData): void {
        try {
            localStorage.setItem(GlobalClipboardManager.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save clipboard data to localStorage:', error);
        }
    }

    private notifySubscribers(data: IGlobalClipboardData | null): void {
        this.subscribers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.warn('Error in clipboard subscriber callback:', error);
            }
        });
    }

    private cleanup(): void {
        this.subscribers.clear();
        window.removeEventListener('storage', this.handleStorageChange.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));
    }
}

// 导出单例实例
export const globalClipboard = GlobalClipboardManager.getInstance();

// 导出一个Vue组合式函数，方便在组件中使用
export function useGlobalClipboard(): IGlobalClipboard {
    return reactive({
        get isEmpty() {
            return globalClipboard.isEmpty;
        },
        setData: globalClipboard.setData.bind(globalClipboard),
        getData: globalClipboard.getData.bind(globalClipboard),
        clear: globalClipboard.clear.bind(globalClipboard),
        subscribe: globalClipboard.subscribe.bind(globalClipboard)
    });
}