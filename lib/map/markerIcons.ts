'use client';

import type mapboxgl from 'mapbox-gl';
import type { IconSvgElement } from '@hugeicons/react';
import { FALLBACK_CATEGORY_COLOR } from './categoryStyle';

// Logical (CSS-pixel) pin size — what actually appears on the map once
// mapbox applies `icon-size`. Drawing happens at PIXEL_RATIO x this so the
// baked raster stays crisp at higher zoom levels, same idea as an @2x
// sprite; `pixelRatio` passed to map.addImage tells mapbox to divide back
// down to this logical size.
const WIDTH = 32;
const HEIGHT = 45;
const PIXEL_RATIO = 3;

const HEAD_RADIUS = WIDTH * 0.5;
const HEAD = { x: WIDTH / 2, y: HEAD_RADIUS + 2 };
const TIP = { x: WIDTH / 2, y: HEIGHT - 1 };
const BADGE_RADIUS = WIDTH * 0.4;

// Angle (from the horizontal, canvas convention) of the two points where
// the head circle's outline stops and the taper to the tip begins. Derived
// so the taper sides are true tangent lines from the tip to the head
// circle — the geometry a classic map-pin silhouette is built from — rather
// than an arbitrary cut angle. Kept well below the equator so the arc — the
// part actually drawn as "head" — sweeps the long way around through the
// top of the circle.
const SHOULDER_ANGLE = Math.PI / 2 - Math.acos(HEAD_RADIUS / (TIP.y - HEAD.y));

// A fixed white/dark pair, independent of the light/dark theme CSS
// variables — the badge always needs to read as "white circle" and "dark
// glyph" regardless of which map theme is active.
const BADGE_COLOR = '#fff8ea';
const ICON_INK = '#1c1911';

export const FALLBACK_PIN_NAME = 'pin-fallback';

// Classic teardrop pin: a circular head tapering via two straight tangent
// lines to a point at the bottom, the same construction as a Google-Maps-
// style marker. Traced as a single connected path — start at the right
// shoulder, arc counterclockwise the long way around the top of the circle
// to the left shoulder, line down to the tip, then closePath draws the
// matching tangent line straight back up to the start — so it fills as one
// simple outline instead of two disjoint subpaths. The tip sits at the very
// bottom of the canvas so it lines up with `icon-anchor: 'bottom'` in
// MapView.
function tracePinPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.arc(
    HEAD.x,
    HEAD.y,
    HEAD_RADIUS,
    SHOULDER_ANGLE,
    Math.PI - SHOULDER_ANGLE,
    true,
  );
  ctx.lineTo(TIP.x, TIP.y);
  ctx.closePath();
}

function drawPinBody(ctx: CanvasRenderingContext2D, color: string) {
  tracePinPath(ctx);
  ctx.fillStyle = color;
  ctx.fill();

  // Two-tone flat shading: darken the right half of the pin to fake a
  // simple bevel, without needing hex color math — clip to the traced
  // outline, then fill the right half with translucent black.
  ctx.save();
  tracePinPath(ctx);
  ctx.clip();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(WIDTH / 2, 0, WIDTH / 2, HEIGHT);
  ctx.restore();
}

