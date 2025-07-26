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

// Initialize the settings object with saved values and start listening for navigation events when active
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
  chrome.tabs.onActivated.addListener(handleTabActivated);
}

function stopListening() {
  chrome.webNavigation.onCompleted.removeListener(handleNavigationCompleted);
  chrome.tabs.onActivated.removeListener(handleTabActivated);
}

async function handleNavigationCompleted(details) {
  if (details.frameId !== 0) {
    return;  // Only handle main frame navigations
  }

  const url = details.url;
  if (!url || url.startsWith('chrome://')) {
    return;  // Ignore internal Chrome URLs
  }

  await publishEvent({
    type: 'navigation_completed',
    url: url,
    tabId: details.tabId,
    timestamp: Date.now(),
  });
}

async function handleTabActivated(activeInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    const url = tab.url;
    if (!url || !url.startsWith('http')) {
      return;  // Ignore non-HTTP URLs
    }

    await publishEvent({
      type: 'tab_activated',
      url,
      tabId: activeInfo.tabId,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Failed to handle tab activation:', error);
  }
}


async function publishEvent(eventData) {
  if (!settings.publishUrl || !settings.isActive) {
    return;
  }

  try {
    const userEmail = await getUserEmail();
    const enrichedEventData = {
      ...eventData,
      user: userEmail
    };

    const response = await fetch(settings.publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedEventData)
    });

    if (!response.ok) {
      throw new Error(`Failed to publish event: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to publish navigation event:', error);
  }
}

async function getUserEmail() {
  try {
    const userInfo = await chrome.identity.getProfileUserInfo();
    return userInfo.email;
  } catch (error) {
    console.error('Failed to get user email:', error);
  }
}
