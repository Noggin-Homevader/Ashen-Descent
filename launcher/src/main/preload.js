'use strict';
/** The only bridge between the launcher page and the main process. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ashen', {
  platform: process.platform,
  getState: () => ipcRenderer.invoke('launcher:get-state'),
  onState: (cb) => {
    const h = (_e, s) => cb(s);
    ipcRenderer.on('launcher:state', h);
    return () => ipcRenderer.removeListener('launcher:state', h);
  },
  onClosing: (cb) => { ipcRenderer.on('launcher:closing', () => cb()); },
  retry: () => ipcRenderer.invoke('launcher:retry'),
  play: () => ipcRenderer.invoke('launcher:play'),
  setAllowPrerelease: (on) => ipcRenderer.invoke('launcher:prerelease', !!on),
  open: (what) => ipcRenderer.invoke('launcher:open', String(what)),
  openReleasePage: () => ipcRenderer.invoke('launcher:release-page'),
  getLocation: () => ipcRenderer.invoke('launcher:location'),
  setLocation: (choice) => ipcRenderer.invoke('launcher:set-location', choice),
  onLocationProgress: (cb) => { ipcRenderer.on('launcher:location-progress', (_e, p) => cb(p)); },
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
});
