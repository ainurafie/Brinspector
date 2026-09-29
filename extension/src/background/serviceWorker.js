// MV3 background service worker for the toolbar badge (F-005): counts failed requests per
// tab from chrome.webRequest (status/headers only — never bodies) and drives chrome.action.
// Classification is delegated to extension/src/lib/webRequestClassify.js so the badge and the
// DevTools panel never disagree about what "failed" means. Chrome API glue only, not unit-tested
// directly — see tests/unit/tabCounters.test.js and tests/unit/webRequestClassify.test.js for the
// pure logic this file wires together.

import { isFailedWebRequest, categorizeWebRequest } from '../lib/webRequestClassify.js';
import { formatBadgeCount } from '../lib/format.js';
import { GET_TAB_SUMMARY_MESSAGE } from '../lib/messages.js';
import { createTabCounters } from './tabCounters.js';

// Matches --bi-danger-solid in extension/src/panel/panel.css.
const BADGE_COLOR = '#93000a';
const BADGE_COLOR_EMPTY = '#00000000';

const tabCounters = createTabCounters();

function updateBadge(tabId) {
  const { total } = tabCounters.get(tabId);
  chrome.action.setBadgeText({ tabId, text: formatBadgeCount(total) });
  chrome.action.setBadgeBackgroundColor({ tabId, color: total > 0 ? BADGE_COLOR : BADGE_COLOR_EMPTY });
}

function handleRequest(details) {
  if (details.tabId < 0 || !isFailedWebRequest(details)) return;
  tabCounters.record(details.tabId, categorizeWebRequest(details));
  updateBadge(details.tabId);
}

function handleMainFrameNavigation(details) {
  if (details.type !== 'main_frame' || details.tabId < 0) return;
  tabCounters.reset(details.tabId);
  updateBadge(details.tabId);
}

chrome.webRequest.onCompleted.addListener(handleRequest, { urls: ['<all_urls>'] });
chrome.webRequest.onErrorOccurred.addListener(handleRequest, { urls: ['<all_urls>'] });
chrome.webRequest.onBeforeRequest.addListener(handleMainFrameNavigation, { urls: ['<all_urls>'] });

chrome.tabs.onActivated.addListener(({ tabId }) => updateBadge(tabId));
chrome.tabs.onRemoved.addListener((tabId) => tabCounters.dispose(tabId));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== GET_TAB_SUMMARY_MESSAGE) return undefined;
  sendResponse(tabCounters.get(message.tabId));
  return true;
});
