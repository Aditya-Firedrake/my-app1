from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.order_service import order_service
from app.schemas.order import (
    OrderCreate, OrderResponse, OrderUpdate, OrderListResponse,
    CartItemCreate, CartResponse, CheckoutRequest, PaymentRequest,
    PaymentResponse, OrderStatusUpdate, OrderFilter, CartUpdateRequest
)
from app.core.auth import get_current_user_id
from app.core.exceptions import (
    OrderNotFoundError, CartNotFoundError, ProductNotFoundError,
    InsufficientStockError, PaymentFailedError
)

router = APIRouter()


@router.post("/cart/add", response_model=CartResponse)
async def add_to_cart(
    cart_item: CartItemCreate,
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Depends(get_current_user_id),
    session_id: Optional[str] = Header(None)
):
    """Add item to cart"""
    try:
        cart = await order_service.add_to_cart(db, cart_item, user_id, session_id)
        return cart
    except ProductNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add item to cart: {str(e)}")


@router.get("/cart", response_model=CartResponse)
async def get_cart(
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Depends(get_current_user_id),
    session_id: Optional[str] = Header(None)
):
    """Get user's cart"""
    try:
        cart = await order_service.get_cart(db, user_id, session_id)
        return cart
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cart: {str(e)}")


@router.patch("/cart/update", response_model=CartResponse)
async def update_cart_item(
    update_request: CartUpdateRequest,
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Depends(get_current_user_id),
    session_id: Optional[str] = Header(None)
):
    """Update cart item quantity"""
    try:
        cart = await order_service.update_cart_item(
            db, update_request.product_id, update_request.quantity, user_id, session_id
        )
        return cart
    except CartNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update cart: {str(e)}")


@router.delete("/cart/remove/{product_id}", response_model=CartResponse)
async def remove_from_cart(
    product_id: str,
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Depends(get_current_user_id),
    session_id: Optional[str] = Header(None)
):
    """Remove item from cart"""
    try:
        cart = await order_service.remove_from_cart(db, product_id, user_id, session_id)
        return cart
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove item from cart: {str(e)}")


@router.delete("/cart/clear", response_model=CartResponse)
async def clear_cart(
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Depends(get_current_user_id),
    session_id: Optional[str] = Header(None)
):
    """Clear all items from cart"""
    try:
        cart = await order_service.clear_cart(db, user_id, session_id)
        return cart
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cart: {str(e)}")


@router.post("/checkout", response_model=OrderResponse)
async def checkout_from_cart(
    checkout_data: CheckoutRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    authorization: str = Header(...)
):
    """Checkout from cart"""
    try:
        token = authorization.replace("Bearer ", "")
        order = await order_service.checkout_from_cart(db, checkout_data, user_id, token)
        return order
    except CartNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientStockError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(...)
):
    """Create a new order"""
    try:
        token = authorization.replace("Bearer ", "")
        order = await order_service.create_order(db, order_data, token)
        return order
    except InsufficientStockError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ProductNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Depends(get_current_user_id)
):
    """Get order by ID"""
    try:
        order = await order_service.get_order(db, order_id, user_id)
        return order
    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get order: {str(e)}")


@router.get("/orders", response_model=OrderListResponse)
async def get_user_orders(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get user's orders with filtering and pagination"""
    try:
        filters = OrderFilter(
            status=status,
            payment_status=payment_status,
            start_date=start_date,
            end_date=end_date,
            min_amount=min_amount,
            max_amount=max_amount
        )
        
        result = await order_service.get_user_orders(db, user_id, skip, limit, filters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get orders: {str(e)}")


@router.patch("/orders/{order_id}", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update order status (admin only)"""
    try:
        order_update = OrderUpdate(
            status=status_update.status,
            tracking_number=status_update.tracking_number,
            estimated_delivery=status_update.estimated_delivery
        )
        order = await order_service.update_order_status(db, order_id, order_update)
        return order
    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")


@router.post("/orders/{order_id}/payment", response_model=PaymentResponse)
async def process_payment(
    order_id: UUID,
    payment_request: PaymentRequest,
    db: Session = Depends(get_db)
):
    """Process payment for an order"""
    try:
        payment_request.order_id = order_id
        result = await order_service.process_payment(db, payment_request)
        return result
    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PaymentFailedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")


@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Cancel an order"""
    try:
        order = await order_service.cancel_order(db, order_id, user_id)
        return order
    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")


@router.get("/orders/statistics")
async def get_order_statistics(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get order statistics for the user"""
    try:
        stats = await order_service.get_order_statistics(db, user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Order Service",
        "timestamp": "2024-01-01T00:00:00Z"
    } 