import React from 'react';
import { useParams, Link } from 'react-router-dom';

const OrderDetail = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600 mt-2">Order #{id}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Order detail functionality coming soon
            </h2>
            <p className="text-gray-600 mb-6">
              This page will display detailed information about your order and its status.
            </p>
            <Link to="/orders" className="btn-outline mr-4">
              Back to Orders
            </Link>
            <Link to="/products" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail; 