# Climb Job Capture Extension

This Chrome/Edge extension captures jobs from LinkedIn, Indeed, Greenhouse, and Lever into Climb.

## Install

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `extensions/climb-job-capture` from this repository.

## Configure

1. Open the extension popup.
2. Set `Climb App URL` (default is `https://climb-wheat.vercel.app`).
3. Stay signed in to Climb in the same browser profile so `/api/jobs/capture` can authenticate with cookies.

## Use

1. Open a job page on LinkedIn/Indeed/Greenhouse/Lever.
2. Click the extension icon.
3. Review auto-filled fields.
4. Click **Capture Job**.

Captured jobs are written to `Saved Jobs` and become available to your app workflows.
