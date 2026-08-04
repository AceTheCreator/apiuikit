export function defineOnce(tagName: string, ctor: CustomElementConstructor): void {
  if (customElements.get(tagName)) return;
  customElements.define(tagName, ctor);
}
