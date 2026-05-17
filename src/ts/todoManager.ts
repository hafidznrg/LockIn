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

    // Update the official list
    this.todos = newTodos;
    
    // Always enforce the strict active-first, completed-last sorting structure
    this.sortTodos();
    this.saveTodos();
  }
}

