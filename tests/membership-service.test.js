import { expect, it } from "vitest";
import { membershipMessage } from "../src/services/membership.js";

it("names institution and areas in backend required-field errors", () => {
  expect(membershipMessage({ code: "22023", message: "Complete name, discipline and affiliation" }))
    .toBe("Confira os campos obrigatórios: nome, área de atuação e instituição/vínculo.");
});
