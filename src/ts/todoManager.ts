export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export class TodoManager {
  private todos: Todo[] = [];
  private readonly storageKey = 'lockin_todos';

  constructor() {
    this.loadTodos();
  }

  private sortTodos() {
    const activeTodos = this.todos.filter(t => !t.completed);
    const completedTodos = this.todos.filter(t => t.completed);
    this.todos = [...activeTodos, ...completedTodos];
  }

  private loadTodos() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.todos = JSON.parse(stored);
        this.sortTodos();
      }
    } catch (e) {
      console.error('Failed to load todos', e);
    }
  }

  private saveTodos() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
    } catch (e) {
      console.error('Failed to save todos', e);
    }
  }

  public getTodos(): Todo[] {
    return this.todos;
  }

  public addTodo(text: string): Todo {
    const newTodo: Todo = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      text,
      completed: false
    };
    this.todos.push(newTodo);
    this.sortTodos();
    this.saveTodos();
    return newTodo;
  }

  public toggleTodo(id: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.sortTodos();
      this.saveTodos();
    }
  }

  public deleteTodo(id: string): void {
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
  }

  public reorderTodos(orderedIds: string[], draggedId: string): void {
    const draggedTodo = this.todos.find(t => t.id === draggedId);
    if (!draggedTodo) return;

    // Create a temporary array ordered by the new visual DOM order
    const idMap = new Map(this.todos.map(t => [t.id, t]));
    const newTodos: Todo[] = [];
    for (const id of orderedIds) {
      const todo = idMap.get(id);
      if (todo) {
        newTodos.push(todo);
      }
    }

    // Determine new completion state based on the dragged item's new visual neighbors
    const draggedIndex = newTodos.findIndex(t => t.id === draggedId);
    if (draggedIndex !== -1) {
      const prevTodo = draggedIndex > 0 ? newTodos[draggedIndex - 1] : null;
      const nextTodo = draggedIndex < newTodos.length - 1 ? newTodos[draggedIndex + 1] : null;

      // If dropped after a completed task, it becomes completed
      if (prevTodo && prevTodo.completed) {
        draggedTodo.completed = true;
      }
      // If dropped before an active task, it becomes active
      else if (nextTodo && !nextTodo.completed) {
        draggedTodo.completed = false;
      }
    }

    // Update the official list
    this.todos = newTodos;
    
    // Always enforce the strict active-first, completed-last sorting structure
    this.sortTodos();
    this.saveTodos();
  }
}

