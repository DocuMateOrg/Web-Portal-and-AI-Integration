export default function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const amount = bytes / (1024 ** unitIndex);
  const digits = unitIndex === 0 ? 0 : amount >= 10 ? 1 : 2;

  return `${amount.toFixed(digits)} ${units[unitIndex]}`;
}
