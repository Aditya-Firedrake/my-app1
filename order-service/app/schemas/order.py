from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.order import OrderStatus, PaymentStatus, PaymentMethod


class CartItemBase(BaseModel):
    product_id: str = Field(..., description="Product ID from Product Service")
    quantity: int = Field(..., gt=0, description="Quantity of the product")


class CartItemCreate(CartItemBase):
    pass


class CartItemResponse(CartItemBase):
    id: UUID
    product_sku: str
    product_name: str
    product_image: Optional[str] = None
    unit_price: float
    total_price: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CartBase(BaseModel):
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None


class CartCreate(CartBase):
    pass


class CartResponse(CartBase):
    id: UUID
    items: List[CartItemResponse] = []
    total_items: int = 0
    subtotal: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderItemBase(BaseModel):
    product_id: str = Field(..., description="Product ID from Product Service")
    quantity: int = Field(..., gt=0, description="Quantity of the product")


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase):
    id: UUID
    product_sku: str
    product_name: str
    product_image: Optional[str] = None
    unit_price: float
    total_price: float
    created_at: datetime

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    user_id: UUID
    shipping_address: str = Field(..., min_length=10, description="Shipping address")
    billing_address: str = Field(..., min_length=10, description="Billing address")
    shipping_phone: str = Field(..., regex=r'^\+?1?\d{9,15}$', description="Shipping phone number")
    shipping_email: str = Field(..., description="Shipping email address")
    payment_method: PaymentMethod


class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = Field(..., min_items=1, description="Order items")
    
    @validator('items')
    def validate_items(cls, v):
        if not v:
            raise ValueError('Order must have at least one item')
        return v


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class OrderResponse(OrderBase):
    id: UUID
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    subtotal: float
    tax_amount: float
    shipping_amount: float
    discount_amount: float
    total_amount: float
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    id: UUID
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    total_amount: float
    item_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentRequest(BaseModel):
    order_id: UUID
    payment_method: PaymentMethod
    payment_details: dict = Field(..., description="Payment method specific details")


class PaymentResponse(BaseModel):
    success: bool
    transaction_id: Optional[str] = None
    message: str
    payment_status: PaymentStatus


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    notes: Optional[str] = None


class OrderFilter(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None


class OrderListResponse(BaseModel):
    orders: List[OrderSummary]
    total: int
    page: int
    size: int
    pages: int


class CartUpdateRequest(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class CartRemoveRequest(BaseModel):
    product_id: str


class CheckoutRequest(BaseModel):
    shipping_address: str = Field(..., min_length=10)
    billing_address: str = Field(..., min_length=10)
    shipping_phone: str = Field(..., regex=r'^\+?1?\d{9,15}$')
    shipping_email: str = Field(..., description="Shipping email address")
    payment_method: PaymentMethod
    apply_coupon: Optional[str] = None
    notes: Optional[str] = None 