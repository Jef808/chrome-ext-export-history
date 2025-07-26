let isActive = false;
let publishUrl = '';

chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

async function initialize() {
  const result = await chrome.storage.sync.get(['isActive', 'publishUrl']);
  isActive = result.isActive || false;
  publishUrl = result.publishUrl || '';

  if (isActive) {
    startListening();
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.isActive) {
      isActive = changes.isActive.newValue;
      if (isActive) {
        startListening();
      } else {
        stopListening();
      }
    }
    if (changes.publishUrl) {
      publishUrl = changes.publishUrl.newValue;
    }
  }
});

function startListening() {
  chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);
  chrome.webNavigation.onCompleted.addListener(handleNavigationCompleted);
  chrome.webNavigation.onErrorOccurred.addListener(handleNavigationError);
}

function stopListening() {
  chrome.webNavigation.onBeforeNavigate.removeListener(handleNavigation);
  chrome.webNavigation.onCompleted.removeListener(handleNavigationCompleted);
  chrome.webNavigation.onErrorOccurred.removeListener(handleNavigationError);
}

async function handleNavigation(details) {
  if (details.frameId === 0) {
    await publishEvent({
      type: 'navigation_start',
      url: details.url,
      tabId: details.tabId,
      timestamp: Date.now(),
      frameId: details.frameId
    });
  }
}

async function handleNavigationCompleted(details) {
  if (details.frameId === 0) {
    await publishEvent({
      type: 'navigation_completed',
      url: details.url,
      tabId: details.tabId,
      timestamp: Date.now(),
      frameId: details.frameId
    })
  }
}

async function handleNavigationError(details) {
  if (details.frameId === 0) {
    await publishEvent({
      type: 'navigation_error',
      url: details.url,
      tabId: details.tabId,
      timestamp: Date.now(),
      error: details.error,
      frameId: details.frameId,
    });
  }
}

async function publishEvent(eventData) {
  if (!publishUrl || !isActive) {
    return;
  }

  try {
    await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
  } catch (error) {
    console.error('Failed to publish navigation event:', error);
  }
}

// initialize on script load
initialize();
