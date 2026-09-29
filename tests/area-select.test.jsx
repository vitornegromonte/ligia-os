import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import AreaSelect, { PROFILE_AREAS } from "../src/components/AreaSelect.jsx";

function AreaSelectHarness() {
  const [area, setArea] = useState("");
  return <AreaSelect required value={area} onChange={setArea} />;
}

it.each(PROFILE_AREAS)("allows selecting %s", area => {
  render(<AreaSelectHarness />);
  fireEvent.click(screen.getByRole("button", { name: area }));
  expect(screen.getByRole("button", { name: area })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button").filter(button => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);
});

it("replaces the previous area when another chip is selected", () => {
  render(<AreaSelectHarness />);
  fireEvent.click(screen.getByRole("button", { name: "ML" }));
  fireEvent.click(screen.getByRole("button", { name: "NLP" }));
  expect(screen.getByRole("button", { name: "ML" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "NLP" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button").filter(button => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);
});

it("keeps the required area unselected until a chip is chosen", () => {
  render(<AreaSelectHarness />);
  expect(screen.getAllByRole("button").every(button => button.getAttribute("aria-pressed") === "false")).toBe(true);
  expect(screen.getByText("Selecione uma área.")).toBeInTheDocument();
});
