import { networkMonitor } from "./NetworkMonitor";
import { pushChanges } from "./SyncPush";
import { getQueueCount } from "./SyncQueue";
import type { ConvexReactClient } from "convex/react";
import type { SyncStatus } from "./types";

type SyncListener = (status: SyncStatus) => void;

class SyncServiceClass {
  private convex: ConvexReactClient | null = null;
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = {
    state: "idle",
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  };
  private networkUnsubscribe: (() => void) | null = null;

  initialize(convex: ConvexReactClient) {
    this.convex = convex;

    networkMonitor.start();
    this.networkUnsubscribe = networkMonitor.subscribe(
      this.handleNetworkChange.bind(this)
    );
  }

  destroy() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    networkMonitor.stop();
    this.convex = null;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async sync(): Promise<void> {
    if (!this.convex || !networkMonitor.getIsOnline()) {
      return;
    }

    if (this.status.state === "syncing") {
      return;
    }

    this.updateStatus({ state: "syncing", error: null });

    try {
      const pushResult = await pushChanges(this.convex);
      if (!pushResult.success) {
        this.updateStatus({
          state: "error",
          error: pushResult.errors.join(", "),
        });
        return;
      }

      const pendingCount = await getQueueCount();
      this.updateStatus({
        state: "idle",
        pendingCount,
        lastSyncAt: new Date(),
        error: null,
      });
    } catch (error) {
      this.updateStatus({
        state: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline) {
      this.sync();
    }
  }

  private updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial };
    this.listeners.forEach((listener) => listener(this.status));
  }

  async updatePendingCount() {
    const count = await getQueueCount();
    this.updateStatus({ pendingCount: count });
  }
}

export const syncService = new SyncServiceClass();
