# Raees Oil Change POS

A modern, feature-rich Point of Sale (POS) system built with React, TypeScript, and Supabase. Designed for retail businesses of all sizes with comprehensive inventory management, sales tracking, customer management, and analytics.

## 🚀 Features

### Core POS Functionality
- **Multi-tab Sales Interface** - Handle multiple customers simultaneously with independent sales tabs
- **Product Grid** - Touch-friendly interface with product search, filtering, and categories
- **Shopping Cart** - Real-time cart management with discount application
- **Multiple Payment Methods** - Cash, card, and customer credit support
- **Receipt Generation** - Automatic receipt printing and email delivery
- **Draft Sales** - Save incomplete transactions for later completion

### Inventory Management
- **Product Management** - Add, edit, and organize products with SKU, barcode, and categories
- **Stock Tracking** - Real-time inventory tracking with low-stock alerts
- **Weight-based Products** - Support for products sold by weight (kg, lb, etc.)
- **Batch Management** - Track manufacturing dates, expiry dates, and supplier information
- **Non-stock Items** - Option to disable inventory tracking for service items
- **Inventory Reports** - Track stock levels, value, and movement

### Customer Management
- **Customer Database** - Store customer information and purchase history
- **Credit System** - Customer credit accounts with spending limits
- **Purchase History** - Track customer transactions and preferences
- **Customer Analytics** - Insights into customer behavior and spending patterns

### Advanced Features
- **Discount System** - Flexible discount rules with conditions and automatic application
- **User Management** - Multi-user support with role-based permissions
- **Sales Analytics** - Comprehensive reporting with charts and insights
- **Data Export** - Export sales data to CSV for external analysis
- **Touch Interface** - Optimized for both desktop and touch devices
- **Responsive Design** - Works seamlessly on tablets, phones, and desktops

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite
- **Package Manager**: npm

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/iamchandira/nextera-pos-system
   cd pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Database Setup**
   
   **Option A: Complete Database Initialization (Recommended)**
   
   Run the complete database setup script in your Supabase SQL editor:
   ```sql
   -- Execute the complete initialization script
   -- Copy and paste the entire content from supabase_complete_init.sql
   ```
   
   This script will:
   - Create all required tables with proper structure
   - Set up indexes for optimal performance
   - Configure Row Level Security (RLS) policies
   - Insert default data (categories, settings, sample discounts)
   - Create necessary functions and triggers
   
   **Option B: Manual Database Setup**
   
   If you prefer manual setup, run these essential commands in your Supabase SQL editor:
   ```sql
   -- Enable required extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   
   -- Create core tables (see supabase_complete_init.sql for full schema)
   -- Then add required columns and indexes:
   ALTER TABLE products 
   ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;
   
   -- Create performance indexes
   CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
   CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
   CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(created_at);
   CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
   ```

5. **Initial Application Setup**
   
   After database setup, configure the application:
   ```bash
   # Start the development server
   npm run dev
   ```
   
   Navigate to the application and:
   1. **Create Admin User**: Register the first user
   2. **Configure Store Settings**: Go to Settings → Store Information
   3. **Add Initial Products**: Go to Inventory → Add Product
   4. **Create User Accounts**: Go to User Management to add cashiers/managers

