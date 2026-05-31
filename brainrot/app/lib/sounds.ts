"use client";
import { sound } from "@/lib/sound";

export function correctSound() { sound.correct(); }
export function wrongSound() { sound.wrong(); }
export function completionSound() { sound.win(); }
export function tickSound() { sound.tick(); }
export function dingSound() { sound.ding(); } 
//jdshud
