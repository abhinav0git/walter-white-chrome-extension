const BASE_API_URL = "https://ern-backend-vercel.vercel.app/api";
const TODOS_API_URL = `${BASE_API_URL}/todos`;

const todoListEl = document.getElementById('todoList');
const uploadForm = document.getElementById('uploadForm');
const multimodalInput = document.getElementById('multimodal-input');

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('Toast container not found!');
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, { once: true });
  }, duration);
}

async function apiRequest(url, method = 'GET', body = null) {
  console.log(`API Request: ${method} ${url}`, body ? `Body: ${JSON.stringify(body)}` : '');
  const options = {
    method,
    headers: {},
  };
  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    if (response.status === 204) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    showToast(`Error: ${error.message}`, 'error');
    throw error;
  }
}

function renderTodos(todos) {
  todoListEl.innerHTML = '';

  if (!todos || todos.length === 0) {
    todoListEl.innerHTML = '<li class="no-todos-message">No todos yet. Add one below!</li>';
    return;
  }

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    li.className = todo.completed ? 'completed' : '';

    const todoTextContent = todo.text || 'No content';
    const todoTitle = todo.title || (todoTextContent.length > 50 ? todoTextContent.substring(0, 47) + '...' : todoTextContent);

    li.innerHTML = `
      <div class="todo-text-container">
        <div class="todo-header-wrapper">
          <h4>${escapeHTML(todoTitle)}</h4>
          <button class="collapse-btn" aria-expanded="false">Details</button>
        </div>
        <div class="todo-details-list collapsed">
          <div class="raw-details-text">${todoTextContent}</div> 
        </div>
      </div>
      <div class="actions">
        <span class="status">${todo.completed ? 'Completed' : 'Pending'}</span>
        <button class="status-btn ${todo.completed ? 'pending-btn' : 'complete-btn'}" data-action="toggle">
          ${todo.completed ? 'Mark Pending' : 'Mark Complete'}
        </button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    `;
    todoListEl.appendChild(li);
  });


}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

async function fetchTodos() {
  console.log('Fetching todos...');
  try {
    const todos = await apiRequest(TODOS_API_URL);
    renderTodos(todos);
  } catch (error) {
    renderTodos([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchTodos();
  // uploadForm.addEventListener('submit', handleCreateTodo);
  // todoListEl.addEventListener('click', handleTodoListClick);

  multimodalInput.addEventListener('blur', () => {
    if (multimodalInput.innerHTML.trim() === '') {
        multimodalInput.classList.add('is-empty');
    }
  });

  multimodalInput.addEventListener('focus', () => {
    multimodalInput.classList.remove('is-empty');
  });

  if (multimodalInput.innerHTML.trim() === '') {
    multimodalInput.classList.add('is-empty');
  }

  multimodalInput.setAttribute('data-placeholder', 'Paste screenshot here...');
});