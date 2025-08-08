# High Standards Jazz Radio Player

A sophisticated streaming radio player for George Fendel's jazz radio recordings, featuring a dark theme with classic jazz aesthetics and modern functionality.

## Features

### 🎵 Player Interface
- **Elegant Landing Page** with animated "ON AIR" neon sign
- **Full Audio Controls**: Play/pause, previous/next, volume, seek bar
- **Interactive Playlist** with current track highlighting
- **Mobile-Responsive Design** using Tailwind CSS
- **Jazz-Inspired Theme** with amber/orange color palette

### 🎙️ Admin Panel
- **Easy Content Management** via microphone icon in bottom-left
- **Add/Edit/Delete Recordings** with full CRUD operations
- **Form Validation** and clean interface
- **Secure Admin Access** (click mic icon to access)

### 📱 Technical Features
- **Next.js 14** with TypeScript
- **React State Management** (no localStorage dependencies)
- **Responsive Design** that works on all devices
- **Widget-Ready Architecture** for easy embedding
- **Smooth Animations** and hover effects throughout

## Getting Started

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment on Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically detect Next.js and deploy
4. Your app will be live at `https://your-app-name.vercel.app`

## Project Structure

```
high-standards-jazz-radio/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       └── JazzRadioPlayer.tsx
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Usage

### Landing Page
- Features an animated "ON AIR" radio sign with pulsing effects
- Click "ENTER" to access the main player interface

### Main Player
- **Play/Pause**: Control audio playback
- **Navigation**: Use previous/next buttons or click playlist items
- **Volume**: Adjust volume or mute with slider and button
- **Seek**: Click anywhere on the progress bar to jump to that position

### Admin Panel
- **Access**: Click the microphone icon in the bottom-left corner
- **Add Recordings**: Fill out the form and click "Add Recording"
- **Edit**: Click the edit icon next to any recording
- **Delete**: Click the trash icon to remove recordings

## Customization

### Adding Your Own Recordings
1. Access the admin panel (mic icon)
2. Fill out the recording form with:
   - Title
   - Description
   - Date
   - Duration
   - Audio URL (must be a direct link to an audio file)
3. Click "Add Recording"

### Styling
The app uses Tailwind CSS with a custom color palette inspired by jazz aesthetics:
- **Primary**: Amber/Orange gradients
- **Accent**: Emerald green for highlights
- **Background**: Dark grays and blacks
- **Text**: Various shades of white and amber

### Widget Integration
The player is designed to be embedded as a widget on other websites. The component can be easily imported and used in other React applications.

## Browser Compatibility

- Modern browsers with ES6 support
- Mobile browsers (iOS Safari, Android Chrome)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## License

This project is created for George Fendel's High Standards Jazz Radio show.

## Support

For technical issues or questions, please create an issue in the GitHub repository.