function drawBadgeCircle(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.arc(HEAD.x, HEAD.y, BADGE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_COLOR;
  ctx.fill();
}

function drawIconGlyph(ctx: CanvasRenderingContext2D, iconSvg: IconSvgElement) {
  // HugeIcons paths are drawn on a 24x24 viewBox; scale down into the
  // badge circle and draw each stroke-based path element.
  const scale = (BADGE_RADIUS * 1.15) / 24;
  ctx.save();
  ctx.translate(HEAD.x - (24 * scale) / 2, HEAD.y - (24 * scale) / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = ICON_INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [tag, attrs] of iconSvg) {
    if (tag !== 'path' || typeof attrs.d !== 'string') continue;
    ctx.lineWidth = attrs.strokeWidth
      ? parseFloat(String(attrs.strokeWidth))
      : 1.5;
    ctx.stroke(new Path2D(attrs.d));
  }
  ctx.restore();
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  color: string,
  iconSvg: IconSvgElement | null,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawPinBody(ctx, color);
  drawBadgeCircle(ctx);
  if (iconSvg) drawIconGlyph(ctx, iconSvg);
}

function createCanvasContext(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * PIXEL_RATIO;
  canvas.height = HEIGHT * PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  // Every draw call below works in logical WIDTH/HEIGHT coordinates; this
  // scale is what actually renders them at PIXEL_RATIO x resolution.
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  return ctx;
}

function getFullImageData(ctx: CanvasRenderingContext2D): ImageData {
  return ctx.getImageData(0, 0, WIDTH * PIXEL_RATIO, HEIGHT * PIXEL_RATIO);
}

export function pinIconName(categoryId: string) {
  return `pin-${categoryId}`;
}

// Fetched once per icon name and cached — every category using the same
// HugeIcons icon shares one in-flight/parsed request.
const iconDataCache = new Map<string, Promise<IconSvgElement>>();

function fetchIconData(iconName: string): Promise<IconSvgElement> {
  let cached = iconDataCache.get(iconName);
  if (!cached) {
    cached = fetch(`/hugeicons/${iconName}.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load icon "${iconName}"`);
      return res.json() as Promise<IconSvgElement>;
    });
    iconDataCache.set(iconName, cached);
  }
  return cached;
}

// Rasterized pins only depend on (icon name, category color) — neither of
// which change within a session — so the pixel data can be reused across
// setStyle() calls (which wipe every mapbox image) without redoing the
// fetch + canvas work, just a cheap re-addImage.
const pinDataCache = new Map<string, ImageData>();

async function buildPinImageData(
  color: string,
  iconName: string | null,
): Promise<ImageData> {
  const ctx = createCanvasContext();
  // A category's stored icon name might not resolve to a real HugeIcons
  // asset (stale/invalid data) — still bake the category-colored pin, just
  // without a glyph, rather than losing the whole pin over a bad icon name.
  const iconSvg = iconName
    ? await fetchIconData(iconName).catch((err) => {
        console.error(`Failed to load icon "${iconName}"`, err);
        return null;
      })
    : null;
  drawPin(ctx, color, iconSvg);
  return getFullImageData(ctx);
}

export function registerFallbackPin(map: mapboxgl.Map) {
  if (map.hasImage(FALLBACK_PIN_NAME)) return;
  const ctx = createCanvasContext();
  drawPin(ctx, FALLBACK_CATEGORY_COLOR, null);
  map.addImage(FALLBACK_PIN_NAME, getFullImageData(ctx), {
    pixelRatio: PIXEL_RATIO,
  });
}

async function ensureCategoryPin(
  map: mapboxgl.Map,
  categoryId: string,
  color: string,
  icon: string | null,
) {
  const name = pinIconName(categoryId);
  if (map.hasImage(name)) return;

  let imageData = pinDataCache.get(categoryId);
  if (!imageData) {
    imageData = await buildPinImageData(color, icon);
    pinDataCache.set(categoryId, imageData);
  }
  if (map.hasImage(name)) return; // re-check after the await
  map.addImage(name, imageData, { pixelRatio: PIXEL_RATIO });
}

export async function registerCategoryIcons(
  map: mapboxgl.Map,
  styles: Map<string, { color: string; icon: string | null }>,
) {
  const tasks: Promise<void>[] = [];
  for (const [categoryId, style] of styles) {
    tasks.push(
      ensureCategoryPin(map, categoryId, style.color, style.icon).catch(
        (err) => {
          console.error(
            `Failed to register marker pin for category ${categoryId}`,
            err,
          );
        },
      ),
    );
  }
  await Promise.all(tasks);
}
