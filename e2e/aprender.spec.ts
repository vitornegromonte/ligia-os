import { test, expect, type Page } from "@playwright/test";

/**
 * Fluxos autenticados da área de aprendizado.
 *
 * Exigem um usuário de teste no Supabase do ligia-os, que ainda não temos.
 * Defina E2E_EMAIL e E2E_SENHA para que rodem; sem isso são pulados, em vez
 * de falharem e virarem ruído permanente no CI.
 */
const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_SENHA;

test.skip(!EMAIL || !SENHA, "defina E2E_EMAIL e E2E_SENHA para rodar os fluxos com sessão");

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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trilha");
  await expect(page.getByRole("progressbar", { name: /conceitos concluídos/ })).toBeVisible();
  await expect(page.locator("[data-concept]")).toHaveCount(29);
});

test("conceito sem pré-requisito está liberado; com pré-requisito, trancado", async ({ page }) => {
  await page.goto("/aprender");
  await expect(page.locator('[data-concept="algebra-linear-basica"]')).toHaveAttribute("data-state", "available");
  await expect(page.locator('[data-concept="gradiente"]')).toHaveAttribute("data-state", "locked");
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
  await page.goto("/aprender/c/algebra-linear-basica");
  await page.getByRole("button", { name: /Marcar como concluído/ }).click();
  await page.goto("/aprender/c/calculo-vetorial");
  await page.getByRole("button", { name: /Marcar como concluído/ }).click();

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
