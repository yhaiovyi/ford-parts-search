import React, { useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import { ReplaySubject, Subject } from 'rxjs';
import { WebSocketMessage } from '../types';

interface Props {
  children: React.JSX.Element;
}

const context = {
  incoming: new Subject<WebSocketMessage<any>>(),
  outgoing: new ReplaySubject<WebSocketMessage<any>>(),
};
export const WebsocketContext = React.createContext(context);

export default function WebsocketProvider({ children }: Readonly<Props>) {
  const socket = useMemo(
    () => io('http://localhost:8080', { transports: ['websocket'] }),
    [],
  );

  useEffect(() => {
    socket.onAny((type, data) => {
      context.incoming.next({ type, data });
    });
    const subscription = context.outgoing.subscribe(({ type, data }) => {
      socket.emit(type, data);
    });
    return () => {
      subscription.unsubscribe();
      socket.offAny();
    };
  }, [socket]);

  return (
    <WebsocketContext.Provider value={context}>
      {children}
    </WebsocketContext.Provider>
  );
}
