export type CameraSource = "virtual" | "hardware";

export type HardwareAdapterConfig = {
  streamUrl: string;
  commandUrl: string;
  maxPanDegrees: number;
  maxTiltDegrees: number;
  maxRateDegreesPerSecond: number;
};

export const DEFAULT_HARDWARE_CONFIG: HardwareAdapterConfig = {
  streamUrl: "",
  commandUrl: "",
  maxPanDegrees: 12,
  maxTiltDegrees: 8,
  maxRateDegreesPerSecond: 10,
};

export function validateHardwareConfig(config: HardwareAdapterConfig) {
  const issues: string[] = [];
  const checkUrl = (value: string, label: string) => {
    if (!value.trim()) return;
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol)) issues.push(`${label} must use http or https.`);
    } catch {
      issues.push(`${label} is not a valid URL.`);
    }
  };
  checkUrl(config.streamUrl, "Camera stream URL");
  checkUrl(config.commandUrl, "Pan-tilt bridge URL");
  if (config.maxPanDegrees <= 0 || config.maxPanDegrees > 180) issues.push("Pan limit must be between 0 and 180 degrees.");
  if (config.maxTiltDegrees <= 0 || config.maxTiltDegrees > 90) issues.push("Tilt limit must be between 0 and 90 degrees.");
  if (config.maxRateDegreesPerSecond <= 0 || config.maxRateDegreesPerSecond > 90) issues.push("Maximum slew rate must be between 0 and 90 degrees per second.");
  return issues;
}

export function clampHardwareCommand(command: { pan: number; tilt: number; rate: number }, config: HardwareAdapterConfig) {
  return {
    pan: Math.min(config.maxPanDegrees, Math.max(-config.maxPanDegrees, command.pan)),
    tilt: Math.min(config.maxTiltDegrees, Math.max(-config.maxTiltDegrees, command.tilt)),
    rate: Math.min(config.maxRateDegreesPerSecond, Math.max(0, command.rate)),
  };
}
