# Calorie Tracker

A personal mobile app built with React Native (Expo) that uses AI to identify food from photos and track daily calorie and macro intake.

## Features

- **AI Food Detection** — Take a photo of your meal and Claude AI automatically identifies the food and estimates calories, protein, carbs, and fat
- **Daily Tracking** — Track your daily calorie and macro intake with a clean progress dashboard
- **TDEE Calculator** — Set up your profile (age, weight, height, activity level, goal) and get a personalized daily calorie and macro target
- **6 Goals** — Lose Fast, Lose Weight, Maintain, Gain Muscle, Gain Weight, Gain Fast
- **AI Recommendations** — Get personalized meal and activity suggestions based on your profile and remaining calories for the day
- **Meal History** — View your past meals organized by day with daily totals
- **Edit Results** — Manually adjust AI-detected calories and macros if needed

## Tech Stack

- **React Native** with Expo (SDK 54)
- **Expo Router** for navigation
- **AsyncStorage** for local data persistence
- **Claude API** (Haiku) for food photo analysis and recommendations
- **expo-image-picker** for camera and photo library access

## Getting Started

### Prerequisites
- Node.js 18+
- Expo Go app on your iPhone
- Anthropic API key

### Installation

```bash
git clone https://github.com/ibnunajib07/calorie-tracker.git
cd calorie-tracker
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_claude_api_key_here
```

### Run

```bash
npx expo start
```

Scan the QR code with Expo Go on your iPhone.

## Project Structure

```
calorie-tracker/
├── app/
│   ├── _layout.jsx       # Tab navigation
│   ├── index.jsx         # Home screen (daily progress)
│   ├── camera.jsx        # Food photo + AI analysis
│   ├── recommend.jsx     # AI meal & activity recommendations
│   ├── history.jsx       # Meal history by day
│   └── profile.jsx       # Body stats & TDEE calculator
└── store/
    └── userStore.js      # Local data management + TDEE formulas
```

## Cost

This app uses Claude API (Haiku model) which is very affordable:
- Food photo analysis: ~$0.02 per photo
- AI recommendations: ~$0.003 per request
- Estimated monthly cost for 2 users: ~$3-5
