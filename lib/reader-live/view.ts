export interface PdfView {
  canvas: HTMLCanvasElement | null;
  viewport: HTMLDivElement | null;
  page: number;
  renderKey: string | null;
}
export function visiblePageFrame(view: PdfView, previous: string) {
  const { canvas, viewport, renderKey } = view;
  if (!canvas || !viewport || !renderKey || canvas.dataset.renderKey !== renderKey || document.hidden) return null;
  const bounds = canvas.getBoundingClientRect();
  const desk = viewport.getBoundingClientRect();
  const left = Math.max(bounds.left, desk.left, 0);
  const top = Math.max(bounds.top, desk.top, 0);
  const right = Math.min(bounds.right, desk.left + viewport.clientWidth, window.innerWidth);
  const bottom = Math.min(bounds.bottom, desk.top + viewport.clientHeight, window.innerHeight);
  if (right <= left || bottom <= top || !bounds.width || !bounds.height) return null;
  const sx = canvas.width / bounds.width;
  const sy = canvas.height / bounds.height;
  const crop = [Math.round((left - bounds.left) * sx), Math.round((top - bounds.top) * sy),
    Math.max(1, Math.round((right - left) * sx)), Math.max(1, Math.round((bottom - top) * sy))] as const;
  const signature = [renderKey, ...crop].join("/");
  if (signature === previous) return null;
  const scale = Math.min(1, 1280 / Math.max(crop[2], crop[3]));
  const frame = document.createElement("canvas");
  frame.width = Math.max(1, Math.round(crop[2] * scale));
  frame.height = Math.max(1, Math.round(crop[3] * scale));
  const context = frame.getContext("2d");
  if (!context) return null;
  context.drawImage(canvas, ...crop, 0, 0, frame.width, frame.height);
  return { signature, data: frame.toDataURL("image/jpeg", 0.78).split(",")[1] };
}
