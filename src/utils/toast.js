export const toastState = {
  set: () => {},
  close: () => {}
};

export function showToast(message, type = "success") {
  toastState.set(message, type);
}