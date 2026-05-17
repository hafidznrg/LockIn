import '../styles/main.css';
import { Timer } from './timer';
import type { TimerMode } from './timer';
import { TaskManager } from './taskManager';
import { TodoManager } from './todoManager';

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
const notificationToggle = document.getElementById('notificationToggle') as HTMLButtonElement;
const modeButtons = document.querySelectorAll('.mode-btn');

// Todo Elements
const newTodoInput = document.getElementById('newTodoInput') as HTMLInputElement;
const addTodoBtn = document.getElementById('addTodoBtn') as HTMLButtonElement;
const todoList = document.getElementById('todoList') as HTMLUListElement;
const todoCount = document.getElementById('todoCount') as HTMLSpanElement;

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
const todoManager = new TodoManager();
let isSoundEnabled = true;
let isNotificationEnabled = 'Notification' in window && Notification.permission === 'granted';
let draggedId: string | null = null;

function updateNotificationButton() {
  if (!notificationToggle) return;
  const iconName = isNotificationEnabled ? 'bell' : 'bell-off';
  notificationToggle.innerHTML = `<i data-lucide="${iconName}"></i>`;
  (window as any).lucide?.createIcons();
}

function sendNotification(title: string, body: string) {
  if (!isNotificationEnabled) return;
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.svg'
      });
    }
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

// Audio state and context
let audioCtx: AudioContext | null = null;
const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch((err) => console.error('Failed to resume AudioContext:', err));
  }
}

// Function to play a beautifully synthesized bell chime using Web Audio API (highly reliable, offline, bypasses CORS/autoplay blocks)
function playSynthesizedChime() {
  try {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    
    // An upbeat, cheerful ascending major-pentatonic melody:
    // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), G5 (783.99), C6 (1046.50), E6 (1318.51)
    const melody = [
      { freq: 523.25, time: 0.0, volume: 0.15, decay: 0.6 },
      { freq: 659.25, time: 0.12, volume: 0.15, decay: 0.6 },
      { freq: 783.99, time: 0.24, volume: 0.15, decay: 0.6 },
      { freq: 1046.50, time: 0.36, volume: 0.2, decay: 0.8 },
      { freq: 783.99, time: 0.50, volume: 0.15, decay: 0.6 },
      { freq: 1046.50, time: 0.62, volume: 0.2, decay: 0.8 },
      { freq: 1318.51, time: 0.74, volume: 0.25, decay: 2.2 } // Long triumphant final bell
    ];
    
    melody.forEach((note) => {
      if (!audioCtx) return;
      
      const playAt = now + note.time;
      
      // 1. Fundamental frequency oscillator
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(note.freq, playAt);
      
      // Envelope for Fundamental
      gain1.gain.setValueAtTime(0, playAt);
      gain1.gain.linearRampToValueAtTime(note.volume, playAt + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.0001, playAt + note.decay);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      osc1.start(playAt);
      osc1.stop(playAt + note.decay);

      // 2. Harmonic frequency oscillator (Octave higher, subtle metallic chime texture)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(note.freq * 2, playAt);
      
      // Envelope for Harmonic (decays faster and is quieter)
      gain2.gain.setValueAtTime(0, playAt);
      gain2.gain.linearRampToValueAtTime(note.volume * 0.25, playAt + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, playAt + (note.decay * 0.6));
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc2.start(playAt);
      osc2.stop(playAt + (note.decay * 0.6));
    });
  } catch (error) {
    console.error('Failed to play synthesized chime:', error);
  }
}

// Play the chime (remote MP3 with synthesized fallback)
function playChime() {
  if (!isSoundEnabled) return;
  
  initAudioContext();
  
  chime.play()
    .then(() => {
      console.log('Chime played successfully via MP3 URL');
    })
    .catch((error) => {
      console.warn('MP3 playback blocked or failed. Falling back to synthesized Web Audio chime.', error);
      playSynthesizedChime();
    });
}

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

  // Update notification toggle visual state
  updateNotificationButton();

  // Preload chime audio
  chime.load();
  
  // Render Todos
  renderTodos();
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updateTodoCount() {
  const todos = todoManager.getTodos();
  const completedCount = todos.filter(t => t.completed).length;
  if (todoCount) {
    todoCount.textContent = `${completedCount}/${todos.length}`;
  }
}

