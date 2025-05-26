const BASE_API_URL = "https://ern-backend-vercel.vercel.app/api";
const TODOS_API_URL = `${BASE_API_URL}/todos`;
const IMAGE_API_URL = `${BASE_API_URL}/process-image`;

const todoListEl = document.getElementById('todoList');
const uploadForm = document.getElementById('uploadForm');
const multimodalInput = document.getElementById('multimodal-input');
const submitTodoButton = document.getElementById('submit-todo-button');
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) {
    console.warn('Toast container not found!');
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  void toast.offsetWidth;
  toast.classList.add('show');

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
  const options = {
    method,
    headers: {},
  };
  if (body) {
    if (body instanceof FormData) {
    } else {
      options.headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    options.body = body;
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { messageFromStatus: response.statusText };
      }

      // error message extraction (optionall)
      let detailErrorMessage = '';
      if (errorData) {
          if (typeof errorData.error === 'string') { 
              detailErrorMessage = errorData.error;
          } else if (errorData.error && typeof errorData.error.message === 'string') { 
              detailErrorMessage = errorData.error.message;
          } else if (typeof errorData.message === 'string') { 
              detailErrorMessage = errorData.message;
          } else if (errorData.messageFromStatus) {
              detailErrorMessage = errorData.messageFromStatus;
          }
      }

      const errorMessage = detailErrorMessage || `HTTP error! status: ${response.status}`;
      console.error(`API Error: ${errorMessage}`, errorData);
      throw new Error(errorMessage);
    }
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    if (!(error.message.startsWith("HTTP error!"))) {
      showToast(`Error: ${error.message}`, 'error');
    }
    if (error.message.startsWith("HTTP error!")) {
      showToast(`API Error: ${error.message}`, 'error');
    } else {
      showToast(`Request Error: ${error.message}`, 'error');
    }
    throw error;
  }
}

function dataURLtoBlob(dataurl) {
  try {
    let arr = dataurl.split(','),
      mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) {
      throw new Error("Invalid data URL: MIME type not found.");
    }
    let mime = mimeMatch[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error("Error in dataURLtoBlob:", error);
    showToast("Error processing pasted image data.", "error");
    return null;
  }
}

function insertImageFileIntoInput(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Invalid file type. Please select an image.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '200px';
    img.style.display = 'block';
    img.style.margin = '5px 0';
    appendNodeAtCursor(multimodalInput, img);
  };
  reader.readAsDataURL(file);
}

function appendNodeAtCursor(parentElement, newNode) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    if (parentElement.contains(range.commonAncestorContainer)) {
      range.insertNode(newNode);
      range.setStartAfter(newNode);
      range.setEndAfter(newNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      parentElement.appendChild(newNode);
    }
  } else {
    parentElement.appendChild(newNode);
  }
  parentElement.focus();
  multimodalInput.classList.remove('is-empty');
}

if (multimodalInput) {
  multimodalInput.addEventListener('paste', (event) => {
    const items = (event.clipboardData || window.clipboardData).items;
    let imagePasted = false;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          insertImageFileIntoInput(file);
          imagePasted = true;
        }
      }
    }
    if (imagePasted) {
      multimodalInput.classList.remove('is-empty');
    }
  });

  multimodalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (uploadForm.requestSubmit) {
        uploadForm.requestSubmit(submitTodoButton);
      } else {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        uploadForm.dispatchEvent(submitEvent);
      }
    }
  });

  multimodalInput.addEventListener('blur', () => {
    if (multimodalInput.innerHTML.trim() === '' && multimodalInput.querySelectorAll('img').length === 0) {
      multimodalInput.classList.add('is-empty');
    }
  });
  multimodalInput.addEventListener('input', () => {
    if (multimodalInput.innerHTML.trim() !== '' || multimodalInput.querySelectorAll('img').length > 0) {
      multimodalInput.classList.remove('is-empty');
    } else {
      multimodalInput.classList.add('is-empty');
    }
  });
  if (multimodalInput.innerHTML.trim() === '' && multimodalInput.querySelectorAll('img').length === 0) {
    multimodalInput.classList.add('is-empty');
  }
}

