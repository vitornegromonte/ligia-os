import { test, expect } from "@playwright/test";

/**
 * O que dá para verificar sem sessão. Os fluxos autenticados estão em
 * aprender.spec.ts e dependem de um usuário de teste no Supabase.
 */
test("a landing carrega", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Ligia/i);
});

test("a área de aprendizado exige sessão", async ({ page }) => {
  await page.goto("/aprender");
  await expect(page).toHaveURL(/\/login$/);
});

test("o login pede email e senha", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/senha/i)).toBeVisible();
});

test("endereço desconhecido não devolve tela em branco", async ({ page }) => {
  // Antes não havia rota `*`: o app renderizava nada. Como a rota 404 vive
  // dentro do Layout protegido, sem sessão ela redireciona ao login — que já
  // é melhor do que a tela vazia.
  await page.goto("/rota-que-nao-existe");
  await expect(page).toHaveURL(/\/login$/);
});
