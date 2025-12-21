import { useState, useEffect } from "react";
import { networkMonitor } from "../sync/NetworkMonitor";

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(networkMonitor.getIsOnline());

  useEffect(() => {
    return networkMonitor.subscribe(setIsOnline);
  }, []);

  return isOnline;
}
