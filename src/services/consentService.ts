// consentService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-016
//
// Google UMP (User Messaging Platform) consent wiring via @capacitor-community/admob
// (v8 exposes the UMP methods directly). On launch we resolve consent BEFORE AdMob
// is initialised (the ordering constraint lives in App.tsx). The native UMP SDK
// renders the dialog itself — there is no custom consent UI here.
//
// admob.ts is LOCKED (until T-015); this service only imports the plugin + UMP
// enums, so that file is untouched.

import {
  AdMob,
  AdmobConsentStatus,
  AdmobConsentDebugGeography,
} from '@capacitor-community/admob';
import type { AdmobConsentRequestOptions } from '@capacitor-community/admob';
import { Preferences } from '@capacitor/preferences';

const CONSENT_KEY = 'gdpr_consent_status';

// Dev/test builds only (gated like the rest of the project's test tooling, via
// VITE_DEV_TOOLS): force EEA geography so the consent dialog can be exercised from
// a non-EU device (the SM-E146B is in India). The device must also be registered
// as a UMP test device — paste its hash (from logcat) here. Plain `npm run build`
// (the shipped app) leaves this off, so real geography applies.
const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === 'true';
const UMP_TEST_DEVICE_HASH = 'E538D4CD3DFA5FF7EC5799F66CC14E72'; // SM-E146B hash (from UMP logcat)

function buildRequestOptions(): AdmobConsentRequestOptions {
  const options: AdmobConsentRequestOptions = { tagForUnderAgeOfConsent: false };
  if (DEV_TOOLS) {
    options.debugGeography = AdmobConsentDebugGeography.EEA;
    options.testDeviceIdentifiers = [UMP_TEST_DEVICE_HASH];
  }
  return options;
}

/**
 * On every launch: request the latest consent info; if a form is REQUIRED and
 * available, present it (blocks until the user chooses). Persist the resolved
 * status. The UMP SDK itself remembers prior choices — `requestConsentInfo`
 * returns OBTAINED on later launches and we do not re-show. Errors (e.g. running
 * on web, where the native UMP SDK is absent) are swallowed so startup proceeds.
 */
export async function requestAndResolve(): Promise<void> {
  try {
    const info = await AdMob.requestConsentInfo(buildRequestOptions());
    let status = info.status;
    if (status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
      const updated = await AdMob.showConsentForm();
      status = updated.status;
    }
    await Preferences.set({ key: CONSENT_KEY, value: status });
  } catch (err) {
    console.warn('[consentService] requestAndResolve failed:', err);
  }
}

/**
 * Re-open the consent / privacy options form so the user can change their choice
 * (wired to About → "Ad Preferences (GDPR)"). Uses showPrivacyOptionsForm — the
 * UMP "privacy options" entry point for an already-consented user; showConsentForm
 * only presents while status is REQUIRED, so it is not the right call for a revisit.
 */
export async function reopenForm(): Promise<void> {
  try {
    await AdMob.showPrivacyOptionsForm();
  } catch (err) {
    console.warn('[consentService] reopenForm failed:', err);
  }
}
