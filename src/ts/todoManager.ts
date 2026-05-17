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

  private loadTodos() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.todos = JSON.parse(stored);
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
    this.saveTodos();
    return newTodo;
  }

  public toggleTodo(id: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveTodos();
    }
  }

  public deleteTodo(id: string): void {
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
  }
}
