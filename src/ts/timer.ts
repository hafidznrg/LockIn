export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface TimerConfig {
  work: number;
  shortBreak: number;
  longBreak: number;
}

export class Timer {
  private secondsRemaining: number;
  private mode: TimerMode = 'work';
  private intervalId: number | null = null;
  private config: TimerConfig;

  public onTick: (seconds: number, mode: TimerMode) => void = () => {};
  public onFinish: (mode: TimerMode) => void = () => {};

  constructor(config: TimerConfig = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 }) {
    this.config = config;
    this.secondsRemaining = this.config.work;
  }

  public updateConfig(newConfig: Partial<TimerConfig>) {
    this.config = { ...this.config, ...newConfig };
    // If not running, update current remaining time to match new duration
    if (!this.isRunning()) {
      this.secondsRemaining = this.config[this.mode];
      this.onTick(this.secondsRemaining, this.mode);
    }
  }

  public start() {
    if (this.intervalId) return;
    
    this.intervalId = window.setInterval(() => {
      this.secondsRemaining--;
      this.onTick(this.secondsRemaining, this.mode);

      if (this.secondsRemaining <= 0) {
        this.stop();
        this.onFinish(this.mode);
      }
    }, 1000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public reset() {
    this.stop();
    this.secondsRemaining = this.config[this.mode];
    this.onTick(this.secondsRemaining, this.mode);
  }

  public setMode(mode: TimerMode) {
    this.stop();
    this.mode = mode;
    this.secondsRemaining = this.config[mode];
    this.onTick(this.secondsRemaining, this.mode);
  }

  public getMode(): TimerMode {
    return this.mode;
  }

  public getSecondsRemaining(): number {
    return this.secondsRemaining;
  }

  public getTotalSeconds(): number {
    return this.config[this.mode];
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }
}
