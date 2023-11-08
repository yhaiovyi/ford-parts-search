// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Channels, IpcMessage } from '../types';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, data: IpcMessage<any>) {
      ipcRenderer.send(channel, data);
    },
    on(channel: Channels, func: (data: IpcMessage<any>) => void) {
      const subscription = (_event: IpcRendererEvent, data: IpcMessage<any>) =>
        func(data);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (data: IpcMessage<any>) => void) {
      ipcRenderer.once(channel, (_event, data) => func(data));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
