const { contextBridge, ipcRenderer } = require('electron');

// 在渲染进程中暴露受保护的方法和属性
contextBridge.exposeInMainWorld('electronAPI', {
  // 可以在这里添加需要在渲染进程中使用的 API
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // 示例：发送消息到主进程
  sendMessage: (message) => {
    ipcRenderer.invoke('send-message', message);
  },
  
  // 示例：监听来自主进程的消息
  onMessage: (callback) => {
    ipcRenderer.on('message-from-main', callback);
  }
});

// 确保在页面加载完成前执行
window.addEventListener('DOMContentLoaded', () => {
  console.log('BaklavaJS Electron App loaded');
});