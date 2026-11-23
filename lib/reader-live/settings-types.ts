export interface ReaderBinding {
  credentialId: string;
  modelId: string;
  enabled: boolean;
}

export interface ReaderCredential {
  id: string;
  label: string;
  suffix: string;
  enabled: boolean;
  source: "server" | "managed";
}

export interface ReaderSettings {
  credentials: ReaderCredential[];
  binding: ReaderBinding;
  bindingSource: "server" | "managed";
  canStoreSecrets: boolean;
}
