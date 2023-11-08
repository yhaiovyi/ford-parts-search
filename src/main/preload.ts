// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IpcMessageType } from '../types';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: IpcMessageType, data: any) {
      ipcRenderer.send(channel, data);
    },
    on(channel: IpcMessageType, func: (data: any) => void) {
      const subscription = (_event: IpcRendererEvent, data: any) => func(data);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: IpcMessageType, func: (data: any) => void) {
      ipcRenderer.once(channel, (_event, data) => func(data));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
