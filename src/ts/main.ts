import '../styles/main.css';
import { Timer } from './timer';
import type { TimerMode } from './timer';
import { TaskManager } from './taskManager';

// Elements
const timerTime = document.getElementById('timerTime') as HTMLDivElement;
const timerTimeInput = document.getElementById('timerTimeInput') as HTMLInputElement;
const timerMode = document.getElementById('timerMode') as HTMLDivElement;
const progressCircle = document.getElementById('progressCircle') as unknown as SVGCircleElement;

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const startLabel = document.getElementById('startLabel') as HTMLSpanElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const skipBtn = document.getElementById('skipBtn') as HTMLButtonElement;
const taskInput = document.getElementById('taskInput') as HTMLInputElement;
const currentSessionDurationDisplay = document.getElementById('currentSessionDuration') as HTMLDivElement;
const soundToggle = document.getElementById('soundToggle') as HTMLButtonElement;
const modeButtons = document.querySelectorAll('.mode-btn');

// Modal Elements
const customModal = document.getElementById('customModal') as HTMLDivElement;
const modalTitle = document.getElementById('modalTitle') as HTMLHeadingElement;
const modalMessage = document.getElementById('modalMessage') as HTMLParagraphElement;
const modalConfirm = document.getElementById('modalConfirm') as HTMLButtonElement;
const modalCancel = document.getElementById('modalCancel') as HTMLButtonElement;
const modalClose = document.getElementById('modalClose') as HTMLButtonElement;

// State
const timer = new Timer();
const taskManager = new TaskManager();
let isSoundEnabled = true;

// Audio
const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// Initialize
function init() {
  taskInput.value = taskManager.getTask();
  updateDisplay(timer.getSecondsRemaining(), timer.getMode());
  updateProgress(1);
  updateControls();
  setActiveTab(timer.getMode());
  updateSessionDurationDisplay();
  
  // Update theme based on initial mode
  updateTheme(timer.getMode());
}

// UI Updates
function updateDisplay(seconds: number, mode: TimerMode) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  timerTime.textContent = timeString;
  timerTimeInput.value = timeString;
  document.title = `${timeString} - LockIn`;

  const modeLabels: Record<TimerMode, string> = {
    work: 'Focus Session',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
  };
  timerMode.textContent = modeLabels[mode];
}

function updateProgress(ratio: number) {
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  progressCircle.style.strokeDashoffset = offset.toString();
}

function updateTheme(mode: TimerMode) {
  document.body.className = mode === 'work' ? '' : `break-${mode === 'shortBreak' ? 'short' : 'long'}`;
}

function updateSessionDurationDisplay() {
  const config = timer.getConfig();
  const mode = timer.getMode();
  const seconds = config[mode];
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (secs === 0) {
    currentSessionDurationDisplay.textContent = `(${mins}m)`;
  } else {
    currentSessionDurationDisplay.textContent = `(${mins}:${secs.toString().padStart(2, '0')})`;
  }
}

function setActiveTab(mode: TimerMode) {
  modeButtons.forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function switchMode(mode: TimerMode) {
  timer.setMode(mode);
  updateProgress(1);
  updateControls();
  setActiveTab(mode);
  updateTheme(mode);
  updateSessionDurationDisplay();
}

function updateControls() {
  const isRunning = timer.isRunning();
  const hasStarted = timer.getSecondsRemaining() < timer.getTotalSeconds();
  
  let iconName = 'play';
  let label = 'Start';

  if (isRunning) {
    iconName = 'pause';
    label = 'Pause';
    timerTimeInput.disabled = true;
  } else {
    timerTimeInput.disabled = false;
    if (hasStarted) {
      iconName = 'play';
      label = 'Resume';
    }
  }

  startBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
  startLabel.textContent = label;
  
  // Re-run Lucide
  (window as any).lucide?.createIcons();
}

// Modal Toggle
function showModal(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    customModal.classList.add('active');

    const cleanup = (result: boolean) => {
      customModal.classList.remove('active');
      modalConfirm.removeEventListener('click', onConfirm);
      modalCancel.removeEventListener('click', onCancel);
      modalClose.removeEventListener('click', onCancel);
      resolve(result);
    };

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);

    modalConfirm.addEventListener('click', onConfirm);
    modalCancel.addEventListener('click', onCancel);
    modalClose.addEventListener('click', onCancel);
  });
}

// Duration Validation & Update
async function handleManualDurationChange() {
  // If running, the input is disabled, but this is a safety check
  if (timer.isRunning()) {
    updateDisplay(timer.getSecondsRemaining(), timer.getMode());
    return;
  }

  const value = timerTimeInput.value;
  const parts = value.split(':');
  
  let totalSeconds = 0;
  if (parts.length === 2) {
    const mins = parseInt(parts[0]);
    const secs = parseInt(parts[1]);
    if (!isNaN(mins) && !isNaN(secs)) {
      totalSeconds = mins * 60 + secs;
    }
  } else {
    const mins = parseInt(value);
    if (!isNaN(mins)) {
      totalSeconds = mins * 60;
    }
  }

  if (totalSeconds <= 0 || totalSeconds > 3600) {
    updateDisplay(timer.getSecondsRemaining(), timer.getMode());
    return;
  }

  // If session has started (is paused), confirm reset
  const hasStarted = timer.getSecondsRemaining() < timer.getTotalSeconds();
  if (hasStarted) {
    const confirmed = await showModal(
      "Adjust Duration?",
      "Do you want to adjust the duration for the current paused session? This will reset your progress."
    );
    if (!confirmed) {
      updateDisplay(timer.getSecondsRemaining(), timer.getMode());
      return;
    }
  }

  const mode = timer.getMode();
  const configUpdate: any = {};
  configUpdate[mode] = totalSeconds;
  
  timer.updateConfig(configUpdate);
  updateDisplay(timer.getSecondsRemaining(), mode);
  updateProgress(1);
  updateSessionDurationDisplay();
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
  
  if (mode === 'work') {
    switchMode('shortBreak');
  } else {
    switchMode('work');
  }
};

startBtn.addEventListener('click', () => {
  if (timer.isRunning()) {
    timer.stop();
  } else {
    timer.start();
  }
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

timerTimeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    timerTimeInput.blur();
  }
});

timerTimeInput.addEventListener('blur', () => {
  handleManualDurationChange();
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