// --- PARSE STRUCTURED TEXT ---
function parseStructuredText(text) {
  const details = {
    company: '',
    roleAndExp: '',
    actions: [],
    contact: '',
    location: '',
    raw: text
  };
  if (!text || typeof text !== 'string') return details;

  const lines = text.split('\n');
  let currentSection = null;
  let hasFoundStructuredData = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.toLowerCase().startsWith('hiring company:')) {
      details.company = trimmedLine.substring('hiring company:'.length).trim();
      currentSection = null;
      hasFoundStructuredData = true;
    } else if (trimmedLine.toLowerCase().startsWith('job role(s) & experience:')) {
      details.roleAndExp = trimmedLine.substring('job role(s) & experience:'.length).trim();
      currentSection = null;
      hasFoundStructuredData = true;
    } else if (trimmedLine.toLowerCase().startsWith('primary application action(s):')) {
      currentSection = 'actions';
      hasFoundStructuredData = true;
    } else if (trimmedLine.toLowerCase().startsWith('key contact for application:')) {
      details.contact = trimmedLine.substring('key contact for application:'.length).trim();
      currentSection = null;
      hasFoundStructuredData = true;
    } else if (trimmedLine.toLowerCase().startsWith('location:')) {
      details.location = trimmedLine.substring('location:'.length).trim();
      currentSection = null;
      hasFoundStructuredData = true;
    } else if (currentSection === 'actions' && trimmedLine.toLowerCase().startsWith('action:')) {
      details.actions.push(trimmedLine.substring('action:'.length).trim());
      hasFoundStructuredData = true;
    } else if (currentSection === 'actions' && trimmedLine.startsWith('- ')) {
      details.actions.push(trimmedLine.substring(2).trim());
      hasFoundStructuredData = true;
    }
  }
  details.hasStructuredData = hasFoundStructuredData;
  return details;
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function renderTodos(todos) {
  todoListEl.innerHTML = '';
  if (!todos || todos.length === 0) {
    todoListEl.innerHTML = '<li class="no-todos-message">No todos yet. Add one below!</li>';
    return;
  }
  todos.forEach(todo => {
    if (!todo || !todo._id) {
      console.error("Skipping rendering todo due to missing _id:", todo);
      return;
    }
    const li = document.createElement('li');
    li.dataset.id = todo._id;
    const isCompleted = todo.status === 'completed';
    li.className = isCompleted ? 'completed' : '';
    const textContainer = document.createElement('div');
    textContainer.className = 'todo-text-container';
    const parsedInfo = parseStructuredText(todo.text || 'No content');
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'todo-header-wrapper';
    const heading = document.createElement('h4');
    let titleText = 'Job Application Details';
    if (parsedInfo.company) {
      titleText = `Job at: ${escapeHTML(parsedInfo.company)}`;
    } else if (parsedInfo.roleAndExp) {
      titleText = escapeHTML(parsedInfo.roleAndExp.substring(0, 50) + (parsedInfo.roleAndExp.length > 50 ? '...' : ''));
    } else if (parsedInfo.raw) {
      titleText = escapeHTML(parsedInfo.raw.substring(0, 50) + (parsedInfo.raw.length > 50 ? '...' : ''));
    }
    heading.textContent = titleText;
    const collapseButton = document.createElement('button');
    collapseButton.textContent = '+';
    collapseButton.className = 'collapse-btn';
    collapseButton.setAttribute('aria-expanded', 'false');
    headerWrapper.appendChild(heading);
    headerWrapper.appendChild(collapseButton);
    textContainer.appendChild(headerWrapper);
    const detailsList = document.createElement('ul');
    detailsList.className = 'todo-details-list collapsed';
    let detailsHtml = '';
    if (parsedInfo.hasStructuredData) {
      if (parsedInfo.roleAndExp) {
        detailsHtml += `<li><strong>Role & Experience:</strong> ${escapeHTML(parsedInfo.roleAndExp)}</li>`;
      }
      if (parsedInfo.location) {
        detailsHtml += `<li><strong>Location:</strong> ${escapeHTML(parsedInfo.location)}</li>`;
      }
      if (parsedInfo.contact) {
        detailsHtml += `<li><strong>Key Contact:</strong> ${escapeHTML(parsedInfo.contact)}</li>`;
      }
      if (parsedInfo.actions.length > 0) {
        detailsHtml += `<li><strong>Primary Application Action(s):</strong><ul>`;
        parsedInfo.actions.forEach(action => {
          let actionHtml = escapeHTML(action);
          const linkMatch = action.match(/(https?:\/\/[^\s]+)/i);
          if (linkMatch && linkMatch[1]) {
            actionHtml = actionHtml.replace(linkMatch[1], `<a href="${linkMatch[1]}" target="_blank" rel="noopener noreferrer">${linkMatch[1]}</a>`);
          }
          detailsHtml += `<li>${actionHtml}</li>`;
        });
        detailsHtml += `</ul></li>`;
      }
      if (parsedInfo.raw && detailsHtml.length < 50 && !detailsHtml.includes(parsedInfo.raw.substring(0, 10))) {
        detailsHtml += `<li><strong>Full Details:</strong><pre class="raw-details-text">${escapeHTML(parsedInfo.raw)}</pre></li>`;
      }
    } else {
      detailsHtml += `<li><strong>Details:</strong><pre class="raw-details-text">${escapeHTML(parsedInfo.raw)}</pre></li>`;
    }
    if (!detailsHtml.trim() && parsedInfo.raw) {
      detailsHtml = `<li><pre class="raw-details-text">${escapeHTML(parsedInfo.raw)}</pre></li>`;
    }
    detailsList.innerHTML = detailsHtml;
    textContainer.appendChild(detailsList);
    collapseButton.addEventListener('click', () => {
      detailsList.classList.toggle('collapsed');
      const isNowCollapsed = detailsList.classList.contains('collapsed');
      collapseButton.textContent = isNowCollapsed ? '+' : '-';
      collapseButton.setAttribute('aria-expanded', String(!isNowCollapsed));
    });
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status';
    statusSpan.textContent = isCompleted ? 'Completed' : 'Pending';
    actionsDiv.appendChild(statusSpan);
    const statusButton = document.createElement('button');
    statusButton.className = `status-btn ${isCompleted ? 'pending-btn' : 'complete-btn'}`;
    statusButton.dataset.action = 'toggle';
    statusButton.textContent = isCompleted ? 'Mark Pending' : 'Mark Complete';
    actionsDiv.appendChild(statusButton);
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete-btn');
    deleteButton.dataset.action = 'delete';
    actionsDiv.appendChild(deleteButton);
    li.appendChild(textContainer);
    li.appendChild(actionsDiv);
    todoListEl.appendChild(li);
  });
}

