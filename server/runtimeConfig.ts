export interface RuntimeConfig {
  host: string;
  port: number;
}

const HOST_PATTERN = /^(127\.0\.0\.1|localhost|0\.0\.0\.0)$/;

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const rawHost = env.HOST ?? "127.0.0.1";
  const rawPort = env.PORT ?? "3000";
  if (rawHost !== rawHost.trim() || !HOST_PATTERN.test(rawHost)) {
    throw new Error("HOST must be 127.0.0.1, localhost, or the explicit container value 0.0.0.0.");
  }
  if (!/^\d+$/.test(rawPort)) throw new Error("PORT must be an integer from 1 to 65535.");
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535.");
  }
  return { host: rawHost, port };
}

export function formatStartupLog(config: RuntimeConfig, environment = "development"): string {
  return `[Encounter Factory] listening=http://${config.host}:${config.port} environment=${environment} mode=local-preview`;
}
