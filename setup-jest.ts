window.electron = {
  ipcRenderer: {
    on: jest.fn().mockReturnValue(jest.fn()),
    sendMessage: jest.fn().mockReturnValue({
      unsubscribe: jest.fn(),
    }),
  },
};