async function fetchTodos() {
  try {
    const todos = await apiRequest(TODOS_API_URL);
    renderTodos(todos);
  } catch (error) {
    renderTodos([]);
  }
}

// --- HANDLE CREATE TODO (FORM SUBMISSION) ---
async function handleCreateTodo(event) {
  event.preventDefault();
  showToast('Processing...', 'info', 2000);
  let imageFile = null;
  const childNodes = multimodalInput.childNodes;
  for (const node of childNodes) {
    if (node.nodeName === 'IMG' && node.src) {
      if (!imageFile) {
        try {
          const blob = dataURLtoBlob(node.src);
          if (blob) {
            imageFile = new File([blob], "pasted_image.png", { type: blob.type });
          }
        } catch (e) {
          console.error("Error converting image src to file:", e);
          return;
        }
      }
    }
  }
  if (!imageFile) {
    showToast('Please include an image (e.g., by pasting a screenshot) for the todo.', 'error');
    return;
  }
  const formData = new FormData();
  formData.append('image', imageFile, imageFile.name || `screenshot.${imageFile.type.split('/')[1] || 'png'}`);
  try {
    const response = await apiRequest(IMAGE_API_URL, 'POST', formData);
    if (response && response.todo && response.todo._id) {
      showToast('Todo created from image successfully!', 'success');
    } else if (response && response.message && response.message.toLowerCase().includes('no text found')) {
      showToast('Image processed, but no text could be extracted.', 'info');
    } else {
      showToast(response?.message || 'Todo created, but response was unexpected.', 'warning');
    }
  } catch (error) {
    console.error('Failed to create todo via image processing:', error);
  } finally {
    multimodalInput.innerHTML = '';
    multimodalInput.classList.add('is-empty');
    fetchTodos();
  }
}

// --- HANDLE UPDATE TODO STATUS ---
async function handleUpdateTodoStatus(todoId, newCompletedStatusBoolean) {
  try {
    showToast(`Updating status...`, 'info', 1500);
    const statusString = newCompletedStatusBoolean ? "completed" : "pending";
    await apiRequest(`${TODOS_API_URL}/${todoId}`, 'PUT', { status: statusString });
    showToast(`Todo status updated.`, 'success');
    fetchTodos();
  } catch (error) {
    console.error('Failed to update todo status:', error);
  }
}

// --- HANDLE DELETE TODO ---
async function handleDeleteTodo(todoId) {
  if (!confirm('Are you sure you want to delete this todo?')) return;
  try {
    showToast(`Deleting todo...`, 'info', 1500);
    await apiRequest(`${TODOS_API_URL}/${todoId}`, 'DELETE');
    showToast('Todo deleted successfully.', 'success');
    fetchTodos();
  } catch (error) {
    console.error('Failed to delete todo:', error);
  }
}

// --- TODO LIST CLICK HANDLER ---
function handleTodoListClick(event) {
  const target = event.target;
  const li = target.closest('li[data-id]');
  if (!li) return;
  const todoId = li.dataset.id;
  if (target.matches('.status-btn[data-action="toggle"]')) {
    const isCurrentlyCompleted = li.classList.contains('completed');
    handleUpdateTodoStatus(todoId, !isCurrentlyCompleted);
  } else if (target.matches('.delete-btn[data-action="delete"]')) {
    handleDeleteTodo(todoId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleCreateTodo);
  }
  if (todoListEl) {
    todoListEl.addEventListener('click', handleTodoListClick);
  }
  if (multimodalInput) {
    if (multimodalInput.innerHTML.trim() === '' && multimodalInput.querySelectorAll('img').length === 0) {
      multimodalInput.classList.add('is-empty');
    }
    if (!multimodalInput.hasAttribute('data-placeholder')) {
      multimodalInput.setAttribute('data-placeholder', 'Paste screenshot or type job details...');
    }
  }
  fetchTodos();
  console.log("WalterWhite🤠 : For Learning Purposes Only");
});