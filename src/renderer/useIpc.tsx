import { useEffect, useMemo } from 'react';
import { Subject } from 'rxjs';
import { IpcMessageType } from '../types';

export default function useIpc<T>(type: IpcMessageType) {
  const incoming = useMemo(() => new Subject<T>(), []);
  const outgoing = useMemo(() => new Subject<T>(), []);
  useEffect(() => {
    const subscription = outgoing.subscribe((data) => {
      window.electron.ipcRenderer.sendMessage(type, data);
    });

    const ipcUnsubscribe = window.electron.ipcRenderer.on(type, (data) => {
      incoming.next(data);
    });
    return () => {
      subscription.unsubscribe();
      ipcUnsubscribe();
    };
  }, [incoming, outgoing, type]);

  return { outgoing, incoming };
}
