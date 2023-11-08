import { useEffect, useMemo } from 'react';
import { Subject } from 'rxjs';
import { IpcMessageType } from '../types';

export default function useIpc(type: IpcMessageType) {
  const incoming = useMemo(() => new Subject<any>(), []);
  const outgoing = useMemo(() => new Subject<any>(), []);
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
