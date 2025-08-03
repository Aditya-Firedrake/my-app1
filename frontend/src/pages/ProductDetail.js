import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { productAPI } from '../services/api';
import { useCart } from '../hooks/useCart';
import { Star, ShoppingCart } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();

  const { data: product, isLoading } = useQuery(
    ['product', id],
    () => productAPI.getProductById(id),
    { staleTime: 5 * 60 * 1000 }
  );

  const handleAddToCart = () => {
    addToCart(id, 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!product?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
          <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const productData = product.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div>
              <img
                src={productData.images?.[0] || '/placeholder-phone.jpg'}
                alt={productData.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {productData.name}
              </h1>

              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(productData.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">
                  ({productData.reviewCount || 0} reviews)
                </span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mb-6">
                ₹{productData.price?.toLocaleString()}
              </div>

              <div className="mb-6">
                <p className="text-gray-600">{productData.description}</p>
              </div>

              <div className="mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  productData.stock > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {productData.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={productData.stock === 0}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 