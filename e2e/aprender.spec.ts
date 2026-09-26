import { test, expect, type Page } from "@playwright/test";

/**
 * Fluxos autenticados da área de aprendizado.
 *
 * Exigem uma conta no Supabase do ligia-os.
 * Defina E2E_EMAIL e E2E_SENHA para que rodem; sem isso são pulados, em vez
 * de falharem e virarem ruído permanente no CI.
 */
const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_SENHA;

test.skip(!EMAIL || !SENHA, "defina E2E_EMAIL e E2E_SENHA para rodar os fluxos com sessão");
// O trace pode capturar os campos do login; não grave credenciais nos artefatos.
test.use({ trace: "off" });
test.setTimeout(60_000);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/senha/i).fill(SENHA!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/(inicio|aprender)/);
}

test.beforeEach(async ({ page }) => {
  await entrar(page);
});

test("a trilha mostra os seis módulos e o avanço", async ({ page }) => {
  await page.goto("/aprender");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trilha", { timeout: 20_000 });
  await expect(page.getByRole("progressbar", { name: /conceitos concluídos/ })).toBeVisible();
  await expect(page.locator("[data-concept]")).toHaveCount(29);
});

test("os estados dos conceitos respeitam os pré-requisitos já concluídos", async ({ page }) => {
  await page.goto("/aprender");
  const algebra = await page.locator('[data-concept="algebra-linear-basica"]').getAttribute("data-state");
  const calculo = await page.locator('[data-concept="calculo-vetorial"]').getAttribute("data-state");
  const gradiente = await page.locator('[data-concept="gradiente"]').getAttribute("data-state");
  expect(algebra).not.toBe("locked");
  expect(calculo).not.toBe("locked");
  if (gradiente !== "done" && gradiente !== "in-progress") {
    expect(gradiente).toBe(algebra === "done" && calculo === "done" ? "available" : "locked");
  }
});

test("o caminho completo: trilha → lição → prática → código", async ({ page }) => {
  await page.goto("/aprender");
  await page.locator('[data-concept="regressao-linear"]').click();
  await expect(page).toHaveURL(/\/aprender\/c\/regressao-linear$/);

  // O hub reúne tudo numa tela — é o ponto da integração.
  await expect(page.getByRole("heading", { name: "Prática de recuperação" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prática de código" })).toBeVisible();

  await page.getByRole("link", { name: /Começar a prática|Praticar de novo|Revisar agora/ }).click();
  await expect(page).toHaveURL(/\/praticar$/);
  await expect(page.locator(".pr-orientacao")).toBeVisible();

  await page.goBack();
  await page.getByRole("link", { name: /Linear Regression/ }).click();
  await expect(page).toHaveURL(/\/aprender\/codar\/linear_regression$/);
  await expect(page.getByRole("button", { name: /Rodar testes/ })).toBeVisible();
});

test("marcar um conceito destranca quem depende dele", async ({ page }) => {
  for (const id of ["algebra-linear-basica", "calculo-vetorial"]) {
    await page.goto(`/aprender/c/${id}`);
    const marcado = page.getByRole("button", { name: "Desmarcar" });
    const marcar = page.getByRole("button", { name: /Marcar como concluído/ });
    await expect(marcado.or(marcar)).toBeVisible();
    if (await marcar.isVisible()) await marcar.click();
    await expect(marcado).toBeVisible();
  }

  await page.goto("/aprender");
  await expect(page.locator('[data-concept="gradiente"]')).toHaveAttribute("data-state", "available");
});

test("o catálogo de código mostra o que já foi resolvido", async ({ page }) => {
  await page.goto("/aprender/codar");
  await expect(page.getByText(/\d+\/41 resolvidos/)).toBeVisible();
  await page.getByRole("button", { name: "A resolver" }).click();
});

test("endereços antigos de /pratica continuam funcionando", async ({ page }) => {
  await page.goto("/pratica");
  await expect(page).toHaveURL(/\/aprender\/codar$/);
  await page.goto("/pratica/relu");
  await expect(page).toHaveURL(/\/aprender\/codar\/relu$/);
});

test("o nivelamento vai do wizard ao resultado", async ({ page }) => {
  await page.goto("/aprender/nivelamento");
  await page.getByRole("button", { name: /Começar/ }).click();
  // Responde tudo com a última opção ("Não sei"), que é sempre válida:
  // 20 múltiplas escolhas e 4 de leitura de código.
  for (let i = 0; i < 24; i++) {
    await page.locator(".nv-opcao").last().click();
    await page.getByRole("button", { name: i === 23 ? /Ver meu resultado/ : /Avançar/ }).click();
  }
  await expect(page.getByText("Sua matriz de competências")).toBeVisible();
});
