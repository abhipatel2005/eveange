# Event Management Platform

A comprehensive event management platform built with React TypeScript frontend, Node.js Express backend, and Supabase database. The platform includes user authentication, event creation, registration forms, attendance tracking with QR codes, and certificate generation.

## 🚀 Features

### Core Functionality

- **User Authentication & Management**

  - User registration and sign-in system with role-based access
  - Profile management with organization details
  - Dashboard for managing multiple events and analytics

- **Dynamic Event Creation**

  - Event creation wizard with comprehensive details
  - Event categorization and tagging system
  - Upload event banners and promotional materials
  - Set event visibility (public, private, or invite-only)

- **Flexible Registration Form Builder**

  - Drag-and-drop form builder with various field types
  - Conditional logic for dynamic form fields
  - Custom validation rules and required field configuration
  - Multi-step registration forms for complex events

- **Registration Management**

  - Shareable registration links with custom URLs
  - QR code generation for easy form access
  - Registration deadline and capacity management
  - Automated confirmation emails
  - Payment integration for paid events

- **Attendance Tracking System**

  - Generate unique QR codes for each registered participant
  - Mobile-friendly QR scanner interface
  - Real-time attendance marking with timestamp
  - Bulk attendance management and manual check-in options

- **Certificate Generation & Distribution**
  - Customizable certificate templates with drag-and-drop designer
  - Dynamic certificate generation with participant details
  - Automated certificate distribution via email
  - Certificate verification system with unique IDs

## 🛠️ Technical Architecture

### Frontend (React TypeScript)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Zustand for client state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router DOM
- **QR Codes**: react-qr-code and @zxing/library
- **PDF Generation**: react-pdf and jsPDF
- **UI Components**: Lucide React icons
- **Notifications**: React Hot Toast

### Backend (Node.js TypeScript)

- **Framework**: Express.js with TypeScript
- **Authentication**: JWT with refresh tokens
- **File Uploads**: Multer with cloud storage
- **Email Service**: Nodemailer
- **PDF Generation**: Puppeteer and PDFKit
- **QR Code Generation**: qrcode library
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Winston

### Database (Supabase)

- **Database**: PostgreSQL with Supabase
- **Authentication**: Supabase Auth
- **Real-time**: Supabase subscriptions
- **Storage**: Supabase Storage for files
- **Security**: Row Level Security (RLS)

## 📁 Project Structure

```
event-management-platform/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand stores
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── api/            # API service layer
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Node.js Express backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── routes/         # Express routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   └── package.json
├── shared/                  # Shared types and schemas
│   ├── src/
│   │   └── schemas.ts      # Zod schemas for validation
│   └── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd event-management-platform
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Environment Setup**

   **Backend Environment** (Create `backend/.env`):

   ```env
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:5173

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_KEY=your_supabase_service_key_here

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

   # Email Configuration
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   EMAIL_FROM=noreply@yourdomain.com

   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key_here
   ```

   **Frontend Environment** (Create `frontend/.env`):

   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Database Setup**

   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to the environment files
   - Run the database migrations (scripts to be added)

5. **Start the development servers**

   ```bash
   npm run dev
   ```

   This will start both the frontend (http://localhost:5173) and backend (http://localhost:3001) servers.

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend development server
- `npm run dev:backend` - Start only the backend development server
- `npm run build` - Build both frontend and backend for production
- `npm run install:all` - Install dependencies for all packages
- `npm run clean` - Clean all node_modules and build directories

## 🔧 Development Workflow

### Frontend Development

- Components are located in `frontend/src/components/`
- Pages are located in `frontend/src/pages/`
- Use TypeScript for all components and utilities
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling

### Backend Development

- Controllers are located in `backend/src/controllers/`
- Routes are defined in `backend/src/routes/`
- Use TypeScript for all server code
- Follow Express.js best practices
- Implement proper error handling and validation

### Shared Types

- All shared types and Zod schemas are in `shared/src/`
- Import shared types in both frontend and backend
- Maintain consistency across the entire application

## 🎯 Roadmap

- [x] Project scaffolding and basic structure
- [ ] User authentication system
- [ ] Event creation and management
- [ ] Dynamic registration form builder
- [ ] QR code generation and scanning
- [ ] Attendance tracking system
- [ ] Certificate generation and templates
- [ ] Payment integration
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Mobile responsiveness
- [ ] API documentation
- [ ] Testing suite
- [ ] Deployment configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you have any questions or need help with the project, please open an issue on GitHub.

## 🔗 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Express.js Documentation](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
