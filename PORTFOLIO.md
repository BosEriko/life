# Life Tracker

A personal health diary. You log a few simple things each day and it turns them
into a picture of how you're doing over time. Anyone can create an account;
every account only ever sees its own data.

---

## What you can keep track of

- Weight
- Water — how much you drank, with quick-add buttons for your usual glass or bottle
- Food and drinks — what it was, roughly how much, and (optionally) calories and
  sodium; you can also mark something as "junk"
- Blood pressure — as many readings a day as you want
- Two daily habits: did you bathe, did you brush your teeth
- Free-form notes — just write down how the day felt

## The main screen

- Your recent averages for weight, blood pressure, and water, with a note of
  whether you're above or below your target
- A colored calendar grid showing your streaks — green for good habits, a warm
  color for junk food/drink days
- A trend graph you can flip between weight, blood pressure, and water, and
  scroll back through time
- A short list of the last several days with the key numbers, shown in red if
  they're outside the range you set
- Controls to move day by day, jump to today, or change the graph's time span

## Targets

You can set a healthy min/max for weight, blood pressure, water, calories, and
sodium. Anything outside that range gets flagged in red around the app so it's
easy to spot.

## Notes and history

- A dedicated Notes page where you can browse everything you've written and jump
  to a specific day
- A history page with full tables of every weight, water, blood-pressure, and
  food entry you've ever made

## Downloadable report

- Make a PDF for any time span (last week, month, year, everything)
- Tick which things to include
- It comes out with a summary, a day-by-day table, and clean trend charts

## Nice touches

- Choose your units — kilograms or pounds, milliliters/liters or fluid ounces,
  feet-inches or centimeters — and the whole app switches
- Works with a spotty or missing connection: your entries save on your device and
  sync up later, with a little "saved offline" message so you know
- Light and dark mode
- Built to be used on your phone, with a bar of shortcuts along the bottom, and it
  can be added to your home screen like a normal app
- When you share the link, it shows a proper preview card with the logo and a
  short description
- If you use an AI assistant, there's a page that gives you a link so the
  assistant can read your tracked data and answer questions about it
- The app can estimate calories and sodium for a food entry when you don't feel
  like looking them up

---

## Built with

Next.js 16 (App Router), React 19, TypeScript, Ant Design 6, and Firebase
(sign-in + database). Charts and PDF export are loaded only when needed. Designed,
built, and maintained solo.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

`NEXT_PUBLIC_FIREBASE_*` in `.env.local` holds the client Firebase config (public
by design). `npm run rules:build` compiles `firestore.rules` from the template.
