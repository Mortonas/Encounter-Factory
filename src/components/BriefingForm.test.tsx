import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BriefingForm } from "./BriefingForm";

describe("BriefingForm public intake payload", () => {
  it("collects clientName and submits the briefing for operator review", async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);

    render(<BriefingForm onComplete={onComplete} />);

    fireEvent.change(screen.getByPlaceholderText("Enter Client Name..."), {
      target: { value: "Mira Vale" }
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Session Name..."), {
      target: { value: "Moon Gate" }
    });
    fireEvent.change(screen.getByPlaceholderText("Where does this take place?"), {
      target: { value: "A ruined observatory" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        clientName: "Mira Vale",
        data: expect.objectContaining({
          sessionName: "Moon Gate",
          setting: "A ruined observatory"
        })
      }));
    });
    expect(screen.getByText(/pending operator review/i)).toBeInTheDocument();
  });
});
