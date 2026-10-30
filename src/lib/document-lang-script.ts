// Shared by the server layout and the client settings store, so it must not be a "use client" module.

export const SETTINGS_KEY = "gym-coach:settings";

/**
 * Runs before first paint so an Arabic user never sees the page flip from LTR to RTL.
 * Inline scripts are allowed by the CSP ('unsafe-inline' is already needed for Next's bootstrap).
 */
export const DOCUMENT_LANG_SCRIPT = `try{var l=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_KEY,
)})||"{}").lang;if(l==="ar"||l==="tn"){document.documentElement.dir="rtl";document.documentElement.lang=l==="tn"?"ar-TN":"ar"}}catch(e){}`;
