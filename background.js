const settings = {
  isActive: false,
  publishUrl: ""
};


chrome.webNavigation.onCompleted.addListener(handleNavigationCompleted);
chrome.tabs.onActivated.addListener(handleTabActivated);

// Listen for changes in the settings from the popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.settings?.newValue) {
    settings.isActive = Boolean(changes.settings.newValue.isActive);
    settings.publishUrl = changes.settings.newValue.publishUrl || "";

    console.log(`Settings changed: isActive=${settings.isActive}, publishUrl=${settings.publishUrl}`);
  }
});

async function handleNavigationCompleted(details) {
  if (details.frameId !== 0) {
    return;  // Only handle main frame navigations
  }

  const url = details.url;
  if (!url || url.startsWith('chrome://')) {
    return;  // Ignore internal Chrome URLs
  }

  try {
    const tab = await chrome.tabs.get(details.tabId);

    await publishEvent({
      type: 'navigation_completed',
      url: url,
      title: tab.title,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to handle navigation completed:', error);
  }

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
      title: tab.title,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Failed to handle tab activation:', error);
  }
}

async function publishEvent(eventData) {
  const {isActive, publishUrl} = await getSettings();

  if (!publishUrl || !isActive) {
    return;
  }

  try {
    const userEmail = await getUserEmail();
    const enrichedEventData = {
      ...eventData,
      user: userEmail
    };

    const response = await fetch(publishUrl, {
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

async function getSettings() {
  if (!settings.publishUrl) {
    const data = await chrome.storage.sync.get('settings');
    const storedSettings = data.settings || {};

    settings.isActive = Boolean(storedSettings.isActive);
    settings.publishUrl = storedSettings.publishUrl || "";

    console.log(`Refreshed settings: isActive=${settings.isActive}, publishUrl=${settings.publishUrl}`);
  }

  return settings;
}

async function getUserEmail() {
  try {
    const userInfo = await chrome.identity.getProfileUserInfo();
    return userInfo.email;
  } catch (error) {
    console.error('Failed to get user email:', error);
  }
}
