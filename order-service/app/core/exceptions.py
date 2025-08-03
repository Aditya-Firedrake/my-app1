class OrderServiceException(Exception):
    """Base exception for Order Service"""
    pass


class OrderNotFoundError(OrderServiceException):
    """Raised when order is not found"""
    pass


class CartNotFoundError(OrderServiceException):
    """Raised when cart is not found"""
    pass


class ProductNotFoundError(OrderServiceException):
    """Raised when product is not found"""
    pass


class InsufficientStockError(OrderServiceException):
    """Raised when product stock is insufficient"""
    pass


class PaymentFailedError(OrderServiceException):
    """Raised when payment processing fails"""
    pass


class InvalidOrderDataError(OrderServiceException):
    """Raised when order data is invalid"""
    pass


class UserValidationError(OrderServiceException):
    """Raised when user validation fails"""
    pass 