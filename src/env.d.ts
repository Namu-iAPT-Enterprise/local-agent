interface Window {
  electronAPI: {
    getLocalIP: () => Promise<string>;
  };
}
