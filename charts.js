// Helpers for canvas drawing
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // Add readable font for labels
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  return { ctx, width: rect.width, height: rect.height };
}

function getMinMax(points) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p.rate < min) min = p.rate;
    if (p.rate > max) max = p.rate;
  }
  if (min === Infinity) return { min: 0, max: 1 };
  if (min === max) return { min: min * 0.9, max: max * 1.1 };
  
  // Add 10% padding to range
  const pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}

function drawSmoothPath(ctx, points) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.arc(points[0].x, points[0].y, 2, 0, Math.PI * 2);
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 2; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  if (points.length > 2) {
    ctx.quadraticCurveTo(
      points[points.length - 2].x,
      points[points.length - 2].y,
      points[points.length - 1].x,
      points[points.length - 1].y
    );
  } else if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  }
}

export function drawSparkline(canvas, rawPoints) {
  if (!rawPoints || rawPoints.length < 2) return;
  const { ctx, width, height } = setupCanvas(canvas);
  
  const { min, max } = getMinMax(rawPoints);
  const range = max - min;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  const points = rawPoints.map((p, i) => ({
    x: (i / (rawPoints.length - 1)) * width,
    y: paddingY + usableHeight - ((p.rate - min) / range) * usableHeight
  }));

  const isPositive = rawPoints[rawPoints.length - 1].rate >= rawPoints[0].rate;
  const color = isPositive ? '#10B981' : '#EF4444'; // Use light mode tokens mostly

  // Fill Gradient
  ctx.beginPath();
  drawSmoothPath(ctx, points);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
  fillGrad.addColorStop(0, color + '40'); // 25% opacity
  fillGrad.addColorStop(1, color + '00'); // 0% opacity
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Stroke Line
  ctx.beginPath();
  drawSmoothPath(ctx, points);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  // End Dot
  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawHistoryChart(canvas, officialRaw, parallelRaw = []) {
  if (!officialRaw || officialRaw.length < 2) return;
  const { ctx, width, height } = setupCanvas(canvas);
  
  let allPoints = [...officialRaw, ...parallelRaw];
  const { min, max } = getMinMax(allPoints);
  const range = max - min;
  
  // Padding for axes
  const padTop = 20;
  const padBottom = 30; // Room for X axis
  const usableHeight = height - padTop - padBottom;
  
  ctx.clearRect(0, 0, width, height);

  // Y-Axis Grid & Labels
  ctx.strokeStyle = '#E4E4E7';
  ctx.fillStyle = '#71717A';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padTop + (usableHeight * i) / steps;
    const val = max - (range * i) / steps;
    
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    
    ctx.fillText(val.toFixed(2), width - 5, y - 8);
  }

  const startTime = new Date(officialRaw[0].date).getTime();
  const endTime = new Date(officialRaw[officialRaw.length - 1].date).getTime();
  const timeRange = endTime - startTime || 1;

  const mapPoint = (p) => {
    const t = new Date(p.date).getTime();
    return {
      x: ((t - startTime) / timeRange) * width,
      y: padTop + usableHeight - ((p.rate - min) / range) * usableHeight
    };
  };

  const offPoints = officialRaw.map(mapPoint);
  const parPoints = parallelRaw.map(mapPoint);

  // X-Axis Labels (first, mid, last)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  [0, Math.floor(officialRaw.length / 2), officialRaw.length - 1].forEach(idx => {
    const p = offPoints[idx];
    const d = new Date(officialRaw[idx].date);
    const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    ctx.fillText(label, Math.max(15, Math.min(width - 15, p.x)), height - 20);
  });

  // Official Fill
  if (offPoints.length > 1) {
    ctx.beginPath();
    drawSmoothPath(ctx, offPoints);
    ctx.lineTo(offPoints[offPoints.length-1].x, height - padBottom);
    ctx.lineTo(offPoints[0].x, height - padBottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height - padBottom);
    grad.addColorStop(0, '#10B98133');
    grad.addColorStop(1, '#10B98100');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Official Line
  ctx.beginPath();
  drawSmoothPath(ctx, offPoints);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Parallel Line (dashed)
  if (parPoints.length > 0) {
    ctx.beginPath();
    if (parPoints.length === 1) {
      // Just a dot if only 1 data point
      ctx.arc(parPoints[0].x, parPoints[0].y, 4, 0, Math.PI*2);
      ctx.fillStyle = '#09090B';
      ctx.fill();
    } else {
      drawSmoothPath(ctx, parPoints);
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
