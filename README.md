# ⚡ PulseSocial Luxe — Next-Gen Full-Stack Social Media Platform

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/Glassmorphism_UI-1572B6?style=for-the-badge&logo=css3&logoColor=white)

> **CodeAlpha Full-Stack Development Internship — Task 2: Social Media Platform**  
> A full-stack, glassmorphic social networking application featuring adaptive Day/Night themes, real-time Direct Messaging, an integrated `@PulseAI` content co-pilot, voice-to-post dictation, and complete social graph interactions.

---

## ✨ Key Features

### 🔹 Core Social Media Engine
* **Authentication & Security:** Custom SHA-256 password hashing, persistent user sessions, and 1-click instant Demo Environment seeding.
* **Rich User Profiles:** Custom profile avatars, cover banners, bio headlines, verified creator badges, and dynamic follower/following metrics.
* **Interactive Posts & Hashtags:** Create text and high-res image posts, auto-parsed clickable `#hashtags`, real-time likes, comment threads, and post deletion.
* **Follow System & Feed Filters:** Follow/unfollow creators with dedicated **Explore**, **Following**, and **Saved Bookmarks** feeds.

### 💎 Luxury & Next-Gen Additions
* **Adaptive Day / Night Engine + 5 Luxury Accents:** Switch seamlessly between *Midnight Obsidian (Dark)* and *Daylight Alabaster (Light)* modes with 5 live neon accent palettes (*Electric Indigo, Royal Gold, Emerald Luxe, Crimson Rose, Cyber Cyan*).
* **Dual-Mode Floating Messenger (`PulseChat & @PulseAI`):** Send real-time Direct Messages to any user in the database or prompt the built-in `@PulseAI` assistant to generate post drafts and insert them straight into the composer.
* **Voice-to-Post Dictation:** Built-in Web Speech API integration allowing hands-free voice transcription directly into the post editor.
* **Multi-Platform Share Suite & Bookmarks:** Share posts via WhatsApp, X (Twitter), LinkedIn, or clipboard with live database share counters.
* **100% Responsive Mobile App Bar:** Automatically transforms into a native-style bottom navigation bar on mobile screens.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Variables & Glassmorphism), Vanilla JavaScript (ES6+), Web Speech API |
| **Backend** | Node.js, Express.js (RESTful API Architecture) |
| **Database** | MongoDB & Mongoose ODM (`User`, `Post`, `Comment`, `Message` schemas) |
| **Icons & Fonts** | Font Awesome 6.5, Google Fonts (*Plus Jakarta Sans*) |

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate user & return session profile |
| `GET` | `/api/users` | Fetch all creators for discovery & suggestions |
| `GET` | `/api/users/:id` | Get a specific user's profile and posts |
| `PUT` | `/api/users/:id` | Update profile details, banner, verification, or password |
| `POST` | `/api/users/:id/follow` | Toggle follow/unfollow status between users |
| `GET` | `/api/posts` | Fetch all posts with populated user & comment data |
| `POST` | `/api/posts` | Publish a new post |
| `DELETE` | `/api/posts/:id` | Delete a post and its associated comments |
| `POST` | `/api/posts/:id/like` | Toggle like/unlike on a post |
| `POST` | `/api/posts/:id/share` | Increment live share counter on a post |
| `POST` | `/api/posts/:id/comments` | Add a comment to a post |
| `GET` | `/api/messages/:userId/:targetId` | Fetch direct message history between two users |
| `POST` | `/api/messages` | Send a real-time direct message |
| `POST` | `/api/seed` | Seed demo users, posts, comments, and social graph |

---

## 🚀 Local Installation & Quick Start

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/nahin9611/CodeAlpha_SocialMedia.git](https://github.com/nahin9611/CodeAlpha_SocialMedia.git)
   cd CodeAlpha_SocialMedia