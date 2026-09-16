import { renderHook, act } from "@testing-library/react";
import { expect, test, describe } from "vitest";
import { useSafeSetup } from "./useSafeSetup";

describe("useSafeSetup Hook", () => {
  test("initializes with default values including a default PC", () => {
    const { result } = renderHook(() => useSafeSetup());
    
    expect(result.current.setup.pcs).toHaveLength(1);
    expect(result.current.setup.pcs[0].name).toBe("Thane");
    expect(result.current.setup.allies).toHaveLength(0);
    expect(result.current.setup.setting).toBe("");
  });

  test("addPC increases PC count and initializes values", () => {
    const { result } = renderHook(() => useSafeSetup());
    
    act(() => {
      result.current.addPC();
    });
    
    expect(result.current.setup.pcs).toHaveLength(2);
    expect(result.current.setup.pcs[1].name).toBe("New Hero");
    expect(result.current.setup.pcs[1].className).toBe("Fighter");
  });

  test("removePC decreases PC count", () => {
    const { result } = renderHook(() => useSafeSetup());
    const firstId = result.current.setup.pcs[0].id;
    
    act(() => {
      result.current.removePC(firstId);
    });
    
    expect(result.current.setup.pcs).toHaveLength(0);
  });

  test("updatePC modifies specific PC values", () => {
    const { result } = renderHook(() => useSafeSetup());
    const firstId = result.current.setup.pcs[0].id;
    
    act(() => {
      result.current.updatePC(firstId, { name: "Updated Name", level: 10 });
    });
    
    expect(result.current.setup.pcs[0].name).toBe("Updated Name");
    expect(result.current.setup.pcs[0].level).toBe(10);
  });

  test("addAlly increases ally count", () => {
    const { result } = renderHook(() => useSafeSetup());
    
    act(() => {
      result.current.addAlly();
    });
    
    expect(result.current.setup.allies).toHaveLength(1);
    expect(result.current.setup.allies[0].name).toBe("Allied Force");
  });

  test("resilient mapping: ensure setup object maintains array integrity", () => {
    const { result } = renderHook(() => useSafeSetup());
    
    // Manually breaking setup via setSetup (simulating malformed API response)
    act(() => {
      result.current.setSetup({
        ...result.current.setup,
        pcs: undefined as any,
        allies: null as any
      });
    });

    // The hook itself doesn't automatically fix the state if forced externally with 'any',
    // but our view layer uses (pcs ?? []) which is the final safety net.
    // However, useSafeSetup logic (like addPC) should handle these gracefully if they occur.
    
    act(() => {
      result.current.addPC();
    });

    expect(result.current.setup.pcs).toHaveLength(1);
  });
});
