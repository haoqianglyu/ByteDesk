export type WindowRect = { left: number; top: number; width: number; height: number };
export type DesktopBounds = { left: number; top: number; right: number; bottom: number };
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const minimum = { width: 560, height: 320 };

export function fitWindow(rect: WindowRect, bounds: DesktopBounds): WindowRect {
 const width = clamp(rect.width, Math.min(minimum.width, bounds.right - bounds.left), bounds.right - bounds.left);
 const height = clamp(rect.height, Math.min(minimum.height, bounds.bottom - bounds.top), bounds.bottom - bounds.top);
 return { width, height, left: clamp(rect.left, bounds.left, bounds.right - width), top: clamp(rect.top, bounds.top, bounds.bottom - height) };
}

// Resize only the chosen edges, keeping the opposite edges anchored.
export function resizeWindow(rect: WindowRect, edge: ResizeEdge, dx: number, dy: number, bounds: DesktopBounds): WindowRect {
 let { left, top, width, height } = rect;
 const right = left + width, bottom = top + height;
 const minWidth = Math.min(minimum.width, bounds.right - bounds.left);
 const minHeight = Math.min(minimum.height, bounds.bottom - bounds.top);
 if (edge.includes('w')) { left = clamp(left + dx, bounds.left, right - minWidth); width = right - left; }
 if (edge.includes('e')) width = clamp(width + dx, minWidth, bounds.right - left);
 if (edge.includes('n')) { top = clamp(top + dy, bounds.top, bottom - minHeight); height = bottom - top; }
 if (edge.includes('s')) height = clamp(height + dy, minHeight, bounds.bottom - top);
 return { left, top, width, height };
}
