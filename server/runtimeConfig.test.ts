import { describe, expect, it } from "vitest";
import { formatStartupLog, loadRuntimeConfig } from "./runtimeConfig.js";

describe("listener configuration", () => {
  it("defaults local Node execution to loopback port 3000", () => {
    expect(loadRuntimeConfig({})).toEqual({ host: "127.0.0.1", port: 3000 });
  });

  it.each(["127.0.0.1", "localhost", "0.0.0.0"])("accepts supported host %s", host => {
    expect(loadRuntimeConfig({ HOST: host, PORT: "4000" })).toEqual({ host, port: 4000 });
  });

  it.each(["", " 127.0.0.1", "http://127.0.0.1", "::", "*", "/tmp/socket", "192.168.1.5"])("rejects unsafe HOST %j", host => {
    expect(() => loadRuntimeConfig({ HOST: host })).toThrow("HOST");
  });

  it.each(["", "0", "65536", "3.5", "3000x", "-1"])("rejects invalid PORT %j", port => {
    expect(() => loadRuntimeConfig({ PORT: port })).toThrow("PORT");
  });

  it("logs only the effective bind and preview mode", () => {
    const log = formatStartupLog({ host: "127.0.0.1", port: 3000 }, "production");
    expect(log).toBe("[Encounter Factory] listening=http://127.0.0.1:3000 environment=production mode=local-preview");
    expect(log).not.toMatch(/token|secret|operator_id/i);
  });
});
