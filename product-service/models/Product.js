const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    enum: ['Apple', 'Samsung', 'Xiaomi', 'OnePlus', 'OPPO', 'Vivo', 'Realme', 'Nothing', 'Google', 'Motorola', 'Nokia', 'ASUS', 'Huawei', 'Honor', 'iQOO', 'POCO', 'Infinix', 'Tecno', 'Lava', 'Micromax']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Smartphone', 'Feature Phone', 'Gaming Phone', 'Camera Phone', 'Budget Phone', 'Premium Phone', 'Foldable Phone']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  specifications: {
    display: {
      size: {
        type: String,
        required: true
      },
      resolution: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['AMOLED', 'OLED', 'LCD', 'IPS LCD', 'Super AMOLED', 'Dynamic AMOLED', 'LTPO AMOLED'],
        required: true
      },
      refreshRate: {
        type: String,
        default: '60Hz'
      },
      protection: {
        type: String,
        default: 'Gorilla Glass'
      }
    },
    processor: {
      name: {
        type: String,
        required: true
      },
      cores: {
        type: Number,
        required: true
      },
      speed: {
        type: String,
        required: true
      }
    },
    memory: {
      ram: {
        type: [String],
        required: true
      },
      storage: {
        type: [String],
        required: true
      },
      expandable: {
        type: Boolean,
        default: false
      }
    },
    camera: {
      rear: {
        main: {
          type: String,
          required: true
        },
        ultraWide: String,
        telephoto: String,
        macro: String,
        depth: String
      },
      front: {
        type: String,
        required: true
      },
      features: [String]
    },
    battery: {
      capacity: {
        type: String,
        required: true
      },
      charging: {
        type: String,
        default: 'Fast Charging'
      },
      wireless: {
        type: Boolean,
        default: false
      }
    },
    connectivity: {
      network: {
        type: [String],
        default: ['4G', '5G']
      },
      wifi: {
        type: String,
        default: 'Wi-Fi 6'
      },
      bluetooth: {
        type: String,
        default: '5.0'
      },
      gps: {
        type: Boolean,
        default: true
      }
    },
    os: {
      type: String,
      required: true
    },
    colors: {
      type: [String],
      required: true
    }
  },
  images: {
    type: [String],
    required: [true, 'At least one image is required'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one image is required'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  launchDate: {
    type: Date,
    default: Date.now
  },
  warranty: {
    type: String,
    default: '1 Year'
  },
  returnPolicy: {
    type: String,
    default: '7 Days'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0) {
    return this.price - (this.price * this.discount / 100);
  }
  return this.price;
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', brand: 'text', model: 'text' });
productSchema.index({ brand: 1, category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'specifications.display.size': 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ sku: 1 }, { unique: true });

// Pre-save middleware to update average rating
productSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = totalRating / this.reviews.length;
    this.ratings.count = this.reviews.length;
  }
  next();
});

// Static method to get products by brand
productSchema.statics.findByBrand = function(brand) {
  return this.find({ brand: brand, isActive: true });
};

// Static method to get products by price range
productSchema.statics.findByPriceRange = function(minPrice, maxPrice) {
  return this.find({
    price: { $gte: minPrice, $lte: maxPrice },
    isActive: true
  });
};

// Instance method to check if product is in stock
productSchema.methods.isInStock = function() {
  return this.stock > 0;
};

// Instance method to update stock
productSchema.methods.updateStock = function(quantity) {
  this.stock = Math.max(0, this.stock + quantity);
  return this.save();
};

module.exports = mongoose.model('Product', productSchema); 