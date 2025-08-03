# Indian Mobile Store - Frontend

A modern React-based frontend application for the Indian Mobile Store eCommerce platform. This application provides a user-friendly interface for browsing mobile phones, managing user accounts, and processing orders.

## Features

- **Modern UI/UX**: Built with React 18, Tailwind CSS, and Lucide React icons
- **Authentication**: JWT-based authentication with protected routes
- **Product Browsing**: Search, filter, and browse mobile phones with pagination
- **Shopping Cart**: Add, remove, and manage cart items
- **User Profile**: View and edit user information
- **Responsive Design**: Mobile-first responsive design
- **State Management**: Zustand for cart state, React Query for server state
- **Form Handling**: React Hook Form with validation
- **Notifications**: Toast notifications for user feedback

## Tech Stack

- **React 18**: Modern React with hooks and functional components
- **React Router DOM**: Client-side routing
- **React Query**: Server state management and caching
- **React Hook Form**: Form handling and validation
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Axios**: HTTP client for API calls
- **React Hot Toast**: Toast notifications
- **Zustand**: Lightweight state management

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend services running (see main README)

## Quick Start

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. The build files will be in the `build` directory.

### Docker

1. Build the Docker image:
   ```bash
   docker build -t ecommerce-frontend .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:80 ecommerce-frontend
   ```

## Project Structure

```
frontend/
├── public/                 # Static files
│   ├── index.html         # Main HTML file
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # Reusable components
│   │   ├── auth/         # Authentication components
│   │   └── layout/       # Layout components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── App.js            # Main app component
│   ├── index.js          # App entry point
│   └── index.css         # Global styles
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
├── Dockerfile            # Docker configuration
└── nginx.conf           # Nginx configuration
```

## Available Scripts

- `npm start`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

## Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001
```

## API Integration

The frontend communicates with the backend through the API Gateway. Key API endpoints:

- **Authentication**: `/auth/*`
- **Products**: `/products/*`
- **Cart**: `/orders/cart/*`
- **Orders**: `/orders/*`
- **User Profile**: `/auth/profile`

## Key Components

### Authentication
- `AuthContext`: Manages authentication state
- `ProtectedRoute`: Guards protected routes
- `Login/Register`: Authentication forms

### Shopping
- `ProductCard`: Displays product information
- `Cart`: Shopping cart management
- `Products`: Product listing with filters

### Layout
- `Navbar`: Navigation with user menu
- `Footer`: Site footer
- `App`: Main application wrapper

## Styling

The application uses Tailwind CSS with custom components:

- `.btn-primary`: Primary button style
- `.btn-secondary`: Secondary button style
- `.btn-outline`: Outline button style
- `.input-field`: Form input style
- `.card`: Card container style
- `.product-card`: Product card style

## State Management

- **Zustand**: Cart state management
- **React Query**: Server state and caching
- **React Context**: Authentication state
- **Local Storage**: JWT token persistence

## Performance Optimizations

- **Code Splitting**: React.lazy for route-based splitting
- **Image Optimization**: Responsive images with proper sizing
- **Caching**: React Query for API response caching
- **Bundle Optimization**: Tree shaking and minification

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Guidelines

### Code Style
- Use functional components with hooks
- Follow React best practices
- Use TypeScript for better type safety (optional)
- Write meaningful component and variable names

### Component Structure
```jsx
import React from 'react';
import PropTypes from 'prop-types';

const ComponentName = ({ prop1, prop2 }) => {
  // Component logic here
  
  return (
    <div>
      {/* JSX here */}
    </div>
  );
};

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default ComponentName;
```

### Error Handling
- Use React Error Boundaries
- Handle API errors gracefully
- Show user-friendly error messages
- Log errors for debugging

## Testing

Run tests with:
```bash
npm test
```

## Deployment

### Build for Production
```bash
npm run build
```

### Docker Deployment
```bash
docker build -t ecommerce-frontend .
docker run -p 80:80 ecommerce-frontend
```

### Environment Configuration
Set the `REACT_APP_API_URL` environment variable to point to your API Gateway.

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Check if backend services are running
   - Verify API Gateway URL in environment variables
   - Check network connectivity

2. **Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check for syntax errors in components
   - Verify all imports are correct

3. **Authentication Issues**
   - Clear browser storage
   - Check JWT token validity
   - Verify authentication endpoints

### Debug Mode
Enable debug mode by setting `REACT_APP_DEBUG=true` in your environment variables.

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Test on multiple browsers
5. Ensure responsive design works

## License

This project is part of the Indian Mobile Store eCommerce platform. 