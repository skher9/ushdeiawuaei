import { SVGProps } from "react";

type G = SVGProps<SVGSVGElement> & { size?: number };
const I = ({ size = 16, ...p }: G) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...p} />
);

export const Bolt = (p: G) => (
  <I {...p}><path d="M9 1L3 9h5l-1 6 6-8H8L9 1Z" fill="currentColor"/></I>
);
export const Flame = (p: G) => (
  <I {...p}><path d="M8 14c3 0 5-2.5 5-5.5 0-2-1-3.5-2.5-4.5.5 1 .5 2-.5 3C10 5 9 3.5 9 2c-1.5 1-3 3.5-3 5.5 0 .8.2 1.5.5 2C5.5 9 5 8 5 7c-1.5 1.5-1.5 3.5 0 5 .8.8 1.8 1.3 3 1.3V14Z" fill="currentColor"/></I>
);
export const Speaker = (p: G) => (
  <I {...p}><path d="M3 6H1v4h2l4 3V3L3 6Zm8.5 2c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4ZM13 8c0-2.8-1.6-5.2-4-6.3v1.5c1.8 1 3 2.9 3 4.8s-1.2 3.8-3 4.8v1.5C11.4 13.2 13 10.8 13 8Z" fill="currentColor"/></I>
);
export const SpeakerOff = (p: G) => (
  <I {...p}><path d="M3 6H1v4h2l4 3V3L3 6ZM14 5l-1.4-1.4L11 5.2 9.4 3.6 8 5l1.6 1.6L8 8.2 9.4 9.6 11 8l1.6 1.6L14 8.2l-1.6-1.6L14 5Z" fill="currentColor"/></I>
);
export const Compass = (p: G) => (
  <I {...p}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M10.5 5.5l-2 4.5-4.5 2 2-4.5 4.5-2Z" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="var(--bg-1)"/></I>
);
export const Play = (p: G) => (
  <I {...p}><path d="M4 3l10 5-10 5V3Z" fill="currentColor"/></I>
);
export const Pause = (p: G) => (
  <I {...p}><rect x="3" y="3" width="3.5" height="10" rx="1" fill="currentColor"/><rect x="9.5" y="3" width="3.5" height="10" rx="1" fill="currentColor"/></I>
);
export const StepForward = (p: G) => (
  <I {...p}><path d="M3 3l8 5-8 5V3Z" fill="currentColor"/><rect x="12" y="3" width="1.5" height="10" rx="0.75" fill="currentColor"/></I>
);
export const Reset = (p: G) => (
  <I {...p}><path d="M3.5 8A4.5 4.5 0 1 1 8 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3.5 4v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Lock = (p: G) => (
  <I {...p}><rect x="3" y="7.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7.5V5.5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.2"/></I>
);
export const Check = (p: G) => (
  <I {...p}><path d="M2.5 8l4 4 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Star = (p: G) => (
  <I {...p}><path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5Z" fill="currentColor"/></I>
);
export const Crown = (p: G) => (
  <I {...p}><path d="M1.5 12.5h13l-2-7-3.5 3.5L8 3 6 9 2.5 5.5l-1 7Z" fill="currentColor"/></I>
);
export const ArrowRight = (p: G) => (
  <I {...p}><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Close = (p: G) => (
  <I {...p}><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></I>
);
export const Sparkle = (p: G) => (
  <I {...p}><path d="M8 1v14M1 8h14M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4"/><path d="M8 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" fill="currentColor"/></I>
);
export const Target = (p: G) => (
  <I {...p}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1" fill="currentColor"/></I>
);
export const Trophy = (p: G) => (
  <I {...p}><path d="M5 1.5h6v7a3 3 0 0 1-6 0V1.5Z" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3.5H3a1.5 1.5 0 0 0 0 3h2M11 3.5h2a1.5 1.5 0 0 1 0 3h-2M8 11.5v2.5M5.5 14h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></I>
);
export const Shield = (p: G) => (
  <I {...p}><path d="M8 1.5L2 4v5c0 3 2.5 5 6 6 3.5-1 6-3 6-6V4L8 1.5Z" stroke="currentColor" strokeWidth="1.2"/></I>
);
export const Live = (p: G) => (
  <I {...p}><circle cx="8" cy="8" r="3" fill="currentColor"/><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/><circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/></I>
);
export const Village = (p: G) => (
  <I {...p}><path d="M2 14h12M3 14V8l3-4h4l3 4v6M6 14v-3h4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Mountain = (p: G) => (
  <I {...p}><path d="M2 14l6-10 6 10H2Zm4.5 0L8 11.5 9.5 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Forest = (p: G) => (
  <I {...p}><path d="M8 2L4 8h3l-1.5 5h5L9 8h3L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Web = (p: G) => (
  <I {...p}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><ellipse cx="8" cy="8" rx="2.5" ry="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 8h13M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.2"/></I>
);
export const Castle = (p: G) => (
  <I {...p}><path d="M3 14V8l5-6 5 6v6H3ZM1 8h2M13 8h2M1 5h2M13 5h2M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Circuit = (p: G) => (
  <I {...p}><path d="M2 8h3m6 0h3M5 8V4m6 4V4M5 4h6M5 12h6M5 12v-4M11 12v-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="4" y="6" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></I>
);
export const ChevronRight = (p: G) => (
  <I {...p}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></I>
);
export const Wave = (p: G) => (
  <I {...p}><path d="M1 8c1-2 2-2 3 0s2 2 3 0 2-2 3 0 2 2 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></I>
);
export const Info = (p: G) => (
  <I {...p}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 7v5M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></I>
);
export const Zap = (p: G) => (
  <I {...p}><path d="M9 1.5L3.5 9H8L7 14.5l5.5-7.5H9L9 1.5Z" fill="currentColor"/></I>
);