6. **Build for Production**
   ```bash
   npm run build
   ```

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── customers/       # Customer management
│   ├── discounts/       # Discount management
│   ├── inventory/       # Product and inventory management
│   ├── layout/          # Layout components (Header, etc.)
│   ├── pos/            # Core POS interface
│   ├── reports/        # Analytics and reporting
│   ├── settings/       # Application settings
│   └── transactions/   # Transaction history
├── context/            # React Context providers
├── lib/               # Utilities and services
├── types/             # TypeScript type definitions
├── main.tsx          # Application entry point
└── supabase_complete_init.sql  # Complete database initialization script
```

## 🗄️ Database Files

- **`supabase_complete_init.sql`** - Complete database setup script that creates all tables, indexes, functions, triggers, and default data. Run this in your Supabase SQL editor for complete setup.

## 🔧 Configuration

### Database Schema
The application requires several tables in Supabase:
- `products` - Product catalog with inventory
- `customers` - Customer information
- `sales` - Transaction records
- `discounts` - Discount rules and promotions
- `users` - User accounts and permissions
- `app_settings` - Application configuration
- `sales_tabs` - Multi-tab sales sessions
- `product_batches` - Batch tracking information

### Environment Variables
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## 📱 Usage

### Getting Started
1. **Initial Setup**: Configure store information in Settings
2. **Add Products**: Use Inventory Management to add your product catalog
3. **Create Users**: Set up user accounts for cashiers and managers
4. **Start Selling**: Use the POS terminal to process sales

### Key Workflows

**Making a Sale:**
1. Select products from the product grid
2. Adjust quantities in the shopping cart
3. Apply discounts if applicable
4. Select customer (optional)
5. Choose payment method
6. Complete transaction

**Managing Inventory:**
1. Navigate to Inventory Management
2. Add new products with details
3. Set stock levels and minimum thresholds
4. Configure weight-based or standard products
5. Enable/disable inventory tracking as needed

**Viewing Reports:**
1. Go to Reports & Analytics
2. Select date range
3. View sales trends, top products, and performance metrics
4. Export data for further analysis

## 🎨 Customization

### Interface Modes
- **Desktop Mode**: Optimized for mouse and keyboard
- **Touch Mode**: Larger buttons and touch-friendly interface

### Currency and Localization
- Pakistani Rupees (PKR), formatted as Rs. 1,250.00
- Sale totals use subtotal minus discount
- Invoice number formatting


## 🔒 Security

- **Authentication**: Handled by Supabase Auth
- **Authorization**: Role-based access control
- **Data Protection**: All data encrypted in transit and at rest
- **Environment Variables**: Sensitive data stored securely

## 🧪 Testing

### Running Tests
```bash
npm run test
```

### Test Coverage
- Unit tests for utilities and services
- Component testing with React Testing Library
- Integration tests for key workflows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write tests for new features

## 📋 Requirements

### System Requirements
- **Browser**: Modern browser with ES6+ support
- **Screen Resolution**: Minimum 1024x768 (responsive design)
- **Internet**: Required for Supabase connectivity

### Hardware Recommendations
- **Touch Screen**: For optimal touch interface experience
- **Receipt Printer**: Thermal printer compatible with web printing
- **Barcode Scanner**: USB HID scanner for product lookup

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify Supabase URL and API key in environment variables
- Check Supabase project status
- Ensure database tables are created

**Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Update Node.js to latest LTS version
- Check for TypeScript errors: `npm run type-check`

**Performance Issues:**
- Enable caching in production
- Optimize images and assets
- Check database query performance

### Support
For technical support or questions:
1. Check the GitHub Issues page
2. Review documentation
3. Contact developer

## 📄 License

**License Terms:**

This software is provided free of charge for personal, non-commercial use.

Commercial use, including but not limited to use in proprietary software, services for a fee, or redistribution for profit, is not permitted without prior written consent from the author.

To inquire about commercial licensing, please contact: **info@iamchandira.com**

### Permitted Uses:
- Personal learning and development
- Educational purposes
- Non-profit organizations
- Open source projects (with attribution)

### Restricted Uses:
- Commercial deployment without license
- Resale or redistribution for profit
- Integration into paid software or services
- Use in proprietary business applications

For questions about licensing terms or to request commercial usage rights, please reach out to **info@iamchandira.com**.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts by [Recharts](https://recharts.org/)
- Icons from [Lucide](https://lucide.dev/)

---

**Version**: 1.0.0  
**Last Updated**: August 2025  
**Developed by**: Chandira Ekanayaka  
**Contact**: info@iamchandira.com
