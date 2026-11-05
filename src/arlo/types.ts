export type Session = { token: string; userId: string };

export type Device = {
  deviceId: string;
  deviceName: string;
  deviceType: string; // camera | basestation | arloq | ...
  modelId?: string;
  parentId?: string;
  xCloudId?: string;
  uniqueId?: string;
  properties?: {
    batteryLevel?: number;
    signalStrength?: number;
    connectionState?: string;
    presignedLastImageUrl?: string;
    presignedFullFrameSnapshotUrl?: string;
    lastImageUploaded?: number;
    privacyActive?: boolean;
    [k: string]: unknown;
  };
};

export type LibraryItem = {
  name: string;
  deviceId: string;
  createdDate: string;
  presignedContentUrl?: string;
  presignedThumbnailUrl?: string;
  mediaDurationSecond?: number;
  reason?: string;
  contentType?: string;
};

export type MfaFactor = { factorId: string; factorType: string; displayName?: string };

export class MfaRequired extends Error {
  constructor(
    public factors: MfaFactor[],
    public userId: string,
    public partialToken: string,
  ) {
    super('Two-step verification required');
  }
}
