let openCb = null;

export function registerSearchOpen(cb) {
  openCb = cb;
}

export function openGlobalSearch() {
  if (openCb) openCb();
}