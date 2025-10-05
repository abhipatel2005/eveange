# Event Management Platform

A comprehensive, modern event management platform with React TypeScript frontend, Node.js backend, and integrated mapping services.

## 🌟 Features

### Core Features

- **Event Creation & Management**: Full-featured event creation with rich forms
- **User Registration & Authentication**: Secure user accounts with role-based access
- **QR Code Generation & Scanning**: Automated attendance tracking
- **Digital Certificate Generation**: Automatic certificate creation and distribution
- **Payment Integration**: Stripe payment processing for paid events
- **Analytics Dashboard**: Comprehensive event analytics and insights

### Location Services (WORKING!)

- **Interactive Map Integration**: Backend proxy with OpenStreetMap fallback for reliable location search
- **Location Picker**: Autocomplete search with coordinate extraction (CORS-free)
- **Map Display**: Interactive maps on event details with navigation options
- **Multiple Map Providers**: Support for Google Maps and MapMyIndia (when properly configured)
- **Fallback System**: Reliable OpenStreetMap Nominatim API ensures service continuity

### Modern UI/UX

- **Professional Design**: Industry-standard UI inspired by leading platforms
- **Responsive Layout**: Mobile-first design with Tailwind CSS
- **Glassmorphism Effects**: Modern visual effects and animations
- **Navigation Overlays**: Space-efficient navigation with backdrop blur
- **Enhanced Dropdowns**: Rich content with icons and descriptions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account (for database and auth)
- MapMyIndia API key (free tier available)
- Stripe account (for payments)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd eveange
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Configure environment variables**

   Create `frontend/.env`:

   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   VITE_MAPMYINDIA_API_KEY=your_mapmyindia_api_key
   ```

   Create `backend/.env`:

   ```env
   DATABASE_URL=your_postgresql_url
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=your_stripe_secret_key
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_password
   ```

4. **Setup database**

   ```bash
   # Run database migrations
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
eveange/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # Basic UI components (MapLocationPicker, MapDisplay)
│   │   │   └── admin/       # Admin-specific components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand state management
│   │   ├── api/             # API client and types
│   │   └── utils/           # Utility functions
│   └── dist/                # Built frontend assets
├── backend/                 # Node.js Express backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Backend utilities
│   └── dist/                # Compiled backend code
├── shared/                  # Shared TypeScript types and schemas
│   ├── src/
│   │   └── schemas.ts       # Zod validation schemas
│   └── dist/                # Compiled shared types
└── docs/                    # Documentation
```

## 🗺️ MapMyIndia Integration

### Features

- **Location Autocomplete**: Real-time search with MapMyIndia Atlas API
- **Interactive Maps**: Full map display with custom markers
- **Coordinate Storage**: Precise latitude/longitude for events
- **External Navigation**: Direct links to Google Maps and MapMyIndia
- **Error Handling**: Graceful fallbacks when API is unavailable

### Setup MapMyIndia API

1. **Get API Key**

   - Visit [MapMyIndia Developer Portal](https://apis.mapmyindia.com/)
   - Sign up for free account
   - Create project and generate API key

2. **Configure Environment**

   ```env
   VITE_MAPMYINDIA_API_KEY=your_actual_api_key_here
   ```

3. **Usage in Event Creation**

   - Search and select location with autocomplete
   - Coordinates automatically extracted and stored
   - Visual confirmation of selected location

4. **Usage in Event Details**
   - Interactive map display for events with coordinates
   - Toggle map visibility to save space
   - External navigation options

See [MAPMYINDIA_INTEGRATION.md](./MAPMYINDIA_INTEGRATION.md) for detailed documentation.

## 🎨 UI/UX Improvements

### Modern Design System

- **Glassmorphism**: Backdrop blur effects with semi-transparent backgrounds
- **Professional Color Palette**: Slate, blue, emerald, and purple accent colors
- **Smooth Animations**: Transition effects and hover states
- **Consistent Typography**: Modern font hierarchy and spacing

### Navigation Enhancements

- **Overlay Navigation**: Space-efficient navigation on hero images
- **Enhanced Dropdowns**: Rich content with icons and descriptions
- **Responsive Design**: Mobile-optimized layouts and interactions
- **Z-index Management**: Proper layering for overlays and modals

### Performance Optimizations

- **Code Splitting**: Dynamic imports for better loading times
- **Image Optimization**: Responsive images with proper loading
- **Bundle Analysis**: Build optimization warnings and suggestions

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Start frontend only (port 5173)
npm run dev:backend           # Start backend only (port 3001)

# Building
npm run build                 # Build entire project
npm run build:frontend        # Build frontend only
npm run build:backend         # Build backend only
npm run build:shared          # Build shared types

# Installation
npm run install:all           # Install all dependencies
```

