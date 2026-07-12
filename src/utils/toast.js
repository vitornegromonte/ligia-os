export const toastState = {
  set: () => {},
  close: () => {}
};

export function showToast(message) {
  toastState.set(message);
}
