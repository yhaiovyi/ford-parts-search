import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import { ReplaySubject, Subject } from 'rxjs';

export const WebsocketContext = React.createContext({
  isConnected: false,
});

export default function WebsocketProvider({ children }) {
  const socket = useMemo(() => io('http://localhost:8080', { transports: ['websocket'] }), []);
  const incoming = useMemo(() => new Subject(), []);
  const outgoing = useMemo(() => new ReplaySubject(), []);

  useEffect(() => {
    socket.onAny((type, data) => {
      incoming.next({ type, data });
    });
    const subscription = outgoing.pipe().subscribe(({ type, data }) => {
      socket.emit(type, data);
    });
    return () => {
      subscription.unsubscribe();
      socket.offAny();
    };
  }, [socket, incoming, outgoing]);

  const contextValue = useMemo(() => ({
    incoming,
    outgoing,
  }), [
    incoming,
    outgoing,
  ]);

  return (
    <WebsocketContext.Provider value={contextValue}>
      {children}
    </WebsocketContext.Provider>
  );
}

WebsocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
