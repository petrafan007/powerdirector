# PowerDirector Channel Connectivity Guide

This guide explains how to obtain the necessary credentials and tokens for the various messaging channels supported by PowerDirector.

## Table of Contents
1. [Telegram](#telegram)
2. [Discord](#discord)
3. [Slack](#slack)
4. [Google Chat](#google-chat)
5. [WhatsApp](#whatsapp)
6. [iMessage (BlueBubbles)](#imessage-bluebubbles)

---

## Telegram
1. Open Telegram and search for **@BotFather**.
2. Sent `/newbot` and follow the instructions to name your bot.
3. BotFather will provide an **API Token**.
4. Add this to your `.env` as `TELEGRAM_TOKEN`.

## Discord
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click "New Application" and give it a name.
3. Go to the **Bot** tab and click "Reset Token" to get your **Bot Token**.
4. Ensure **Message Content Intent** is enabled under "Privileged Gateway Intents".
5. Add the token to your `.env` as `DISCORD_TOKEN`.

## Slack
1. Go to [Slack API: Applications](https://api.slack.com/apps).
2. Create a new app "From scratch".
3. Under **OAuth & Permissions**, add `chat:write`, `app_mentions:read`, and `im:read` scopes.
4. Install the app to your workspace to get the **Bot User OAuth Token** (starts with `xoxb-`).
5. Under **Basic Information**, get your **App-level Token** (starts with `xapp-`) with `connections:write` scope.
6. Add these to your `.env` as `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`.

## Google Chat
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Chat API**.
3. Create a **Service Account** and download the JSON key file.
4. Set `GOOGLE_CHAT_CREDENTIALS` in your `.env` to the stringified JSON or the path to the file.
5. In the Chat API configuration, set the **Interactive endpoint** to your PowerDirector `/api/google-chat` URL.

## WhatsApp
PowerDirector uses `whatsapp-web.js`.
1. Ensure `WHATSAPP_ENABLED=true` in your `.env`.
2. On the first run, a **QR Code** will appear in the terminal.
3. Scan it with your phone's WhatsApp app (Linked Devices).

## iMessage (BlueBubbles)
Requires a running [BlueBubbles](https://bluebubbles.app/) server (likely on a Mac).
1. Get your server URL and API Password from the BlueBubbles settings.
2. Add them to your `.env` as `BLUEBUBBLES_URL` and `BLUEBUBBLES_PASSWORD`.