function renderTodos() {
  if (!todoList) return;
  
  const todos = todoManager.getTodos();
  todoList.innerHTML = '';
  
  updateTodoCount();
  
  if (todos.length === 0) {
    todoList.innerHTML = '<li class="todo-empty">No tasks yet. Add one to start locking in!</li>';
    return;
  }
  
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.setAttribute('draggable', 'true');
    li.setAttribute('data-id', todo.id);
    
    li.innerHTML = `
      <div class="todo-drag-handle" title="Drag to reorder">
        <i data-lucide="grip-vertical"></i>
      </div>
      <div class="todo-checkbox" data-id="${todo.id}">
        <i data-lucide="check"></i>
      </div>
      <span class="todo-text"><span class="todo-text-inner">${escapeHtml(todo.text)}</span></span>
      <button class="todo-delete-btn" data-id="${todo.id}" title="Delete Task">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    
    // Drag and Drop events
    li.addEventListener('dragstart', (e) => {
      draggedId = todo.id;
      li.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', todo.id);
      }
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      
      if (draggedId) {
        const orderedIds = Array.from(todoList.querySelectorAll('.todo-item'))
          .map(item => item.getAttribute('data-id'))
          .filter(Boolean) as string[];
          
        todoManager.reorderTodos(orderedIds, draggedId);
        draggedId = null;
        renderTodos();
      }
    });
    
    todoList.appendChild(li);
  });
  
  // Re-initialize icons
  (window as any).lucide?.createIcons();
  
  // Attach event listeners
  document.querySelectorAll('.todo-checkbox').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        todoManager.toggleTodo(id);
        renderTodos();
      }
    });
  });
  
  document.querySelectorAll('.todo-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        todoManager.deleteTodo(id);
        renderTodos();
      }
    });
  });
}

function handleAddTodo() {
  const text = newTodoInput.value.trim();
  if (text) {
    todoManager.addTodo(text);
    newTodoInput.value = '';
    renderTodos();
  }
}

// UI Updates
function updateDisplay(seconds: number, mode: TimerMode) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  timerTime.textContent = timeString;
  timerTimeInput.value = timeString;
  if (timer.isRunning()) {
    document.title = `LockIn - (${timeString})`;
  } else {
    document.title = 'LockIn - Focus in Style';
  }

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
  
  // Update title immediately when status changes
  updateDisplay(timer.getSecondsRemaining(), timer.getMode());
  
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
    playChime();
  }
  
  if (isNotificationEnabled) {
    if (mode === 'work') {
      sendNotification("Focus Session Finished! 🌟", "Time to take a beautiful short break. You earned it!");
    } else if (mode === 'shortBreak') {
      sendNotification("Break Over! 🚀", "Time to lock in and get back to focus.");
    } else if (mode === 'longBreak') {
      sendNotification("Long Break Over! ☕", "Let's lock in for another focus session.");
    }
  }
  
  if (mode === 'work') {
    switchMode('shortBreak');
  } else {
    switchMode('work');
  }
};

startBtn.addEventListener('click', () => {
  initAudioContext();
  if (timer.isRunning()) {
    timer.stop();
  } else {
    timer.start();
  }
  updateControls();
});

resetBtn.addEventListener('click', () => {
  initAudioContext();
  timer.reset();
  updateProgress(1);
  updateControls();
});

skipBtn.addEventListener('click', () => {
  initAudioContext();
  const currentMode = timer.getMode();
  const nextMode: TimerMode = currentMode === 'work' ? 'shortBreak' : 'work';
  
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

if (addTodoBtn) {
  addTodoBtn.addEventListener('click', handleAddTodo);
}

if (newTodoInput) {
  newTodoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  });
}

soundToggle.addEventListener('click', () => {
  initAudioContext();
  isSoundEnabled = !isSoundEnabled;
  const iconName = isSoundEnabled ? 'volume-2' : 'volume-x';
  soundToggle.innerHTML = `<i data-lucide="${iconName}"></i>`;
  (window as any).lucide?.createIcons();
  
  // Play preview chime when sound is turned back on to confirm it works & unlock audio context
  if (isSoundEnabled) {
    playChime();
  }
});

notificationToggle.addEventListener('click', async () => {
  initAudioContext(); // Multi-gesture unlock for completeness
  
  if (!('Notification' in window)) {
    showModal(
      "Unsupported Browser",
      "We're sorry, but desktop notifications are not supported by your current browser. Please try Chrome, Safari, Firefox, or Edge."
    );
    return;
  }

  if (Notification.permission === 'denied') {
    showModal(
      "Notifications Blocked",
      "It looks like notifications are blocked. Please enable notifications in your browser's site settings to receive alerts when your sessions end."
    );
    return;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      isNotificationEnabled = true;
      updateNotificationButton();
      sendNotification("LockIn - Notifications Active! 🔔", "We will notify you here when your sessions finish.");
    } else {
      isNotificationEnabled = false;
      updateNotificationButton();
    }
    return;
  }

  if (Notification.permission === 'granted') {
    isNotificationEnabled = !isNotificationEnabled;
    updateNotificationButton();
    if (isNotificationEnabled) {
      sendNotification("LockIn - Notifications Enabled! 🔔", "You will now receive alerts when your sessions end.");
    }
  }
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    initAudioContext();
    const mode = btn.getAttribute('data-mode') as TimerMode;
    switchMode(mode);
  });
});

function getDragAfterElement(container: HTMLUListElement, y: number): HTMLElement | null {
  const draggableElements = Array.from(container.querySelectorAll('.todo-item:not(.dragging)'));
  
  return draggableElements.reduce<{ offset: number; element: HTMLElement | null }>((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child as HTMLElement };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

if (todoList) {
  todoList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = document.querySelector('.todo-item.dragging') as HTMLElement;
    if (!dragging) return;
    
    const afterElement = getDragAfterElement(todoList, e.clientY);
    if (afterElement) {
      if (dragging.nextElementSibling !== afterElement) {
        todoList.insertBefore(dragging, afterElement);
      }
    } else {
      if (todoList.lastElementChild !== dragging) {
        todoList.appendChild(dragging);
      }
    }
  });
}

init();
