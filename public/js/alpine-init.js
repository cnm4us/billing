document.addEventListener("alpine:init", () => {
  Alpine.data("confirmDelete", () => ({
    open: false,
    ask() { this.open = true },
    cancel() { this.open = false },
  }));
});