### Development Workflow

1. **Start Development**

   ```bash
   npm run dev
   ```

2. **Frontend Development**

   - React app runs on `http://localhost:5173`
   - Hot reload enabled for instant updates
   - TypeScript compilation with strict mode

3. **Backend Development**

   - Express server runs on `http://localhost:3001`
   - Nodemon for automatic restarts
   - API endpoints at `/api/*`

4. **Shared Types**
   - Build shared package when updating schemas
   ```bash
   cd shared && npm run build
   ```

## 🔧 Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Hook Form** with Zod validation
- **Zustand** for state management
- **Lucide React** for icons

### Backend

- **Node.js** with Express.js
- **TypeScript** for type safety
- **Supabase** for database and auth
- **Stripe** for payment processing
- **Nodemailer** for email notifications
- **JWT** for authentication

### External Services

- **MapMyIndia API** for mapping services
- **Supabase** for database and authentication
- **Stripe** for payment processing
- **SMTP** for email delivery

## 📱 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Event Endpoints

- `GET /api/events` - List events with pagination
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Registration Endpoints

- `POST /api/registrations` - Register for event
- `GET /api/registrations/user` - Get user registrations
- `PUT /api/registrations/:id` - Update registration

### Location Data Structure

```typescript
interface Event {
  id: string;
  title: string;
  location: string;
  latitude?: number; // NEW: Map coordinates
  longitude?: number; // NEW: Map coordinates
  // ... other fields
}
```

## 🚀 Deployment

### Frontend Deployment

- Build static assets: `npm run build:frontend`
- Deploy `frontend/dist` to any static hosting (Vercel, Netlify, etc.)

### Backend Deployment

- Build backend: `npm run build:backend`
- Deploy to Node.js hosting (Railway, Heroku, etc.)
- Ensure environment variables are configured

### Database Setup

- Use Supabase for hosted PostgreSQL
- Run migrations and seed data
- Configure Row Level Security (RLS)

## 🧪 Testing

### Frontend Testing

```bash
cd frontend
npm run test          # Run Jest tests
npm run test:coverage # Generate coverage report
```

### Backend Testing

```bash
cd backend
npm run test          # Run backend tests
npm run test:integration # Integration tests
```

## 📈 Performance

### Frontend Optimization

- Tree shaking for unused code elimination
- Code splitting for route-based chunks
- Image optimization and lazy loading
- Bundle size monitoring and warnings

### Backend Optimization

- Database query optimization
- Caching strategies for frequent requests
- API rate limiting
- Compression middleware

## 🔒 Security

### Frontend Security

- Environment variable protection
- XSS prevention with React's built-in protection
- HTTPS enforcement in production
- Content Security Policy headers

### Backend Security

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Rate limiting and DDoS protection
- SQL injection prevention

## 🐛 Troubleshooting

### Common Issues

1. **MapMyIndia API not working**

   - Verify API key in `.env` file
   - Check browser console for errors
   - Ensure HTTPS in production

2. **Build failures**

   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

3. **Database connection issues**
   - Check Supabase connection string
   - Verify network connectivity
   - Check database permissions

### Debug Mode

- Enable verbose logging in development
- Use browser developer tools
- Check network requests in Network tab

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Documentation**: Check the docs/ directory
- **Issues**: Open GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

---

**Event Management Platform** - Built with ❤️ using modern web technologies
