# The Little Big Question — proposal website

A personalized proposal website with:
- A creator page for both names and both email addresses
- Optional personal message
- Optional background photo upload (JPG, PNG, WEBP, GIF; max 5 MB)
- A private proposal link emailed to the partner
- Yes / No choices on the proposal page
- The partner's answer emailed to the proposer
- A copy-link option as a backup

## Important: email and public hosting are required

This project cannot email invitations or answers until you configure SMTP credentials. It also needs to be deployed to a public host before your partner can open the link from their phone. The default `http://localhost:3000` address only works on your own computer.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in the SMTP settings provided by your email provider. For a real deployment, set `BASE_URL` to the public HTTPS address of your hosted website.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Email configuration

Use SMTP credentials from an email/transactional-email provider that permits sending to the recipient. Do not use your normal email password unless the provider explicitly supports it; use an app password or SMTP/API credential where appropriate. Keep `.env` private and never upload it to a public repository.

`EMAIL_FROM` should be an address or sender identity your provider has verified. Some providers require you to verify a sending domain before they will deliver mail reliably.

## Deployment notes

Deploy the Node app to a host that supports persistent storage and file uploads, then set:
- `BASE_URL` = the deployed HTTPS URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

The app stores proposal records in `data/proposals.json` and uploaded images in `uploads/`. The hosting service must preserve these between restarts. If your host uses ephemeral storage, replace this simple JSON/file storage with a database and persistent object storage before relying on it.

## Privacy and consent

The proposal link is unlisted and uses a random token, but anyone who receives the link can open it. Avoid putting sensitive information in the personal note. The app records the submitted answer and sends it to the proposer. It offers a clear Yes and No option and does not hide or obstruct either choice.

## Troubleshooting

- **Email isn't sending:** check SMTP values, sender verification, provider sending limits, and spam/junk folders.
- **The link doesn't open on another phone:** deploy the app and set `BASE_URL` to the public HTTPS URL.
- **Photo upload fails:** choose a supported image file no larger than 5 MB.
