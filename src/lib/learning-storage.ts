// Authenticated learning state never adopts unowned legacy/preview data.
let account: string | null = null;
let revision = 0;
export function setLearningAccount(userId: string | null): void {
  if (account !== userId) { account = userId; revision += 1; }
}
export function learningIdentity() { return { account, revision }; }
export function learningKey(key: string): string {
  return account ? `${key}:account:${encodeURIComponent(account)}` : key;
}
export const learningStorage = {
  getItem(key: string): string | null { return localStorage.getItem(learningKey(key)); },
  setItem(key: string, value: string): void { localStorage.setItem(learningKey(key), value); },
  removeItem(key: string): void { localStorage.removeItem(learningKey(key)); },
};
