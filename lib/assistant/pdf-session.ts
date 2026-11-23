// A page registers its viewport while mounted. The root tutor owns the connection.
type PdfSessionView = {
  documentId: string;
  title: string;
  page: number;
  total: number;
  renderKey: string | null;
  capture: (previous:string) => {signature:string;data:string} | null;
  navigate: (page:number) => void;
};
let current: PdfSessionView | null = null;
const listeners = new Set<() => void>();

export function getAssistantPdf() { return current; }
export function setAssistantPdf(view: PdfSessionView | null) {
  current = view;
  for (const listener of listeners) listener();
}
export async function navigateAssistantPdf(page:number) {
  const view = current;
  if (!view || page < 1 || page > view.total) return false;
  if (view.page === page && view.renderKey) return true;
  return new Promise<boolean>(resolve => {
    const timer = window.setTimeout(() => finish(false),7000);
    function finish(success:boolean) {
      window.clearTimeout(timer);
      listeners.delete(update);
      resolve(success);
    }
    function update() {
      if (!current || current.documentId !== view!.documentId) finish(false);
      else if (current.page === page && current.renderKey) finish(true);
    }
    listeners.add(update);
    view.navigate(page);
  });
}
