const settings = {};

chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

// Listen for changes in the settings from the popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.settings?.newValue) {
    settings.isActive = Boolean(changes.settings.newValue.isActive);
    settings.publishUrl = changes.settings.newValue.publishUrl || "";
    console.log(`Settings changed: isActive=${settings.isActive}, publishUrl=${settings.publishUrl}`);

    if (settings.isActive) {
      startListening();
    } else {
      stopListening();
    }
  }
});

// Initialize the settings object with saved values
async function initialize() {
  const data = await chrome.storage.sync.get('settings');
  const settings = data.settings;
  Object.assign(settings, data.settings);
  console.log(`Extension initialized: isActive=${settings.isActive}, publishUrl=${settings.publishUrl}`);

  if (settings.isActive) {
    startListening();
  }
}

function startListening() {
  chrome.webNavigation.onCompleted.addListener(handleNavigationCompleted);
}

function stopListening() {
  chrome.webNavigation.onCompleted.removeListener(handleNavigationCompleted);
}

async function handleNavigationCompleted(details) {
  if (details.frameId !== 0) {
    return;  // Only handle main frame navigations
  }

  await publishEvent({
    type: 'navigation_completed',
    url: details.url,
    tabId: details.tabId,
    timestamp: Date.now(),
    frameId: details.frameId
  });
}

async function publishEvent(eventData) {
  if (!settings.publishUrl || !settings.isActive) {
    return;
  }
  try {
    const response = await fetch(settings.publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });
    if (!response.ok) {
      throw new Error(`Failed to publish event: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to publish navigation event:', error);
  }
}
