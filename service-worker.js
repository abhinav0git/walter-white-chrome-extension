chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "_execute_action") {
    // for _execute_action, 'tab' should be the active tab.
    if (tab && tab.id) {
      chrome.sidePanel
        .open({ tabId: tab.id })
        .then(() => {
          console.log("Side panel opened for tab:", tab.id);
        })
        .catch((error) => console.error("Failed to open side panel:", error));
    } 
    else {
      // alternative for opening global side panel if tab context is not available
      // For example, open for the current window if tabId is not available
      // This branch might not be strictly necessary if _execute_action always provides a tab.
      chrome.windows.getCurrent((window) => {
        if (window.id) {
          chrome.sidePanel.open({ windowId: window.id })
            .then(() => console.log("Side panel opened for window:", window.id))
            .catch((error) => console.error("Failed to open side panel for window:", error));
        } else {
          console.error("Could not get tab or window ID to open side panel.");
        }
      });
    }
  }
});

// Optional: If you want the toolbar icon click to also open the side panel
// You can set this once, for example, on installation.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Failed to set panel behavior:", error));
});

// Note: If you use `setPanelBehavior({ openPanelOnActionClick: true })`,
// the `_execute_action` command (keyboard shortcut) will also automatically
// open the side panel due to this behavior. In that case, your
// `chrome.commands.onCommand` listener for `_execute_action` might become
// redundant for the sole purpose of opening the panel, but it's harmless
// and allows for additional logic if needed.
// If you want _only_ the keyboard shortcut to open it, and not the icon click,
// then do not use `setPanelBehavior` and rely solely on your `onCommand` listener.