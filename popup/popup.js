// In-page cache of the user's settings
const settings = {};
const settingsForm = document.getElementById('settingsForm');

// Immediately persist changes in settings
settingsForm.publishUrl.addEventListener("input", (event) => {
  settings.publishUrl = event.target.value;
  chrome.storage.sync.set({ settings });
});

settingsForm.isActive.addEventListener("change", (event) => {
  settings.isActive = event.target.checked;
  chrome.storage.sync.set({ settings });
});

// Initialize the form with the user's saved settings
const data = await chrome.storage.sync.get("settings");
Object.assign(settings, data.settings);
settingsForm.publishUrl.value = settings.publishUrl || "";
settingsForm.isActive.checked = Boolean(settings.isActive);
