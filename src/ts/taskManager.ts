export class TaskManager {
  private currentTask: string = '';

  constructor() {
    this.load();
  }

  public getTask(): string {
    return this.currentTask;
  }

  public setTask(task: string) {
    this.currentTask = task;
    this.save();
  }

  private save() {
    localStorage.setItem('lockin_current_task', this.currentTask);
  }

  private load() {
    const saved = localStorage.getItem('lockin_current_task');
    if (saved) {
      this.currentTask = saved;
    }
  }
}
