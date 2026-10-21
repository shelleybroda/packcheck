# PackCheck 🎒
**A Reusable Visual Packing Checklist for College Routines**

**Live app:** [packcheck-1.ai.studio](https://packcheck-1.ai.studio/)

Built and iterated in Google AI Studio. This repository contains the exported app source, with publication and verification notes added to this README.

PackCheck is a mobile-first web app designed for students and travellers to verify laid-out items before heading to campus, the gym, or a weekend trip. Users select a saved routine, lay their gear out on a desk or bed, and photograph the items. Gemini vision detects and matches visible items to unchecked checklist entries. The user reviews each match and confirms what has actually been packed.

---

## 🌟 Key Architecture & Features

### 1. Reusable Packing Routines & Independent Progress
- **3 Built-in Starter Routines**:
  - **School**: `notebook`, `laptop`, `charger`, `headphones`, `water bottle`, `keys`
  - **Gym**: `water bottle`, `towel`, `sneakers`, `headphones`
  - **Weekend**: `shirt`, `pants`, `toothbrush`, `charger`
- **Custom Routines**: Create named routines with multi-line initial item entry.
- **Editable Items**: Add, rename, or remove items at any time.
- **Independent Progress Tracking**: Each list maintains its own packed state and progress bar.
- **"Start New Pack" Action**: Safely resets only that routine's packed checkboxes after confirmation, leaving the item template intact.

### 2. Live In-App Camera & Phone Fallback
- **Live Viewfinder**: Accessible via `navigator.mediaDevices.getUserMedia` using `{ audio: false, video: { facingMode: { ideal: 'environment' } } }`.
- **User-Initiated Permissions**: Only requests device camera access after an explicit user tap.
- **Orientation & Dimensions**: Requires non-zero dimensions (`videoWidth > 0 && videoHeight > 0`) before permitting capture.
- **Resource Management**: Automatically releases all camera tracks (`track.stop()`) on capture, retake, navigation, modal close, or unmount.
- **Hardware Fallback**: Includes an accessible file input with `capture="environment"` so phones and restricted browser environments can take or choose photos directly without gallery-only restrictions.

### 3. Client-Side Image Pre-Processing & Privacy
- **Client-Side Compression**: Resizes high-resolution smartphone photos (often 12–48MP) down to a balanced 1280px max dimension at 0.82 JPEG quality via HTML5 Canvas.
- **Ephemeral Processing**: Photos are held only in memory during the scan and are **never saved** to `localStorage`, IndexedDB, or server disks.
- **Accurate Photo Notice**: Photos sent to Google Gemini for analysis. PackCheck does not save photos.

### 4. Real Multimodal AI with Gemini 3.8 Flash
- **Server-Side Security**: Calls Gemini 3.8 Flash via the official `@google/genai` TypeScript SDK on the Express backend (`/api/match-items`).
- **Secret Isolation**: `GEMINI_API_KEY` is kept strictly in server environment secrets (`process.env.GEMINI_API_KEY`) and is never sent to the browser or bundled in client code.
- **Prompt Injection Defense**: All item labels and image text are strictly isolated as passive data, never instructions.
- **Grounded Verification**: Gemini only reports objects physically laid out. Hidden items inside closed bags or pockets are not inferred.
- **Confidence Rating**:
  - `clear`: Item is unmistakably present and complete.
  - `uncertain`: Partial items (e.g. charging cable seen without the power adapter) or occluded items are categorized as uncertain with visual evidence.
- **ID Validation & Deduplication**: The server validates that returned matches only correspond to IDs submitted in the active request, discarding hallucinated IDs.

### 5. Review & Confirmation Discipline
- **Zero Auto-Check**: All confirmation checkboxes start **unchecked**. Gemini vision suggests matches; the user decides and confirms what is packed.
- **Non-Matched Items**: Items not detected remain as "Not confirmed yet" rather than marked absent.
- **Session Safety**: Each scan is tagged with `listId` and `sessionVersion`. If a user resets a list or switches routines during an in-flight scan, stale results cannot alter the new session.

### 6. Local Storage Schema & Resilience
- **Key**: `packcheck_storage_v1`
- **Schema**:
  ```ts
  interface StorageStateV1 {
    version: 1;
    lists: PackingList[];
    activeListId: string | null;
  }
  ```
- **Fallback**: Gracefully falls back to in-memory state if `localStorage` is disabled or full (e.g. strict Safari Private Browsing mode), without crashing.

---

## 🛠️ Setup & Environment Variables

### Requirements
- Node.js 22.12 or newer
- An active Google Gemini API Key

### Configuration
Create a `.env` file in the project root (or configure via AI Studio **Settings > Secrets**):

```env
# Server secret for Gemini API
GEMINI_API_KEY="your-gemini-api-key"

# Port (defaults to 3000)
PORT=3000
```

### Running Locally
```bash
# Install dependencies
npm install

# Start development server (runs Express + Vite middleware)
npm run dev

# Check types and compile
npm run lint
npm run build
```

---

## 📱 Manual Phone Test Checklist (Safari & Chrome)

| Test Step | Expected Behavior |
|:---|:---|
| **1. 375px Viewport** | Open on iPhone SE or Chrome DevTools (375px width). Verify zero horizontal scrolling and all touch targets are $\ge 44\text{px}$. |
| **2. Home Starter Routines** | Verify School, Gym, and Weekend routines appear with correct item counts and progress bars. |
| **3. Manual Checkbox Tap** | Tap any item row. Item shifts to Packed group, progress bar advances, and state persists after refreshing the page. |
| **4. In-App Camera Trigger** | Tap "Scan items". Tap "Allow" on camera prompt. Viewfinder streams rear camera with scanning guide. |
| **5. Track Cleanup** | Close the camera modal. Verify the green camera indicator in the mobile status bar immediately disappears. |
| **6. Device Fallback** | Tap "From photo" or deny camera. Verify file input opens device camera / photo picker. |
| **7. Real AI Matching** | Take a photo of laid-out items (e.g. notebook and water bottle). Tap "Use photo" → "Spot Items with Gemini". Verify structured matches appear with observed object details and evidence. |
| **8. Confirmation Screen** | Verify all checkboxes start unchecked. Select matched items and tap "Confirm". Only selected items are marked packed. |
| **9. "Start New Pack"** | Tap "Start new pack" from list header. Confirm reset dialog. Only packed status is cleared; items are preserved. |
| **10. Offline / Error Resilience** | Turn on Airplane mode and tap scan. Verify app displays honest timeout/offline error with Retry, without crashing. |

---

## 🔍 Test & Verification Report

### Verified in the desktop browser
- Manual packing updates counts, survives reload, and stays independent between routines.
- Creating a custom routine works.
- Denied camera permission shows a useful fallback; cancellation preserves the list.
- Starting a new pack clears progress and preserves the routine's items.
- The published URL opens in a separate browser without signing in.
- Exported files were reviewed for API-key exposure; only placeholder environment values are included.

### Reported by the Google AI Studio build environment
- Final TypeScript check (`npm run lint`) and production build (`npm run build`) passed.
- Invalid request bodies, malformed base64, unsupported image MIME types, and empty item lists returned HTTP 400.
- A real Gemini request with a blank gray test image returned HTTP 200 and no item matches. This checks API connectivity, not recognition of real packing items.

### Still requires physical phone testing
The checklist above must be run on actual hardware. Physical iPhone/Android camera capture and positive recognition of real items are not established by the desktop checks. Test the deployed URL before submission and again before the class demo.
