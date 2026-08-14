import type { SuiteApi } from "@daprod/ipc";

declare global {
  interface Window {
    /** Esposto dal preload. È l'unica porta verso lo shell. */
    daprod: SuiteApi;
  }
}

export {};
