// Coordinates use the displayed page, with y increasing downwards.
export interface TextBox { x: number; y: number; width: number; height: number; text: string }
type Cell = { x: number; end: number; text: string };

export function pdfLayout(boxes: TextBox[]) {
  const lines: { y: number; h: number; cells: Cell[]; boxes: TextBox[] }[] = [];
  for (const b of boxes.filter(b => b.text.trim()).sort((a,b) => a.y-b.y || a.x-b.x)) {
    const last = lines.at(-1);
    if (last && Math.abs(last.y-b.y) <= Math.max(2, Math.min(last.h,b.height)*0.45)) last.boxes.push(b);
    else lines.push({y:b.y,h:b.height,cells:[],boxes:[b]});
  }
  for (const line of lines) {
    for (const b of line.boxes.sort((a,b) => a.x-b.x)) {
      const cell = line.cells.at(-1);
      const gap = cell ? b.x-cell.end : Infinity;
      if (!cell || gap > Math.max(8, line.h*1.6)) {
        line.cells.push({x:b.x,end:b.x+b.width,text:b.text});
      } else {
        const insideCluster = /^[\p{M}\u200c\u200d]/u.test(b.text) || /[্\u200c\u200d]$/u.test(cell.text);
        if (!insideCluster && gap > line.h*0.15 && !/\s$/.test(cell.text)) cell.text += " ";
        cell.text += b.text;
        cell.end = Math.max(cell.end,b.x+b.width);
      }
    }
  }
  let rows = lines.map(line => line.cells.map(c => c.text.trim().normalize("NFC")));
  const split = lines.filter(l => l.cells.length >= 2);
  const columns = rows.reduce((n,row) => Math.max(n,row.length),0);
  const two = split.filter(l => l.cells.length === 2);
  const prose = two.length >= 2 && two.length === split.length &&
    two.filter(l => l.cells.some(c => c.text.trim().split(/\s+/).length >= 5)).length >= two.length/2;
  const kind = split.length < 2 ? "text" : prose ? "columns" : "table";
  if (kind === "table") {
    const reference = lines.find(l => l.cells.length === columns)!;
    rows = lines.map((line, i) => {
      if (line.cells.length === columns) return rows[i];
      const aligned = Array<string>(columns).fill("");
      let previous = -1;
      for (const cell of line.cells) {
        let nearest = 0;
        reference.cells.forEach((anchor, j) => {
          if (Math.abs(anchor.x-cell.x) < Math.abs(reference.cells[nearest].x-cell.x)) nearest = j;
        });
        if (nearest <= previous) return rows[i];
        aligned[nearest] = cell.text.trim().normalize("NFC");
        previous = nearest;
      }
      return aligned;
    });
  }
  let text = rows.map(r => r.join("\t")).join("\n");
  if (kind === "columns") {
    const starts = two.map(l => l.cells[1].x).sort((a,b)=>a-b);
    const boundary = starts[Math.floor(starts.length/2)];
    const blocks: string[] = [], left: string[] = [], right: string[] = [];
    const flush = () => { blocks.push(...left.splice(0), ...right.splice(0)); };
    for (const line of lines) {
      if (line.cells.length === 1 && line.cells[0].x < boundary-line.h && line.cells[0].end > boundary) {
        flush(); blocks.push(line.cells[0].text);
      } else {
        for (const cell of line.cells) (cell.x < boundary-line.h ? left : right).push(cell.text);
      }
    }
    flush(); text = blocks.join("\n");
  }
  return {text:text.normalize("NFC").trim(), rows, columns, kind} as const;
}

export function pdfTextBoxes(items: unknown[], transform = [1,0,0,-1,0,0]): TextBox[] {
  const [a,b,c,d,e,f] = transform;
  return items.flatMap(value => {
    const item = value as {str?:string; width?:number; height?:number; transform?:number[]};
    if (!item?.str || !item.transform) return [];
    const [, , , , x,y] = item.transform;
    return [{text:item.str,x:a*x+c*y+e,y:b*x+d*y+f,width:Math.abs(item.width || 0),
      height:Math.max(1,Math.abs(item.height || item.transform[3]))}];
  });
}
