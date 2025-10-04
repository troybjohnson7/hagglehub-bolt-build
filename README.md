# HaggleHub - AI-Powered Car Buying Assistant

Buy your next car smarter with AI-powered negotiation assistance, real market data, and streamlined dealer communication management.

## Features

- **AI-Powered Communication**: Let AI contact dealers, get quotes, and suggest negotiation responses
- **Centralized Deal Tracking**: Manage all negotiations, offers, and messages in one dashboard
- **Smart Insights**: Get AI-powered deal analysis using real market data
- **Community Intelligence**: See what similar cars are actually selling for
- **Private Communication**: Use unique HaggleHub email addresses to keep your inbox clean
- **Real-time Notifications**: Stay updated on deal progress and dealer responses

## Tech Stack

- **Frontend**: React 18 + Vite
- **UI Framework**: Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Email**: Mailgun for sending/receiving
- **AI**: OpenAI GPT-4o for deal analysis
- **Deployment**: Render (Static Site)

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase account with project
- Mailgun account configured
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hagglehub-app
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Add your environment variables to `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
hagglehub-app/
├── src/
│   ├── api/              # API client and entity management
│   ├── components/       # Reusable UI components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── deal_details/ # Deal detail page components
│   │   ├── messages/     # Messaging components
│   │   └── ui/           # Base UI components (Radix)
│   ├── pages/            # Route pages
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Main app component with routing
│   └── main.jsx          # App entry point
├── supabase/
│   ├── functions/        # Edge Functions (TypeScript)
│   └── migrations/       # Database migrations
├── public/               # Static assets
└── dist/                 # Production build output
```

## Environment Variables

### Required for Frontend

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Required for Edge Functions (in Supabase)

- `OPENAI_API_KEY` - OpenAI API key for deal analysis
- `MAILGUN_DOMAIN` - Your Mailgun domain
- `MAILGUN_API_KEY` - Your Mailgun API key
- `SUPABASE_URL` - Auto-configured by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured by Supabase

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Render.

### Quick Deploy to Render

1. Push to GitHub
2. Connect repository to Render
3. Render will auto-detect `render.yaml` configuration
4. Add environment variables in Render dashboard
5. Deploy and configure custom domain

## Configuration Files

- `render.yaml` - Render deployment configuration
- `vite.config.js` - Vite build configuration with optimizations
- `tailwind.config.js` - Tailwind CSS configuration
- `.env.example` - Environment variables template

## Key Integrations

### Supabase
- PostgreSQL database for all data storage
- Row Level Security (RLS) for data protection
- Edge Functions for serverless backend operations
- Real-time subscriptions for live updates

### Mailgun
- Send emails to dealers from HaggleHub addresses
- Receive dealer responses via webhook
- Track email delivery, opens, and clicks
- Parse incoming messages automatically

### OpenAI
- GPT-4o for intelligent deal analysis
- Market comparison and insights
- Negotiation recommendations
- Proactive urgency detection

## Testing

For comprehensive testing procedures, see:
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Detailed testing scenarios
- [QUICK_TEST_REFERENCE.md](./QUICK_TEST_REFERENCE.md) - Quick testing checklist

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [MAILGUN_SETUP.md](./MAILGUN_SETUP.md) - Email configuration
- [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) - Initial setup status
- [AUTO_INSIGHTS_SYSTEM.md](./AUTO_INSIGHTS_SYSTEM.md) - Smart Insights feature

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Initial bundle: ~382KB (gzipped: ~109KB)
- Code splitting for optimal loading
- Lazy loading for routes
- Optimized asset caching
- No console logs in production

## License

Proprietary - All rights reserved

## Support

For support and questions, contact: support@hagglehub.app

## Contributing

This is a private project. Contributions are by invitation only.
