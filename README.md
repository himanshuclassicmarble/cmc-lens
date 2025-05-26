# Marble Analyzer - Next.js 15 Setup Guide

A modern web application that uses webcam capture and BLIP-2 AI to analyze marble images and generate detailed metadata.

## Features

- 📱 **Webcam Integration**: Capture marble images directly from your device's camera
- 🔍 **AI-Powered Analysis**: Uses BLIP-2 model for detailed marble description
- 📊 **Comprehensive Metadata**: Generates structured data about color, texture, patterns, and quality
- 💾 **Export Functionality**: Download analysis results as JSON metadata files
- 🎨 **Modern UI**: Beautiful, responsive interface with glassmorphism design
- 📱 **Mobile Optimized**: Works seamlessly on desktop and mobile devices

## Prerequisites

- Node.js 18+ installed
- Replicate API account and token
- Modern web browser with camera access

## Installation

### 1. Create Next.js 15 Project

```bash
npx create-next-app@latest marble-analyzer --typescript --tailwind --eslint --app
cd marble-analyzer
```

### 2. Install Dependencies

```bash
npm install replicate lucide-react
```

### 3. Environment Setup

Create a `.env.local` file in your project root:

```env
REPLICATE_API_TOKEN=your_replicate_token_here
```

Get your Replicate API token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)

### 4. Project Structure

Create the following files:

```
marble-analyzer/
├── app/
│   ├── api/
│   │   └── analyze-marble/
│   │       └── route.js          # API endpoint for BLIP-2 integration
│   ├── page.js                   # Main React component
│   └── layout.js                 # Root layout
├── .env.local                    # Environment variables
└── package.json
```

### 5. Add the Main Component

Replace the content of `app/page.js` with the React component provided above.

### 6. Create the API Route

Create `app/api/analyze-marble/route.js` with the API code provided above.

### 7. Update Root Layout (Optional)

Update `app/layout.js` to include proper metadata:

```javascript
export const metadata = {
  title: 'Marble Analyzer',
  description: 'AI-powered marble image analysis and metadata generation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

## Usage

### 1. Start Development Server

```bash
npm run dev
```

### 2. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Analyze Marble Images

1. **Grant Camera Permission**: Allow browser access to your camera
2. **Position Sample**: Place your marble sample in good lighting
3. **Capture Image**: Click "Capture Photo" to take a picture
4. **Analyze**: Click "Analyze" to process the image with BLIP-2
5. **Export Data**: Download the generated metadata as JSON

## API Endpoints

### POST /api/analyze-marble

Analyzes uploaded marble images using BLIP-2.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with 'image' field containing the image file

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-20T10:30:00.000Z",
  "metadata": {
    "general_description": "This is a marble sample with...",
    "material_type": "Natural marble stone",
    "colors_patterns": "White background with gray veining...",
    "surface_finish": "Polished smooth finish",
    "dominant_colors": "White, gray, and subtle beige tones",
    "veins_patterns": "Irregular gray veining throughout...",
    "overall_quality": "High-quality marble with consistent...",
    "notable_features": "Distinctive veining pattern...",
    "detailed_analysis": { /* Full Q&A pairs */ },
    "analysis_metadata": {
      "model_used": "BLIP-2",
      "total_questions": 8,
      "processing_time": "2024-01-20T10:30:00.000Z",
      "image_format": "image/jpeg",
      "image_size": 1234567
    }
  }
}
```

## Analysis Features

The app analyzes marble images across multiple dimensions:

- **General Identification**: Overall description and material type
- **Visual Characteristics**: Colors, patterns, and dominant hues
- **Physical Properties**: Texture, surface finish, and quality assessment
- **Distinctive Features**: Veining, streaks, flaws, and unique characteristics
- **Technical Metadata**: Processing details and image information

## Camera Configuration

The app is optimized for marble photography:

- **Resolution**: 1280x720 for detailed capture
- **Camera Selection**: Prefers rear camera on mobile devices
- **Format**: JPEG compression for optimal file sizes
- **Constraints**: Configured for material photography

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set your `REPLICATE_API_TOKEN` in Vercel environment variables.

### Other Platforms

The app can be deployed to any platform supporting Next.js 15:
- Netlify
- AWS Amplify
- Railway
- Render

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.3+)
- **Mobile**: Optimized for mobile browsers

## Performance Considerations

- **Image Processing**: Client-side image capture with server-side AI analysis
- **API Calls**: Parallel processing of multiple analysis questions
- **Error Handling**: Comprehensive error management and user feedback
- **Loading States**: Clear indication of processing status

## Troubleshooting

### Camera Issues
- Ensure HTTPS connection (required for camera access)
- Check browser permissions for camera access
- Try refreshing the page if camera doesn't initialize

### API Errors
- Verify `REPLICATE_API_TOKEN` is correctly set
- Check Replicate account has sufficient credits
- Monitor network connectivity for API calls

### Performance Issues
- Large images may take longer to process
- Consider image compression for faster uploads
- Check Replicate API rate limits

## License

This project is open source and available under the MIT License.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
