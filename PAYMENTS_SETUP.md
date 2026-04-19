# SCANZA AI — IntaSend M-Pesa Setup

The platform is wired to send real M-Pesa STK Push prompts via **IntaSend**.
Below is the exact runbook to flip it on with your test keys.

---

## 1. Your test keys (already in your IntaSend dashboard)

| Field | Value |
|------|------|
| Test Secret Key | `sk_test_1c623d3f30fe3a18b40fa4f82c2fa345f0b9b6df` |
| Test Public Key | `pk_test_5cd503d824f9af9c6563dad96481fc8e8f69f7de` |

These keys are **never** committed to source. They live only in
Firebase Functions Secret Manager.

---

## 2. Set the secrets on Firebase

Pick a long random string for the webhook challenge (e.g. run
`openssl rand -hex 24`). You'll paste the same value into IntaSend's
dashboard in step 4.

```bash
# From the project root
firebase functions:secrets:set INTASEND_SECRET_KEY
# When prompted, paste: sk_test_1c623d3f30fe3a18b40fa4f82c2fa345f0b9b6df

firebase functions:secrets:set INTASEND_PUBLISHABLE_KEY
# When prompted, paste: pk_test_5cd503d824f9af9c6563dad96481fc8e8f69f7de

firebase functions:secrets:set INTASEND_WEBHOOK_CHALLENGE
# When prompted, paste: <your random challenge string>

firebase functions:secrets:set INTASEND_TEST_MODE
# When prompted, paste: true
```

When you go live later, just run `INTASEND_TEST_MODE` again with
`false` and rotate the keys to `sk_live_…` / `pk_live_…`.

---

## 3. Deploy the backend

```bash
# One-time install of function dependencies
cd functions
npm install
cd ..

# Make sure your project is on the BLAZE plan (pay-as-you-go).
# Spark (free) plan cannot make outbound HTTP requests to IntaSend.

firebase deploy --only functions,firestore:rules,storage:rules
```

After deploy you'll get URLs like:

```
https://us-central1-scanza-ai.cloudfunctions.net/intasendWebhook
https://us-central1-scanza-ai.cloudfunctions.net/initiateMpesaStkPush
https://us-central1-scanza-ai.cloudfunctions.net/checkPaymentStatus
https://us-central1-scanza-ai.cloudfunctions.net/processScan
```

Copy the first URL (`intasendWebhook`) — you need it in the next step.

---

## 4. Configure IntaSend dashboard

Go to the same screen you screenshotted (**API Configuration — Test Mode**)
and fill in:

| Field | Value |
|------|------|
| Test Webhook URL | `https://us-central1-scanza-ai.cloudfunctions.net/intasendWebhook` |
| Test Callback URL | _(leave blank — we don't redirect users)_ |
| IP Whitelist | _(leave empty for now)_ |

Then go to **Webhooks → Settings → Challenge** and paste the same
random string you used for `INTASEND_WEBHOOK_CHALLENGE` above. Save.

---

## 5. Test the flow end-to-end

1. **Sign up** at `/register`
2. Enter your real Safaricom number (e.g. `0712345678`) — IntaSend
   sandbox sends real STK pushes that won't actually charge you.
3. Click **Pay KES 130 via M-Pesa**
4. Your phone receives an STK prompt → enter your PIN
5. Within seconds the page flips to "Payment received!" and routes
   you to verify-email
6. Verify your email, sign in, and the Starter token will be in your
   dashboard

The Dashboard "Buy Tokens" button uses the same flow.

---

## 6. How the security model works

```
┌─────────────────────┐   1. initiateMpesaStkPush(packageId, phone)
│   React Frontend    │ ─────────────────────────────────────┐
│  (Dashboard /       │                                       ▼
│   Register Step 2)  │                          ┌──────────────────────┐
│                     │                          │  Cloud Function      │
│  4. onSnapshot      │                          │  - Validates auth    │
│     listener on     │                          │  - Validates package │
│     /payments/{id}  │ ◀────  Firestore ◀────  │  - Validates phone   │
└─────────────────────┘                          │  - Calls IntaSend    │
                                                  │  - Writes pending    │
                                                  │    payment doc       │
                                                  └──────────────────────┘
                                                              │
                                                              │ 2. STK Push API
                                                              ▼
                                                  ┌──────────────────────┐
                                                  │      IntaSend        │
                                                  │   sandbox/payment    │
                                                  └──────────────────────┘
                                                              │
                                                              │ 3. POST webhook
                                                              ▼
                                                  ┌──────────────────────┐
                                                  │  intasendWebhook     │
                                                  │  - Verifies challenge│
                                                  │  - Atomic transaction│
                                                  │  - Credits tokens    │
                                                  │  - Writes audit log  │
                                                  └──────────────────────┘
```

**What the frontend cannot do:**
- ❌ Set its own token balance (Firestore rules block it)
- ❌ See or use the IntaSend secret key (lives only in Cloud Functions)
- ❌ Forge a "completed" payment (the webhook signature/challenge gates everything)
- ❌ Trigger payment confirmation without actually paying (anti-tamper checks `net_amount === expected price`)

**What the polling fallback does:**
If the webhook is misconfigured or the sandbox is slow, the frontend
also polls `checkPaymentStatus` every 4s for up to 90s. That endpoint
hits IntaSend's `/payment/status/` API and runs the same atomic
crediting logic — so the user is never stuck waiting forever.

---

## 7. Troubleshooting

**"Could not reach payment gateway"**
- Confirm your project is on the **Blaze** plan
- Confirm `INTASEND_SECRET_KEY` is set: `firebase functions:secrets:access INTASEND_SECRET_KEY`

**"Payment gateway rejected the request"**
- IntaSend sandbox sometimes rejects unfamiliar phone numbers — try
  your own real Safaricom number
- Check `firebase functions:log` for the exact error returned by IntaSend

**"Invalid challenge" on webhook**
- The `INTASEND_WEBHOOK_CHALLENGE` secret must match the challenge
  string you set in the IntaSend dashboard exactly (case-sensitive)

**Webhook never fires**
- The polling fallback will still credit the user within ~10 seconds
- Check IntaSend dashboard → Webhooks → Logs to see delivery attempts
- Make sure the URL is the deployed Cloud Function URL, not localhost
