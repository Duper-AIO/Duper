# Duper AIO (All-In-One)

**Duper AIO** is a robust personal management application designed to bring your productivity, health, finance, and security into one seamless ecosystem. Whether you are tracking daily habits, managing finances, or securing private notes, Duper AIO handles it all with an intuitive and sleek interface.

## 📸 App Gallery

<p align="center">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Homepage.png?raw=true" height="300" alt="Homepage" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Notes.png?raw=true" height="300" alt="Notes" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Voice%20Notes.png?raw=true" height="300" alt="Voice Notes" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Read%20Later%20Link.png?raw=true" height="300" alt="Read Later" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Locked%20Notes.png?raw=true" height="300" alt="Locked Notes" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Task%20List.png?raw=true" height="300" alt="Task List" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Add%20Task.png?raw=true" height="300" alt="Add Task" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Transtion.png?raw=true" height="300" alt="Transactions" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/Expense,%20Income%20breakdown.png?raw=true" height="300" alt="Expense Breakdown" style="margin-right: 10px;">
  <img src="https://github.com/anextsar/AppPhoto/blob/main/DuperImage/User%20Profile.png?raw=true" height="300" alt="User Profile">
</p>

---

## 🌟 Key Features

## Supabase setup

Duper uses Supabase email/password authentication and a private, per-user database table for profile, planner, focus, water, notes, and expense data. Existing local data is imported the first time an account is connected on a device. The Android planner widget continues to use a local cache.

1. Copy `.env.example` to `.env` and fill in the Supabase project URL and **publishable** key. `.env` is ignored by Git.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) to create the data table, private media bucket, and row-level security policies. Re-run it if you previously applied the earlier version; it is safe to run repeatedly.
3. Enable Email authentication in Supabase. If email confirmation is enabled, confirm the address before signing in.
4. Restart Expo after changing environment variables: `npm run start`.

For Expo builds and GitHub Actions, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment instead of committing `.env`. Expo embeds `EXPO_PUBLIC_` values in the client bundle; only use the Supabase publishable key here. Never use a `service_role` key or database password in the app.

Text and structured app records, profile pictures, and voice recordings sync through the private `duper-media` bucket. Each account can access only its own records and uploaded files. Audio uploads are limited to 50 MB per file.

### 🏠 Comprehensive Dashboard & Health Hub
The **Home Page** acts as your central command centre, offering real-time updates on your environment and personal progress.
* **Status at a Glance:** View your active streaks and daily progress immediately upon opening the app.
* **Weather Integration:** Automatically displays the current temperature and weather conditions to help you plan your day.
* **Hydration Tracker:** A dedicated water intake counter helps you maintain daily hydration goals.
* **Upcoming Tasks:** A preview section highlights your most urgent tasks so you never miss a deadline.

### 📝 Advanced Secure Notes
A powerful note-taking suite separated into three specialised tabs: **Text Notes**, **Read Later Links**, and **Voice/Audio Notes**.
* **Gesture Controls:**
    * **Swipe Right:** Instantly delete a note.
    * **Swipe Left:** Quickly edit the content of a note.
* **Privacy Vault:** Includes a security feature to password-protect individual notes and audio files, ensuring your sensitive information remains private.

### 📅 Smart Planner & Notification System
Manage your time effectively with a visual calendar and smart alerting system.
* **Calendar View:** A full calendar interface allows users to visualise their schedule.
* **Task Scheduling:** Add tasks with detailed descriptions.
* **Custom Alerts:** The app ensures you are always on time with customizable notification options:
    * **Pre-alerts:** Get notified 5 minutes or 30 minutes before a task.
    * **Feedback:** Supports both ringtone and vibration alerts to grab your attention.

### 💰 Financial Manager
Take control of your wallet with detailed transaction tracking.
* **Transaction Logging:** Record every expense and income source.
* **Visual Analytics:** The "Expense & Income Breakdown" feature provides a clear visual representation of your financial health, helping you identify spending patterns.

### 👤 Profile & Settings
* **Personalisation:** Update your user profile image, display name, and personal details.
* **Developer Access:** Access developer information and app credits directly from the profile footer.

---

## 📞 Contact Developer

If you have any questions, feedback, or collaboration ideas, feel free to reach out:

* **Email:** [dhiraj7kr@gmail.com]
* **LinkedIn:** [Linkedin](https://www.linkedin.com/in/dhiraj7kr/)]
* **GitHub:** [dhiraj7kr](https://github.com/dhiraj7kr)

---

### 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/anextsar/AppPhoto/issues).
