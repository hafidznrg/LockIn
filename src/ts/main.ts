import '../styles/main.css';
import { Timer } from './timer';
import type { TimerMode } from './timer';
import { TaskManager } from './taskManager';

// Elements
const timerTime = document.getElementById('timerTime') as HTMLDivElement;
const timerMode = document.getElementById('timerMode') as HTMLDivElement;
const progressCircle = document.getElementById('progressCircle') as unknown as SVGCircleElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const startIcon = document.getElementById('startIcon') as HTMLElement;
const startText = document.getElementById('startText') as HTMLSpanElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const skipBtn = document.getElementById('skipBtn') as HTMLButtonElement;
const taskInput = document.getElementById('taskInput') as HTMLInputElement;

const workDurationInput = document.getElementById('workDuration') as HTMLInputElement;
const shortDurationInput = document.getElementById('shortDuration') as HTMLInputElement;
const longDurationInput = document.getElementById('longDuration') as HTMLInputElement;

const soundToggle = document.getElementById('soundToggle') as HTMLButtonElement;
const modeButtons = document.querySelectorAll('.mode-tabs .btn');

// State
const timer = new Timer();
const taskManager = new TaskManager();
let isSoundEnabled = true;

// Audio (Gentle chime)
const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// Initialize
function init() {
  taskInput.value = taskManager.getTask();
  updateDisplay(timer.getSecondsRemaining(), timer.getMode());
  updateProgress(1); // Full circle at start
  updateControls();
  setActiveTab(timer.getMode());
}

// UI Updates
function updateDisplay(seconds: number, mode: TimerMode) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  timerTime.textContent = timeString;
  document.title = `${timeString} - LockIn`;

  const modeLabels: Record<TimerMode, string> = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
  };
  timerMode.textContent = modeLabels[mode];

  // Update Body class for theme
  document.body.className = mode === 'work' ? '' : `break-${mode === 'shortBreak' ? 'short' : 'long'}`;
}

function updateProgress(ratio: number) {
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  progressCircle.style.strokeDashoffset = offset.toString();
}

function setActiveTab(mode: TimerMode) {
  modeButtons.forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-secondary');
    } else {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
  });
}

function switchMode(mode: TimerMode) {
  timer.setMode(mode);
  updateProgress(1);
  updateControls();
  setActiveTab(mode);
}

function updateControls() {
  const isRunning = timer.isRunning();
  const hasStarted = timer.getSecondsRemaining() < timer.getTotalSeconds();
  
  let iconName = 'play';
  let text = 'Start';

  if (isRunning) {
    iconName = 'pause';
    text = 'Pause';
  } else if (hasStarted) {
    iconName = 'play';
    text = 'Resume';
  }

  // Recreate the icon element to ensure Lucide picks up the change
  startBtn.innerHTML = `<i data-lucide="${iconName}" id="startIcon"></i> <span id="startText">${text}</span>`;
  
  // Re-run Lucide for the icon change
  (window as any).lucide?.createIcons();
}

function handleDurationChange() {
  const work = parseInt(workDurationInput.value) * 60;
  const short = parseInt(shortDurationInput.value) * 60;
  const long = parseInt(longDurationInput.value) * 60;
  
  if (isNaN(work) || isNaN(short) || isNaN(long)) return;
  
  timer.updateConfig({
    work,
    shortBreak: short,
    longBreak: long
  });
  
  updateProgress(timer.getSecondsRemaining() / timer.getTotalSeconds());
}

// Events
timer.onTick = (seconds, mode) => {
  updateDisplay(seconds, mode);
  const ratio = seconds / timer.getTotalSeconds();
  updateProgress(ratio);
};

timer.onFinish = (mode) => {
  if (isSoundEnabled) {
    chime.play().catch(() => {});
  }
  
  // Simple auto-next logic
  if (mode === 'work') {
    switchMode('shortBreak');
  } else {
    switchMode('work');
  }
  
  alert(`Time's up! Transitioning to ${timer.getMode()} mode.`);
};

startBtn.addEventListener('click', () => {
  if (timer.isRunning()) {
    timer.stop();
  } else {
    timer.start();
  }
  updateControls();
});

stopBtn.addEventListener('click', () => {
  timer.stop();
  timer.reset();
  updateProgress(1);
  updateControls();
});

resetBtn.addEventListener('click', () => {
  timer.reset();
  updateProgress(1);
  updateControls();
});

skipBtn.addEventListener('click', () => {
  const currentMode = timer.getMode();
  let nextMode: TimerMode = 'work';
  
  if (currentMode === 'work') {
    nextMode = 'shortBreak';
  } else if (currentMode === 'shortBreak') {
    nextMode = 'longBreak';
  } else {
    nextMode = 'work';
  }
  
  switchMode(nextMode);
});

[workDurationInput, shortDurationInput, longDurationInput].forEach(input => {
  input.addEventListener('change', handleDurationChange);
});

taskInput.addEventListener('input', () => {
  taskManager.setTask(taskInput.value);
});

soundToggle.addEventListener('click', () => {
  isSoundEnabled = !isSoundEnabled;
  const iconName = isSoundEnabled ? 'volume-2' : 'volume-x';
  soundToggle.innerHTML = `<i data-lucide="${iconName}"></i>`;
  (window as any).lucide?.createIcons();
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.getAttribute('data-mode') as TimerMode;
    switchMode(mode);
  });
});

init();
