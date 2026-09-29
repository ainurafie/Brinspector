// Adapter turning chrome.webRequest onCompleted/onErrorOccurred details into the same
// failure/category rules the DevTools panel uses (errorFilter.js), so the toolbar badge
// (F-005) and the panel never disagree about what "failed" means or which category it is.
// No chrome.* calls here — see tests/unit/webRequestClassify.test.js.

import { isFailedStatus, categorizeError } from './errorFilter.js';

/** Map a chrome.webRequest details object ({ statusCode, error }) to { status, errorText }. */
export function toStatusAndErrorText(details = {}) {
  return { status: Number(details.statusCode) || 0, errorText: details.error || null };
}

/** True when a chrome.webRequest onCompleted/onErrorOccurred call represents a failed request. */
export function isFailedWebRequest(details) {
  const { status, errorText } = toStatusAndErrorText(details);
  return isFailedStatus(status, errorText);
}

/** Category for a chrome.webRequest details object, using the same rules as the DevTools panel. */
export function categorizeWebRequest(details) {
  const { status, errorText } = toStatusAndErrorText(details);
  return categorizeError(status, errorText);
}
