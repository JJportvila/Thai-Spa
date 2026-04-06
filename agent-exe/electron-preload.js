const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('stretAgentDesktop', {
  mode: 'desktop',
});
