import { logger } from "./logger.js";

export async function trackTime<T>(
  action: () => Promise<T> | T,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await action();
  const end = performance.now();
  logger.info(
    { duration: `${(end - start).toFixed(2)}ms` },
    `${label} initialized`
  );
  return result;
}
