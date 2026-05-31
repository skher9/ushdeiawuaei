export interface MissionRecord {
  checks: number;
  optimal: number;
  timeLeft?: number;
}

interface State {
  completedMissions: Set<number>;
  records: Record<number, MissionRecord>;
  currentMission: number;
  totalChecks: number;
  audioReady: boolean;
}

const state: State = {
  completedMissions: new Set(),
  records: {},
  currentMission: 0,
  totalChecks: 0,
  audioReady: false,
};

export const GameState = {
  isUnlocked(mission: number): boolean {
    if (mission === 1) return true;
    return state.completedMissions.has(mission - 1);
  },
  isCompleted(mission: number): boolean {
    return state.completedMissions.has(mission);
  },
  complete(mission: number, record: MissionRecord): void {
    state.completedMissions.add(mission);
    state.records[mission] = record;
    state.totalChecks += record.checks;
  },
  getRecord(mission: number): MissionRecord | undefined {
    return state.records[mission];
  },
  setCurrentMission(m: number): void {
    state.currentMission = m;
  },
  getCurrentMission(): number {
    return state.currentMission;
  },
  setAudioReady(v: boolean): void {
    state.audioReady = v;
  },
  isAudioReady(): boolean {
    return state.audioReady;
  },
};
