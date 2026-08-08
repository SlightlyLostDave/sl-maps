"use client";

import type mapboxgl from "mapbox-gl";
import { CATEGORY_SHAPES, type CategoryShape } from "./categoryStyle";

const ICON_SIZE = 32;

function tracePath(ctx: CanvasRenderingContext2D, shape: CategoryShape) {
  const c = ICON_SIZE / 2;
  ctx.beginPath();
  switch (shape) {
    case "circle":
    case "hollow": {
      ctx.arc(c, c, ICON_SIZE * 0.4, 0, Math.PI * 2);
      break;
    }
    case "square": {
      const r = ICON_SIZE * 0.28;
      ctx.rect(c - r, c - r, r * 2, r * 2);
      break;
    }
    case "diamond":
    case "pentagon":
    case "triangle": {
      const sides = shape === "diamond" ? 4 : shape === "pentagon" ? 5 : 3;
      const r = shape === "triangle" ? ICON_SIZE * 0.42 : ICON_SIZE * 0.4;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
        const x = c + r * Math.cos(angle);
        const y = c + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
  }
}

function drawShapeIcon(shape: CategoryShape): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  tracePath(ctx, shape);

  if (shape === "hollow") {
    ctx.lineWidth = ICON_SIZE * 0.16;
    ctx.stroke();
  } else {
    ctx.fill();
  }

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

export function iconName(shape: CategoryShape) {
  return `shape-${shape}`;
}

// SDF images so `icon-color` can tint them per category at render time
// instead of needing one baked image per category/color combination.
export function registerShapeIcons(map: mapboxgl.Map) {
  for (const shape of CATEGORY_SHAPES) {
    const name = iconName(shape);
    if (map.hasImage(name)) continue;
    const { width, height, data } = drawShapeIcon(shape);
    map.addImage(name, { width, height, data }, { sdf: true });
  }
}
