import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

type NetworkListener = (isOnline: boolean) => void;

class NetworkMonitorClass {
  private listeners: Set<NetworkListener> = new Set();
  private isOnline: boolean = true;
  private unsubscribe: (() => void) | null = null;

  start() {
    if (this.unsubscribe) return;

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = !!(state.isConnected && state.isInternetReachable !== false);

      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
      }
    });

    NetInfo.fetch().then((state: NetInfoState) => {
      this.isOnline = !!(state.isConnected && state.isInternetReachable !== false);
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }
}

export const networkMonitor = new NetworkMonitorClass();
